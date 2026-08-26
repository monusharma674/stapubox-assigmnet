from typing import Literal, Union
from pydantic import BaseModel, Field, HttpUrl, model_validator

Difficulty = Literal["Easy", "Medium", "Hard"]
Era = Literal["Latest", "Historical", "Evergreen", "Opinion"]

class Source(BaseModel):
    title: str
    url: HttpUrl
    statement: str
    publication_date: str | None = None
    retrieved_date: str
    access_date: str

class Option(BaseModel):
    label: str
    text: str

class MCQ(BaseModel):
    type: Literal["mcq"]
    sport: str
    difficulty: Difficulty
    era: Era
    question: str
    options: list[Option]
    correct_answer: str
    explanation: str
    sources: list[Source]
    fact_check_status: str
    confidence_score: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def validate_options(self):
        if len(self.options) != 4 or len({o.text.strip().lower() for o in self.options}) != 4:
            raise ValueError("MCQ requires four unique options")
        if [o.label for o in self.options] != ["A", "B", "C", "D"]:
            raise ValueError("MCQ labels must be A, B, C, D")
        if self.correct_answer not in {o.label for o in self.options}:
            raise ValueError("Correct answer must match an option label")
        return self

class TrueFalse(BaseModel):
    type: Literal["true_false"]
    sport: str
    difficulty: Difficulty
    era: Era
    statement: str
    correct_answer: bool
    explanation: str
    sources: list[Source]
    fact_check_status: str
    confidence_score: float = Field(ge=0, le=1)

class Poll(BaseModel):
    type: Literal["poll"]
    sport: str
    prompt: str
    options: list[str]
    opinion_based: Literal[True] = True
    engagement_caption: str | None = None

    @model_validator(mode="after")
    def validate_poll(self):
        if len(self.options) != 2 or len(set(x.strip().lower() for x in self.options)) != 2:
            raise ValueError("Poll requires two unique options")
        return self

class FillBlank(BaseModel):
    type: Literal["fill_blank"]
    sport: str
    difficulty: Difficulty
    era: Era
    sentence: str
    options: list[Option]
    correct_answer: str
    explanation: str
    sources: list[Source]
    fact_check_status: str
    confidence_score: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def validate_fill(self):
        if self.sentence.count("____") != 1:
            raise ValueError("Fill in the blank requires exactly one visible blank")
        if len(self.options) != 4 or len({o.text.strip().lower() for o in self.options}) != 4:
            raise ValueError("Fill in the blank requires four unique options")
        if self.correct_answer not in {o.label for o in self.options}:
            raise ValueError("Correct answer must match an option label")
        return self

class GuessNumber(BaseModel):
    type: Literal["guess_number"]
    sport: str
    difficulty: Difficulty
    era: Era
    question: str
    numeric_target: float
    tolerance: float = Field(gt=0)
    accepted_minimum: float
    accepted_maximum: float
    explanation: str
    sources: list[Source]
    fact_check_status: str
    confidence_score: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def validate_range(self):
        if self.accepted_minimum != self.numeric_target - self.tolerance or self.accepted_maximum != self.numeric_target + self.tolerance:
            raise ValueError("Accepted range must match target and tolerance")
        return self

QuestionItem = Union[MCQ, TrueFalse, Poll, FillBlank, GuessNumber]

class GenerateRequest(BaseModel):
    sport: str
    difficulty: Difficulty = "Medium"
    content_types: list[Literal["mcq", "true_false", "poll", "fill_blank", "guess_number"]]
    time_scope: Literal["Latest", "Historical", "Mixed"]
    batch_size: int = Field(default=4, ge=1, le=5)
    team: str | None = None
    player: str | None = None
    league: str | None = None
    tournament: str | None = None
    country: str | None = None
    season_or_year: str | None = None
    recent_period: Literal["24 hours", "7 days", "30 days", "current season"] = "7 days"
    avoid_previously_answered: bool = True
    mix_question_types: bool = True
    surprise_me: bool = False

class AnswerRequest(BaseModel):
    answer: str

class SettingUpdate(BaseModel):
    value: str
