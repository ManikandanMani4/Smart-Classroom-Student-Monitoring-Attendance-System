import json
import os
import numpy as np

from app.recognition.embedding import get_embedding


EMBEDDING_DIR = "data/embeddings"


class FaceRecognizer:

    def __init__(self):
        self.known_faces = {}
        self.load_embeddings()

    def load_embeddings(self):
        # Clear old entries so deleted students are removed from memory.
        self.known_faces.clear()

        if not os.path.exists(EMBEDDING_DIR):
            print("Embedding directory does not exist.")
            return

        for filename in os.listdir(EMBEDDING_DIR):
            if not filename.endswith(".json"):
                continue

            student_id = filename[:-5].upper()
            path = os.path.join(EMBEDDING_DIR, filename)

            try:
                with open(path, "r", encoding="utf-8") as file:
                    data = json.load(file)

                # New format: multiple face embeddings.
                if isinstance(data, dict) and "embeddings" in data:
                    embeddings = [
                        np.asarray(item, dtype=np.float32)
                        for item in data["embeddings"]
                    ]

                # Old format: one face embedding.
                else:
                    embeddings = [
                        np.asarray(data, dtype=np.float32)
                    ]

                embeddings = [
                    embedding
                    for embedding in embeddings
                    if embedding.size > 0
                    and np.all(np.isfinite(embedding))
                ]

                if embeddings:
                    self.known_faces[student_id] = embeddings

            except (
                OSError,
                json.JSONDecodeError,
                TypeError,
                ValueError
            ) as error:
                print(
                    f"Skipping invalid embedding file "
                    f"{filename}: {error}"
                )

        print(
            f"Loaded {len(self.known_faces)} registered student(s)."
        )

    def cosine_similarity(self, embedding1, embedding2):
        denominator = (
            np.linalg.norm(embedding1)
            * np.linalg.norm(embedding2)
        )

        if denominator == 0:
            return 0.0

        return float(
            np.dot(embedding1, embedding2) / denominator
        )

    def recognize(self, face, threshold=0.5):
        live_embedding = get_embedding(face)

        if live_embedding is None:
            return None, 0.0

        live_embedding = np.asarray(
            live_embedding,
            dtype=np.float32
        )

        best_student = None
        best_score = -1.0

        # Compare against all registered students and samples.
        for student_id, embeddings in self.known_faces.items():
            for known_embedding in embeddings:

                if live_embedding.shape != known_embedding.shape:
                    continue

                score = self.cosine_similarity(
                    live_embedding,
                    known_embedding
                )

                if score > best_score:
                    best_score = score
                    best_student = student_id

        if best_student is None or best_score < threshold:
            return None, max(best_score, 0.0)

        return best_student, best_score