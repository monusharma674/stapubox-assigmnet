from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def utcnow():
    return datetime.now(timezone.utc)

class GenerationBatch(Base):
    __tablename__ = "generation_batches"
    id: Mapped[int] = mapped_column(primary_key=True)
    sport: Mapped[str] = mapped_column(String(80))
    difficulty: Mapped[str] = mapped_column(String(20))
    time_scope: Mapped[str] = mapped_column(String(20))
    requested_types: Mapped[str] = mapped_column(Text)
    model_used: Mapped[str] = mapped_column(String(120))
    retrieval_method: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    questions: Mapped[list["Question"]] = relationship(back_populates="batch", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("generation_batches.id"))
    parent_question_id: Mapped[int | None] = mapped_column(ForeignKey("questions.id"), nullable=True)
    sport: Mapped[str] = mapped_column(String(80))
    difficulty: Mapped[str] = mapped_column(String(20))
    era: Mapped[str] = mapped_column(String(20))
    content_type: Mapped[str] = mapped_column(String(40))
    time_scope: Mapped[str] = mapped_column(String(20))
    prompt_text: Mapped[str] = mapped_column(Text)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    opinion_based: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0)
    quality_score: Mapped[float] = mapped_column(Float, default=0)
    fact_check_status: Mapped[str] = mapped_column(String(40), default="verified")
    fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    semantic_duplicate_score: Mapped[float] = mapped_column(Float, default=0)
    saved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    batch: Mapped[GenerationBatch] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(cascade="all, delete-orphan")
    sources: Mapped[list["QuestionSource"]] = relationship(cascade="all, delete-orphan")
    answers: Mapped[list["UserAnswer"]] = relationship(cascade="all, delete-orphan")

class QuestionOption(Base):
    __tablename__ = "question_options"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    label: Mapped[str] = mapped_column(String(8))
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

class QuestionSource(Base):
    __tablename__ = "question_sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    statement: Mapped[str] = mapped_column(Text)
    publication_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    retrieved_date: Mapped[str] = mapped_column(String(40))
    access_date: Mapped[str] = mapped_column(String(40))

class UserAnswer(Base):
    __tablename__ = "user_answers"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    selected_answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

class SavedQuestion(Base):
    __tablename__ = "saved_questions"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

class GenerationAttempt(Base):
    __tablename__ = "generation_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("generation_batches.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

class DuplicateFingerprint(Base):
    __tablename__ = "duplicate_fingerprints"
    id: Mapped[int] = mapped_column(primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    question_id: Mapped[int | None] = mapped_column(ForeignKey("questions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ApplicationSetting(Base):
    __tablename__ = "application_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    value: Mapped[str] = mapped_column(Text)
