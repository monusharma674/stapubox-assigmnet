import pytest
from app.schemas.questions import MCQ, Poll, GuessNumber

def source():
    return {"title":"Official","url":"https://example.com","statement":"Fact","retrieved_date":"2026-08-26","access_date":"2026-08-26"}

def test_mcq_four_options():
    item = MCQ(type="mcq", sport="Cricket", difficulty="Easy", era="Historical", question="Q?", options=[{"label":"A","text":"1"},{"label":"B","text":"2"},{"label":"C","text":"3"},{"label":"D","text":"4"}], correct_answer="A", explanation="E", sources=[source()], fact_check_status="verified", confidence_score=.9)
    assert len(item.options) == 4

def test_poll_two_options_and_no_answer():
    item = Poll(type="poll", sport="Football", prompt="Pick one", options=["A","B"], opinion_based=True)
    assert len(item.options) == 2
    assert not hasattr(item, "correct_answer")

def test_guess_number_tolerance():
    item = GuessNumber(type="guess_number", sport="Tennis", difficulty="Medium", era="Historical", question="How many?", numeric_target=100, tolerance=5, accepted_minimum=95, accepted_maximum=105, explanation="E", sources=[source()], fact_check_status="verified", confidence_score=.8)
    assert item.accepted_maximum - item.accepted_minimum == 10
