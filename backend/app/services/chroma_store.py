import logging
from datetime import datetime, timezone
import chromadb
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class ChromaStore:
    def __init__(self):
        settings = get_settings()
        try:
            self.client = chromadb.PersistentClient(path=settings.chroma_persist_directory)
            self.knowledge = self.client.get_or_create_collection("historical_sports_knowledge")
            self.generated = self.client.get_or_create_collection("generated_questions")
        except Exception as exc:
            logger.warning(f"Chroma PersistentClient failed at {settings.chroma_persist_directory}: {exc}. Falling back to EphemeralClient.")
            self.client = chromadb.EphemeralClient()
            self.knowledge = self.client.get_or_create_collection("historical_sports_knowledge")
            self.generated = self.client.get_or_create_collection("generated_questions")


    def search_knowledge(self, query: str, n_results: int = 6):
        if self.knowledge.count() == 0:
            return []
        result = self.knowledge.query(query_texts=[query], n_results=min(n_results, self.knowledge.count()))
        rows = []
        for i, doc in enumerate(result.get("documents", [[]])[0]):
            rows.append({"document": doc, "metadata": result.get("metadatas", [[]])[0][i], "distance": result.get("distances", [[]])[0][i] if result.get("distances") else None})
        return rows

    def ingest_knowledge(self, items: list[dict]):
        ids = []
        docs = []
        metas = []
        stamp = datetime.now(timezone.utc).isoformat()
        for index, item in enumerate(items):
            ids.append(item.get("id") or f"knowledge-{stamp}-{index}")
            docs.append(item["fact_text"])
            metas.append({k: str(v) for k, v in item.items() if k != "fact_text" and v is not None})
        self.knowledge.add(ids=ids, documents=docs, metadatas=metas)
        return len(ids)

    def semantic_duplicate_score(self, text: str) -> float:
        if self.generated.count() == 0:
            return 0.0
        result = self.generated.query(query_texts=[text], n_results=1)
        distances = result.get("distances", [[]])[0]
        if not distances:
            return 0.0
        return max(0.0, 1.0 - float(distances[0]))

    def add_generated(self, question_id: int, text: str, metadata: dict):
        self.generated.add(ids=[str(question_id)], documents=[text], metadatas=[{k: str(v) for k, v in metadata.items()}])
