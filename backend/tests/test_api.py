import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, engine, get_db
from app.models.entities import GenerationBatch, Question, QuestionOption, QuestionSource, UserAnswer, ApplicationSetting
from app.services.duplicates import normalize_text, fingerprint, fuzzy_score

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "service" in data["data"]
    assert "ai" in data["data"]

def test_duplicate_utilities():
    assert normalize_text("  Who WON The 2022 World Cup?! ") == "who won the 2022 world cup"
    fp1 = fingerprint("Who won the 2022 World Cup?")
    fp2 = fingerprint("who won the 2022 world cup")
    assert fp1 == fp2
    assert fuzzy_score("Lionel Messi won the World Cup", "Lionel Messi won the world cup") == 1.0
    assert fuzzy_score("Cricket World Cup 2023", "FIFA Football World Cup 2022") < 0.8

def test_mcq_and_poll_flow():
    # Insert batch and questions directly to test full API behavior
    from app.db.session import SessionLocal
    db = SessionLocal()
    batch = GenerationBatch(sport="Football", difficulty="Medium", time_scope="Historical", requested_types="mcq,poll", model_used="test-model", retrieval_method="chroma")
    db.add(batch)
    db.flush()

    q_mcq = Question(
        batch_id=batch.id, sport="Football", difficulty="Medium", era="Historical",
        content_type="mcq", time_scope="Historical", prompt_text="Which country won the 2022 FIFA World Cup?",
        correct_answer="B", explanation="Argentina defeated France on penalties.",
        opinion_based=False, confidence_score=0.95, quality_score=0.9,
        fact_check_status="verified", fingerprint="fp_mcq_1"
    )
    db.add(q_mcq)
    db.flush()
    db.add(QuestionOption(question_id=q_mcq.id, label="A", text="France", is_correct=False))
    db.add(QuestionOption(question_id=q_mcq.id, label="B", text="Argentina", is_correct=True))
    db.add(QuestionOption(question_id=q_mcq.id, label="C", text="Brazil", is_correct=False))
    db.add(QuestionOption(question_id=q_mcq.id, label="D", text="Croatia", is_correct=False))
    db.add(QuestionSource(question_id=q_mcq.id, title="FIFA", url="https://fifa.com", statement="Argentina won in 2022", retrieved_date="2026-08-26", access_date="2026-08-26"))

    q_poll = Question(
        batch_id=batch.id, sport="Football", difficulty="Medium", era="Opinion",
        content_type="poll", time_scope="Historical", prompt_text="Who is the greatest of all time?",
        correct_answer=None, explanation=None,
        opinion_based=True, confidence_score=0.0, quality_score=0.8,
        fact_check_status="opinion", fingerprint="fp_poll_1"
    )
    db.add(q_poll)
    db.flush()
    db.add(QuestionOption(question_id=q_poll.id, label="A", text="Messi", is_correct=False))
    db.add(QuestionOption(question_id=q_poll.id, label="B", text="Ronaldo", is_correct=False))

    q_num = Question(
        batch_id=batch.id, sport="Cricket", difficulty="Hard", era="Historical",
        content_type="guess_number", time_scope="Historical", prompt_text="How many international centuries did Sachin Tendulkar score?",
        correct_answer="100", explanation="100 international centuries.",
        opinion_based=False, confidence_score=0.99, quality_score=0.95,
        fact_check_status="verified", fingerprint="fp_num_1"
    )
    db.add(q_num)
    db.flush()

    db.commit()
    mcq_id = q_mcq.id
    poll_id = q_poll.id
    num_id = q_num.id
    batch_id = batch.id
    db.close()

    # Test Fetch Batch
    r_batch = client.get(f"/api/batches/{batch_id}")
    assert r_batch.status_code == 200
    assert len(r_batch.json()["data"]["questions"]) == 3

    # Test Answer MCQ Correct
    r_ans = client.post(f"/api/questions/{mcq_id}/answer", json={"answer": "B"})
    assert r_ans.status_code == 200
    assert r_ans.json()["data"]["is_correct"] is True

    # Test Answer MCQ Wrong
    r_ans_wrong = client.post(f"/api/questions/{mcq_id}/answer", json={"answer": "A"})
    assert r_ans_wrong.status_code == 200
    assert r_ans_wrong.json()["data"]["is_correct"] is False

    # Test Answer Poll (Opinion percentages)
    r_poll1 = client.post(f"/api/questions/{poll_id}/answer", json={"answer": "A"})
    assert r_poll1.status_code == 200
    assert r_poll1.json()["data"]["opinion_based"] is True
    assert "percentages" in r_poll1.json()["data"]

    # Test Answer Guess Number
    r_num_close = client.post(f"/api/questions/{num_id}/answer", json={"answer": "101"})
    assert r_num_close.status_code == 200
    assert r_num_close.json()["data"]["is_correct"] is True

    r_num_far = client.post(f"/api/questions/{num_id}/answer", json={"answer": "80"})
    assert r_num_far.status_code == 200
    assert r_num_far.json()["data"]["is_correct"] is False

    # Test Toggle Save
    r_save = client.post(f"/api/questions/{mcq_id}/save")
    assert r_save.status_code == 200
    assert r_save.json()["data"]["saved"] is True

    # Test History and Filtering
    r_hist = client.get("/api/history?sport=Football&saved_only=true")
    assert r_hist.status_code == 200
    assert any(q["id"] == mcq_id for q in r_hist.json()["data"])

    # Test Sources
    r_src = client.get(f"/api/questions/{mcq_id}/sources")
    assert r_src.status_code == 200
    assert len(r_src.json()["data"]) >= 1

    # Test Analytics
    r_ana = client.get("/api/analytics")
    assert r_ana.status_code == 200
    ana_data = r_ana.json()["data"]
    assert ana_data["questions_answered"] >= 1
    assert "accuracy" in ana_data
    assert "current_streak" in ana_data
    assert "sport_breakdown" in ana_data

    # Test Export JSON and CSV
    r_exp_json = client.get(f"/api/export?format=json&ids={mcq_id}")
    assert r_exp_json.status_code == 200
    assert "application/json" in r_exp_json.headers["content-type"]

    r_exp_csv = client.get(f"/api/export?format=csv&ids={mcq_id}")
    assert r_exp_csv.status_code == 200
    assert "text/csv" in r_exp_csv.headers["content-type"]

    # Test Settings
    r_set_put = client.put("/api/settings/default_sport", json={"value": "Cricket"})
    assert r_set_put.status_code == 200
    r_set_get = client.get("/api/settings")
    assert r_set_get.status_code == 200
    assert r_set_get.json()["data"].get("default_sport") == "Cricket"

    # Test Secret setting rejection
    r_sec = client.put("/api/settings/api_key", json={"value": "secret"})
    assert r_sec.status_code == 400

    # Test Knowledge Ingestion SSRF Protection
    r_ssrf = client.post("/api/knowledge/ingest", json=[{"fact_text": "Bad", "source_url": "http://127.0.0.1/admin"}])
    assert r_ssrf.status_code == 400

    # Test Valid Knowledge Ingest and Search
    r_ingest = client.post("/api/knowledge/ingest", json=[{
        "fact_text": "Roger Federer won 20 Grand Slam singles titles in Tennis.",
        "source_url": "https://example.com/federer",
        "sport": "Tennis"
    }])
    assert r_ingest.status_code == 200
    assert r_ingest.json()["data"]["ingested"] == 1

    r_search = client.get("/api/knowledge/search?q=Federer")
    assert r_search.status_code == 200
    assert isinstance(r_search.json()["data"], list)

    # Test Delete Question
    r_del_q = client.delete(f"/api/questions/{mcq_id}")
    assert r_del_q.status_code == 200

    # Test Clear History
    r_clear = client.delete("/api/history")
    assert r_clear.status_code == 200
    r_empty_hist = client.get("/api/history")
    assert len(r_empty_hist.json()["data"]) == 0
