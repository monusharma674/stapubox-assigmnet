import hashlib
import re
from rapidfuzz.fuzz import ratio

def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", text.lower())).strip()

def fingerprint(text: str) -> str:
    return hashlib.sha256(normalize_text(text).encode()).hexdigest()

def fuzzy_score(a: str, b: str) -> float:
    return ratio(normalize_text(a), normalize_text(b)) / 100
