import csv
import io
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, selectinload
from app.db.session import get_db
from app.models.entities import (
    ApplicationSetting, DuplicateFingerprint, GenerationAttempt,
    GenerationBatch, Question, QuestionOption, QuestionSource,
    SavedQuestion, UserAnswer
)
from app.schemas.questions import AnswerRequest, GenerateRequest, SettingUpdate
from app.services.generator import GenerationService
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.chroma_store import ChromaStore

router = APIRouter(prefix="/api")

def envelope(data=None, message="ok"):
    return {"ok": True, "message": message, "data": data}

def serialize_question(q: Question, creator_mode: bool = False):
    answer = q.correct_answer if creator_mode or q.opinion_based else None
    return {
        "id": q.id, "batch_id": q.batch_id, "sport": q.sport, "difficulty": q.difficulty, "era": q.era, "type": q.content_type, "prompt": q.prompt_text, "correct_answer": answer, "explanation": q.explanation if creator_mode else None, "opinion_based": q.opinion_based, "confidence_score": q.confidence_score, "quality_score": q.quality_score, "fact_check_status": q.fact_check_status, "semantic_duplicate_score": q.semantic_duplicate_score, "saved": q.saved, "created_at": q.created_at.isoformat(),
        "options": [{"label": o.label, "text": o.text} for o in q.options],
        "sources": [{"title": s.title, "url": s.url, "statement": s.statement, "publication_date": s.publication_date, "retrieved_date": s.retrieved_date, "access_date": s.access_date} for s in q.sources]
    }

@router.get("/health")
async def health():
    status = await OpenRouterClient().status()
    return envelope({"service": "SportSpark AI", "ai": status})

@router.post("/generate")
async def generate(request: GenerateRequest, db: Session = Depends(get_db)):
    try:
        batch_id = await GenerationService(db).generate(request)
        return await fetch_batch(batch_id, False, db)
    except OpenRouterError as exc:
        raise HTTPException(status_code=422, detail={"code": "generation_failed", "message": str(exc)})

@router.get("/batches/{batch_id}")
async def fetch_batch(batch_id: int, creator_mode: bool = False, db: Session = Depends(get_db)):
    batch = db.scalar(select(GenerationBatch).options(selectinload(GenerationBatch.questions).selectinload(Question.options), selectinload(GenerationBatch.questions).selectinload(Question.sources)).where(GenerationBatch.id == batch_id))
    if not batch:
        raise HTTPException(status_code=404, detail={"code": "batch_not_found", "message": "Batch not found"})
    return envelope({"id": batch.id, "sport": batch.sport, "difficulty": batch.difficulty, "time_scope": batch.time_scope, "model_used": batch.model_used, "retrieval_method": batch.retrieval_method, "created_at": batch.created_at.isoformat(), "questions": [serialize_question(q, creator_mode) for q in batch.questions]})

@router.post("/questions/{question_id}/answer")
async def answer(question_id: int, payload: AnswerRequest, db: Session = Depends(get_db)):
    q = db.scalar(select(Question).options(selectinload(Question.options), selectinload(Question.sources)).where(Question.id == question_id))
    if not q:
        raise HTTPException(status_code=404, detail={"code": "question_not_found", "message": "Question not found"})
    if q.opinion_based:
        db.add(UserAnswer(question_id=q.id, selected_answer=payload.answer, is_correct=None))
        db.commit()
        all_answers = db.scalars(select(UserAnswer).where(UserAnswer.question_id == q.id)).all()
        counts = {}
        for a in all_answers:
            counts[a.selected_answer] = counts.get(a.selected_answer, 0) + 1
        total = max(1, len(all_answers))
        return envelope({"opinion_based": True, "percentages": {k: round(v * 100 / total) for k, v in counts.items()}})
    if q.content_type == "guess_number":
        try:
            guess = float(payload.answer)
            target = float(q.correct_answer or 0)
            tolerance = max(1.0, abs(target) * 0.05)
            is_correct = abs(guess - target) <= tolerance
        except Exception:
            is_correct = False
    elif q.content_type == "true_false":
        is_correct = payload.answer.strip().lower() == (q.correct_answer or "").strip().lower()
    else:
        is_correct = payload.answer == q.correct_answer
    db.add(UserAnswer(question_id=q.id, selected_answer=payload.answer, is_correct=is_correct))
    db.commit()
    return envelope({"is_correct": is_correct, "correct_answer": q.correct_answer, "explanation": q.explanation, "sources": [{"title": s.title, "url": s.url, "statement": s.statement} for s in q.sources]})

@router.post("/questions/{question_id}/regenerate")
async def regenerate_question(question_id: int, db: Session = Depends(get_db)):
    original = db.scalar(select(Question).where(Question.id == question_id))
    if not original:
        raise HTTPException(status_code=404, detail={"code": "question_not_found", "message": "Question not found"})
    request = GenerateRequest(sport=original.sport, difficulty=original.difficulty, content_types=[original.content_type], time_scope=original.time_scope, batch_size=1)
    try:
        batch_id = await GenerationService(db).generate(request)
    except OpenRouterError as exc:
        raise HTTPException(status_code=422, detail={"code": "regeneration_failed", "message": str(exc)})
    replacement = db.scalar(select(Question).options(selectinload(Question.options), selectinload(Question.sources)).where(Question.batch_id == batch_id))
    if not replacement:
        raise HTTPException(status_code=422, detail={"code": "regeneration_failed", "message": "No replacement question was created"})
    replacement.parent_question_id = original.id
    db.commit()
    db.refresh(replacement)
    return envelope(serialize_question(replacement, True))

@router.post("/batches/{batch_id}/regenerate")
async def regenerate_batch(batch_id: int, db: Session = Depends(get_db)):
    original = db.get(GenerationBatch, batch_id)
    if not original:
        raise HTTPException(status_code=404, detail={"code": "batch_not_found", "message": "Batch not found"})
    request = GenerateRequest(sport=original.sport, difficulty=original.difficulty, content_types=[x for x in original.requested_types.split(",") if x], time_scope=original.time_scope, batch_size=max(4, min(5, len(original.questions) or 4)))
    try:
        new_batch_id = await GenerationService(db).generate(request)
        return await fetch_batch(new_batch_id, True, db)
    except OpenRouterError as exc:
        raise HTTPException(status_code=422, detail={"code": "regeneration_failed", "message": str(exc)})

@router.post("/questions/{question_id}/save")
async def toggle_save(question_id: int, db: Session = Depends(get_db)):
    q = db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail={"code": "question_not_found", "message": "Question not found"})
    q.saved = not q.saved
    if q.saved:
        if not db.scalar(select(SavedQuestion).where(SavedQuestion.question_id == q.id)):
            db.add(SavedQuestion(question_id=q.id))
    else:
        db.execute(delete(SavedQuestion).where(SavedQuestion.question_id == q.id))
    db.commit()
    return envelope({"saved": q.saved})

@router.delete("/questions/{question_id}")
async def delete_question(question_id: int, db: Session = Depends(get_db)):
    q = db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail={"code": "question_not_found", "message": "Question not found"})
    db.execute(delete(UserAnswer).where(UserAnswer.question_id == q.id))
    db.execute(delete(SavedQuestion).where(SavedQuestion.question_id == q.id))
    db.execute(delete(QuestionSource).where(QuestionSource.question_id == q.id))
    db.execute(delete(QuestionOption).where(QuestionOption.question_id == q.id))
    db.execute(delete(DuplicateFingerprint).where(DuplicateFingerprint.question_id == q.id))
    db.delete(q)
    db.commit()
    return envelope(message="deleted")

@router.delete("/history")
async def clear_history(db: Session = Depends(get_db)):
    db.execute(delete(UserAnswer))
    db.execute(delete(SavedQuestion))
    db.execute(delete(QuestionSource))
    db.execute(delete(QuestionOption))
    db.execute(delete(DuplicateFingerprint))
    db.execute(delete(Question))
    db.execute(delete(GenerationAttempt))
    db.execute(delete(GenerationBatch))
    db.commit()
    return envelope(message="history cleared")

@router.get("/history")
async def history(search: str = "", sport: str = "", difficulty: str = "", content_type: str = "", time_scope: str = "", saved_only: bool = False, sort: str = "newest", limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    stmt = select(Question).options(selectinload(Question.options), selectinload(Question.sources))
    if search:
        stmt = stmt.where(Question.prompt_text.ilike(f"%{search}%"))
    if sport:
        stmt = stmt.where(Question.sport == sport)
    if difficulty:
        stmt = stmt.where(Question.difficulty == difficulty)
    if content_type:
        stmt = stmt.where(Question.content_type == content_type)
    if time_scope:
        stmt = stmt.where(Question.time_scope == time_scope)
    if saved_only:
        stmt = stmt.where(Question.saved.is_(True))
    order = Question.created_at.asc() if sort == "oldest" else Question.created_at.desc()
    if sort == "difficulty":
        order = Question.difficulty.asc()
    if sort == "confidence":
        order = Question.confidence_score.desc()
    rows = db.scalars(stmt.order_by(order).limit(limit)).all()
    return envelope([serialize_question(q, True) for q in rows])

@router.get("/analytics")
async def analytics(db: Session = Depends(get_db)):
    answers = db.scalars(select(UserAnswer).order_by(UserAnswer.created_at.desc())).all()
    answered = len(answers)
    graded_answers = [x for x in answers if x.is_correct is not None]
    correct = sum(1 for x in graded_answers if x.is_correct is True)
    accuracy = round(correct * 100 / len(graded_answers), 1) if graded_answers else 0

    current_streak = 0
    for a in answers:
        if a.is_correct is True:
            current_streak += 1
        elif a.is_correct is False:
            break

    results = db.execute(
        select(Question.sport, Question.difficulty, UserAnswer.is_correct)
        .join(UserAnswer, UserAnswer.question_id == Question.id)
    ).all()

    sport_stats: dict[str, dict[str, int]] = {}
    difficulty_stats: dict[str, dict[str, int]] = {}
    for sport, diff, is_corr in results:
        if is_corr is not None:
            if sport not in sport_stats:
                sport_stats[sport] = {"total": 0, "correct": 0}
            sport_stats[sport]["total"] += 1
            if is_corr:
                sport_stats[sport]["correct"] += 1

            if diff:
                if diff not in difficulty_stats:
                    difficulty_stats[diff] = {"total": 0, "correct": 0}
                difficulty_stats[diff]["total"] += 1
                if is_corr:
                    difficulty_stats[diff]["correct"] += 1

    sorted_sports = sorted(
        sport_stats.items(),
        key=lambda item: (item[1]["correct"] / item[1]["total"] if item[1]["total"] > 0 else 0, item[1]["total"]),
        reverse=True
    )

    best_sport = sorted_sports[0][0] if sorted_sports else None
    weakest_sport = sorted_sports[-1][0] if len(sorted_sports) > 1 or (sorted_sports and sorted_sports[0][1]["total"] > sorted_sports[0][1]["correct"]) else None

    sport_breakdown = [
        {"sport": s, "total": data["total"], "correct": data["correct"], "accuracy": round(data["correct"] * 100 / data["total"], 1)}
        for s, data in sport_stats.items()
    ]
    difficulty_breakdown = {
        d: round(data["correct"] * 100 / data["total"], 1)
        for d, data in difficulty_stats.items()
        if data["total"] > 0
    }

    return envelope({
        "questions_answered": answered,
        "accuracy": accuracy,
        "current_streak": current_streak,
        "best_sport": best_sport,
        "weakest_sport": weakest_sport,
        "sport_breakdown": sport_breakdown,
        "difficulty_breakdown": difficulty_breakdown
    })

@router.get("/questions/{question_id}/sources")
async def sources(question_id: int, db: Session = Depends(get_db)):
    q = db.scalar(select(Question).options(selectinload(Question.sources)).where(Question.id == question_id))
    if not q:
        raise HTTPException(status_code=404, detail={"code": "question_not_found", "message": "Question not found"})
    return envelope([{ "title": s.title, "url": s.url, "statement": s.statement, "publication_date": s.publication_date, "retrieved_date": s.retrieved_date, "access_date": s.access_date} for s in q.sources])

@router.get("/export")
async def export_questions(format: str = "json", ids: str = "", db: Session = Depends(get_db)):
    parsed = [int(x) for x in ids.split(",") if x.strip().isdigit()]
    stmt = select(Question).options(selectinload(Question.options), selectinload(Question.sources))
    if parsed:
        stmt = stmt.where(Question.id.in_(parsed))
    rows = db.scalars(stmt).all()
    data = [serialize_question(q, True) for q in rows]
    if format == "csv":
        stream = io.StringIO()
        writer = csv.DictWriter(stream, fieldnames=["id", "sport", "difficulty", "era", "type", "prompt", "correct_answer", "explanation", "saved"])
        writer.writeheader()
        for item in data:
            writer.writerow({k: item[k] for k in writer.fieldnames})
        return Response(stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=sportspark_questions.csv"})
    return Response(json.dumps(data, indent=2), media_type="application/json", headers={"Content-Disposition": "attachment; filename=sportspark_questions.json"})

@router.get("/settings")
async def settings(db: Session = Depends(get_db)):
    rows = db.scalars(select(ApplicationSetting)).all()
    return envelope({x.key: x.value for x in rows})

@router.put("/settings/{key}")
async def update_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)):
    if "key" in key.lower() or "secret" in key.lower() or "token" in key.lower():
        raise HTTPException(status_code=400, detail={"code": "secret_setting_rejected", "message": "Secret settings cannot be managed through this API"})
    row = db.scalar(select(ApplicationSetting).where(ApplicationSetting.key == key))
    if row:
        row.value = payload.value
    else:
        db.add(ApplicationSetting(key=key, value=payload.value))
    db.commit()
    return envelope({key: payload.value})

@router.post("/knowledge/ingest")
async def ingest_knowledge(items: list[dict]):
    for item in items:
        url = str(item.get("source_url", ""))
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail={"code": "invalid_url", "message": "Only HTTP and HTTPS URLs are allowed"})
        if any(x in url for x in ["localhost", "127.0.0.1", "0.0.0.0", "169.254."]):
            raise HTTPException(status_code=400, detail={"code": "ssrf_blocked", "message": "Private or loopback hosts are not allowed"})
    count = ChromaStore().ingest_knowledge(items)
    return envelope({"ingested": count})

@router.get("/knowledge/search")
async def search_knowledge(q: str):
    return envelope(ChromaStore().search_knowledge(q))
