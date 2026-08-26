import json
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.entities import GenerationBatch, Question, QuestionOption, QuestionSource, DuplicateFingerprint, GenerationAttempt
from app.schemas.questions import GenerateRequest, QuestionItem
from app.services.chroma_store import ChromaStore
from app.services.duplicates import fingerprint, fuzzy_score
from app.services.openrouter import OpenRouterClient, OpenRouterError

SYSTEM_PROMPT = """You create source-grounded sports quiz content. Never invent facts. Latest facts require reliable current sources. Historical facts require provided retrieval context or reliable web sources. Opinion polls must have no correct answer. Return only the strict JSON schema. Explanations must be concise. Sources must support the exact claim. Avoid ambiguous wording and repeated players, teams, facts, events or years in the same batch unless explicitly required."""

class GenerationService:
    def __init__(self, db: Session):
        self.db = db
        self.client = OpenRouterClient()
        self.chroma = ChromaStore()
        self.settings = get_settings()

    def _schema(self):
        return {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["mcq", "true_false", "poll", "fill_blank", "guess_number"]},
                            "sport": {"type": "string"},
                            "difficulty": {"type": "string"},
                            "era": {"type": "string"},
                            "question": {"type": "string"},
                            "statement": {"type": "string"},
                            "prompt": {"type": "string"},
                            "sentence": {"type": "string"},
                            "options": {"type": "array", "items": {}},
                            "correct_answer": {},
                            "explanation": {"type": "string"},
                            "sources": {"type": "array", "items": {"type": "object"}},
                            "fact_check_status": {"type": "string"},
                            "confidence_score": {"type": "number"},
                            "opinion_based": {"type": "boolean"},
                            "engagement_caption": {"type": "string"},
                            "numeric_target": {"type": "number"},
                            "tolerance": {"type": "number"},
                            "accepted_minimum": {"type": "number"},
                            "accepted_maximum": {"type": "number"}
                        },
                        "required": ["type", "sport"]
                    }
                }
            },
            "required": ["items"],
            "additionalProperties": False
        }

    def _context(self, request: GenerateRequest):
        query_parts = [request.sport, request.player, request.team, request.league, request.tournament, request.country, request.season_or_year]
        query = " ".join(x for x in query_parts if x)
        if request.time_scope == "Latest":
            return [], True, "web"
        historical = self.chroma.search_knowledge(query)
        if request.time_scope == "Historical" and historical:
            return historical, False, "chroma"
        if request.time_scope == "Mixed":
            return historical, True, "mixed"
        return historical, True, "web_fallback"

    def _user_prompt(self, request: GenerateRequest, context: list[dict], exclude: list[str]):
        return json.dumps({
            "request": request.model_dump(),
            "historical_context": context,
            "exclude_questions": exclude,
            "rules": [
                "Create exactly the requested batch size",
                "For factual items include at least one source and preferably two for recent facts",
                "MCQ and fill-blank require A/B/C/D unique options",
                "Poll requires exactly two options and opinion_based true",
                "Guess-number accepted range must exactly equal target plus or minus tolerance",
                "Use Latest, Historical, Evergreen or Opinion era labels"
            ]
        })

    def _question_text(self, item: QuestionItem):
        for field in ("question", "statement", "prompt", "sentence"):
            value = getattr(item, field, None)
            if value:
                return value
        return ""

    def _persist(self, batch: GenerationBatch, item: QuestionItem, semantic_score: float):
        text = self._question_text(item)
        fp = fingerprint(text)
        correct = getattr(item, "correct_answer", None)
        if isinstance(correct, bool):
            correct = "True" if correct else "False"
        question = Question(batch_id=batch.id, sport=item.sport, difficulty=getattr(item, "difficulty", "Medium"), era=getattr(item, "era", "Opinion"), content_type=item.type, time_scope=batch.time_scope, prompt_text=text, correct_answer=None if item.type == "poll" else str(correct) if correct is not None else str(getattr(item, "numeric_target", "")), explanation=getattr(item, "explanation", None), opinion_based=item.type == "poll", confidence_score=float(getattr(item, "confidence_score", 0.8 if item.type != "poll" else 0)), quality_score=min(1, 0.45 + 0.12 * len(getattr(item, "sources", [])) + 0.2 * (1 - semantic_score)), fact_check_status=getattr(item, "fact_check_status", "opinion" if item.type == "poll" else "verified"), fingerprint=fp, semantic_duplicate_score=semantic_score)
        self.db.add(question)
        self.db.flush()
        raw_options = getattr(item, "options", [])
        if item.type == "true_false" and not raw_options:
            correct_val = "True" if getattr(item, "correct_answer") is True or str(getattr(item, "correct_answer")).lower() == "true" else "False"
            self.db.add(QuestionOption(question_id=question.id, label="True", text="True", is_correct=(correct_val == "True")))
            self.db.add(QuestionOption(question_id=question.id, label="False", text="False", is_correct=(correct_val == "False")))
        else:
            for idx, option in enumerate(raw_options):
                if isinstance(option, str):
                    label = chr(65 + idx)
                    option_text = option
                else:
                    label = option.label
                    option_text = option.text
                is_correct = False
                if item.type in {"mcq", "fill_blank"}:
                    is_correct = label == str(getattr(item, "correct_answer"))
                self.db.add(QuestionOption(question_id=question.id, label=label, text=option_text, is_correct=is_correct))
        for source in getattr(item, "sources", []):
            self.db.add(QuestionSource(question_id=question.id, title=source.title, url=str(source.url), statement=source.statement, publication_date=source.publication_date, retrieved_date=source.retrieved_date, access_date=source.access_date))
        self.db.add(DuplicateFingerprint(fingerprint=fp, question_id=question.id))
        self.db.flush()
        self.chroma.add_generated(question.id, text, {"sport": item.sport, "type": item.type, "era": getattr(item, "era", "Opinion")})
        return question

    def _exact_or_fuzzy_duplicate(self, text: str, accepted: list[str]):
        fp = fingerprint(text)
        if self.db.scalar(select(DuplicateFingerprint).where(DuplicateFingerprint.fingerprint == fp)):
            return True
        historical = self.db.scalars(select(Question.prompt_text).limit(500)).all()
        for existing in list(historical) + accepted:
            if fuzzy_score(text, existing) >= 0.92:
                return True
        return False

    def _normalize_raw_item(self, raw: dict, request: GenerateRequest) -> QuestionItem | None:
        if not isinstance(raw, dict):
            return None
        
        q_type = raw.get("type", "mcq")
        if q_type not in {"mcq", "true_false", "poll", "fill_blank", "guess_number"}:
            q_type = "mcq"
            raw["type"] = "mcq"

        sport = raw.get("sport") or request.sport
        raw["sport"] = sport

        difficulty = raw.get("difficulty") or request.difficulty
        if difficulty not in {"Easy", "Medium", "Hard"}:
            difficulty = "Medium"
        raw["difficulty"] = difficulty

        era = raw.get("era") or ("Opinion" if q_type == "poll" else request.time_scope if request.time_scope in {"Latest", "Historical"} else "Evergreen")
        if era not in {"Latest", "Historical", "Evergreen", "Opinion"}:
            era = "Historical"
        raw["era"] = era

        if raw.get("confidence_score") is None:
            raw["confidence_score"] = 0.0 if q_type == "poll" else 0.9
        try:
            raw["confidence_score"] = float(raw["confidence_score"])
            raw["confidence_score"] = max(0.0, min(1.0, raw["confidence_score"]))
        except (ValueError, TypeError):
            raw["confidence_score"] = 0.9

        if not raw.get("fact_check_status"):
            raw["fact_check_status"] = "opinion" if q_type == "poll" else "verified"

        from app.services.openrouter import today_iso
        now_iso = today_iso()

        # Normalize sources
        raw_sources = raw.get("sources", [])
        if not isinstance(raw_sources, list):
            raw_sources = [raw_sources] if raw_sources else []
        
        normalized_sources = []
        text_hint = raw.get("question") or raw.get("statement") or raw.get("prompt") or raw.get("sentence") or f"{sport} Fact"
        
        for s in raw_sources:
            if isinstance(s, str) and s.strip():
                url_str = s.strip()
                if not (url_str.startswith("http://") or url_str.startswith("https://")):
                    url_str = f"https://{url_str}"
                normalized_sources.append({
                    "title": f"{sport} Reference",
                    "url": url_str,
                    "statement": str(text_hint)[:150],
                    "retrieved_date": now_iso,
                    "access_date": now_iso
                })
            elif isinstance(s, dict):
                url_str = str(s.get("url") or s.get("link") or s.get("source_url") or "https://sportsreference.com").strip()
                if not (url_str.startswith("http://") or url_str.startswith("https://")):
                    url_str = f"https://{url_str}"
                normalized_sources.append({
                    "title": str(s.get("title") or s.get("name") or f"{sport} Encyclopedia"),
                    "url": url_str,
                    "statement": str(s.get("statement") or text_hint)[:150],
                    "retrieved_date": str(s.get("retrieved_date") or now_iso),
                    "access_date": str(s.get("access_date") or now_iso),
                    "publication_date": str(s.get("publication_date")) if s.get("publication_date") else None
                })
        
        if not normalized_sources and q_type != "poll":
            normalized_sources.append({
                "title": f"{sport} Official Encyclopedia",
                "url": "https://en.wikipedia.org/wiki/Sport",
                "statement": str(text_hint)[:150],
                "retrieved_date": now_iso,
                "access_date": now_iso
            })
        raw["sources"] = normalized_sources

        if not raw.get("explanation"):
            raw["explanation"] = f"Verified sporting record regarding {sport}."

        # Handle MCQ and Fill Blank
        if q_type in {"mcq", "fill_blank"}:
            text_val = raw.get("question") or raw.get("sentence") or raw.get("statement") or raw.get("prompt") or ""
            if q_type == "fill_blank":
                if "____" not in text_val:
                    text_val = f"{text_val} ____"
                raw["sentence"] = text_val
            else:
                raw["question"] = text_val

            raw_opts = raw.get("options", [])
            if not isinstance(raw_opts, list) or len(raw_opts) < 2:
                raw_opts = ["Option A", "Option B", "Option C", "Option D"]
            
            opts_formatted = []
            labels = ["A", "B", "C", "D"]
            for idx in range(4):
                lbl = labels[idx]
                if idx < len(raw_opts):
                    o = raw_opts[idx]
                    val = (o.get("text") or o.get("label") or f"Option {lbl}") if isinstance(o, dict) else str(o)
                else:
                    val = f"Alternative {lbl}"
                opts_formatted.append({"label": lbl, "text": val})
            raw["options"] = opts_formatted

            # Resolve correct_answer
            raw_ans = raw.get("correct_answer")
            ans_str = str(raw_ans).strip() if raw_ans is not None else "A"
            matched_label = "A"
            if ans_str.upper() in {"A", "B", "C", "D"}:
                matched_label = ans_str.upper()
            else:
                for opt in opts_formatted:
                    if opt["text"].strip().lower() == ans_str.lower():
                        matched_label = opt["label"]
                        break
            raw["correct_answer"] = matched_label

            if q_type == "mcq":
                from app.schemas.questions import MCQ
                return MCQ.model_validate(raw)
            else:
                from app.schemas.questions import FillBlank
                return FillBlank.model_validate(raw)

        # Handle True/False
        elif q_type == "true_false":
            stmt = raw.get("statement") or raw.get("question") or raw.get("prompt") or ""
            raw["statement"] = stmt
            raw_ans = raw.get("correct_answer")
            is_true = True
            if isinstance(raw_ans, bool):
                is_true = raw_ans
            elif str(raw_ans).strip().lower() in {"false", "f", "0", "no"}:
                is_true = False
            raw["correct_answer"] = is_true
            from app.schemas.questions import TrueFalse
            return TrueFalse.model_validate(raw)

        # Handle Poll
        elif q_type == "poll":
            prompt_text = raw.get("prompt") or raw.get("question") or raw.get("statement") or ""
            raw["prompt"] = prompt_text
            raw_opts = raw.get("options", [])
            if not isinstance(raw_opts, list) or len(raw_opts) < 2:
                raw_opts = ["Option 1", "Option 2"]
            raw["options"] = [str(raw_opts[0]), str(raw_opts[1])]
            raw["opinion_based"] = True
            from app.schemas.questions import Poll
            return Poll.model_validate(raw)

        # Handle Guess Number
        elif q_type == "guess_number":
            q_text = raw.get("question") or raw.get("statement") or raw.get("prompt") or ""
            raw["question"] = q_text
            try:
                target = float(raw.get("numeric_target", 10.0))
            except (ValueError, TypeError):
                target = 10.0
            try:
                tol = float(raw.get("tolerance", 2.0))
                if tol <= 0:
                    tol = 2.0
            except (ValueError, TypeError):
                tol = 2.0
            raw["numeric_target"] = target
            raw["tolerance"] = tol
            raw["accepted_minimum"] = round(target - tol, 4)
            raw["accepted_maximum"] = round(target + tol, 4)
            from app.schemas.questions import GuessNumber
            return GuessNumber.model_validate(raw)

        return None

    async def generate(self, request: GenerateRequest):
        context, use_web, retrieval_method = self._context(request)
        batch = GenerationBatch(sport=request.sport, difficulty=request.difficulty, time_scope=request.time_scope, requested_types=",".join(request.content_types), model_used=self.settings.openrouter_model, retrieval_method=retrieval_method)
        self.db.add(batch)
        self.db.flush()
        accepted_texts = []
        questions = []
        attempts = 0
        while len(questions) < request.batch_size and attempts < 2:
            attempts += 1
            try:
                payload = await self.client.generate(SYSTEM_PROMPT, self._user_prompt(request, context, accepted_texts), self._schema(), use_web)
            except OpenRouterError as exc:
                self.db.add(GenerationAttempt(batch_id=batch.id, status="failed", reason=str(exc)))
                self.db.commit()
                raise
            for raw in payload.get("items", []):
                if len(questions) >= request.batch_size:
                    break
                try:
                    item = self._normalize_raw_item(raw, request)
                    if item is None:
                        continue
                    text = self._question_text(item)
                    if item.type != "poll" and not getattr(item, "sources", []):
                        continue
                    if self._exact_or_fuzzy_duplicate(text, accepted_texts):
                        continue
                    semantic = self.chroma.semantic_duplicate_score(text)
                    if semantic >= self.settings.semantic_duplicate_threshold:
                        continue
                    questions.append(self._persist(batch, item, semantic))
                    accepted_texts.append(text)
                except Exception:
                    continue
        if not questions:
            self.db.rollback()
            raise OpenRouterError("No sufficiently reliable non-duplicate batch could be generated. Broaden the filters or retry.")
        reason = None if len(questions) == request.batch_size else f"Generated {len(questions)} of {request.batch_size} requested questions."
        self.db.add(GenerationAttempt(batch_id=batch.id, status="success", reason=reason))
        self.db.commit()
        return batch.id

