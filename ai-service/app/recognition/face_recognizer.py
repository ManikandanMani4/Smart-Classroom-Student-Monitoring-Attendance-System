
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
        self.known_faces.clear()

        if not os.path.isdir(EMBEDDING_DIR):
            print("Embedding directory does not exist.")
            return

        loaded_count = 0

        for filename in os.listdir(EMBEDDING_DIR):
            if not filename.lower().endswith(".json"):
                continue

            path = os.path.join(EMBEDDING_DIR, filename)

            try:
                with open(path, "r", encoding="utf-8") as file:
                    data = json.load(file)

                if not isinstance(data, dict):
                    print(f"Skipping {filename}: invalid format.")
                    continue

                student_id = str(
                    data.get("student_id")
                    or data.get("student_key")
                    or os.path.splitext(filename)[0]
                ).strip()

                if not student_id:
                    print(f"Skipping {filename}: student ID missing.")
                    continue

                raw_embeddings = data.get("embeddings", [])

                # Support legacy files containing one embedding directly.
                if not isinstance(raw_embeddings, list):
                    raw_embeddings = []

                if not raw_embeddings and "embedding" in data:
                    raw_embeddings = [data["embedding"]]

                valid_embeddings = []

                for item in raw_embeddings:
                    try:
                        embedding = np.asarray(
                            item, dtype=np.float32
                        ).reshape(-1)

                        if (
                            embedding.size > 0
                            and np.all(np.isfinite(embedding))
                        ):
                            valid_embeddings.append(embedding)

                    except (TypeError, ValueError):
                        continue

                if not valid_embeddings:
                    print(
                        f"Skipping {filename}: no valid embeddings."
                    )
                    continue

                # This temporary mode assumes every file in this
                # directory belongs to the same institution.
                self.known_faces[student_id] = {
                    "student_id": student_id,
                    "institution_id": str(
                        data.get("institution_id", "")
                    ).strip(),
                    "embeddings": valid_embeddings,
                }

                loaded_count += 1

            except (
                OSError,
                json.JSONDecodeError,
                TypeError,
                ValueError,
            ) as error:
                print(f"Skipping {filename}: {error}")

        print(
            f"Loaded {loaded_count} student embedding file(s) "
            "in temporary single-institution mode."
        )

    @staticmethod
    def cosine_similarity(embedding1, embedding2):
        denominator = (
            np.linalg.norm(embedding1)
            * np.linalg.norm(embedding2)
        )

        if denominator == 0:
            return 0.0

        return float(
            np.dot(embedding1, embedding2) / denominator
        )

    def recognize(
        self, face, institution_id=None, threshold=0.5
    ):
        live_embedding = get_embedding(face)

        if live_embedding is None:
            return None, 0.0

        live_embedding = np.asarray(
            live_embedding, dtype=np.float32
        ).reshape(-1)

        if (
            live_embedding.size == 0
            or not np.all(np.isfinite(live_embedding))
        ):
            return None, 0.0

        requested_institution = str(
            institution_id or ""
        ).strip()

        best_student = None
        best_score = -1.0

        for student_id, student_data in self.known_faces.items():
            saved_institution = student_data["institution_id"]

            # If an institution ID is provided, only match records
            # belonging to that institution. Legacy records without
            # metadata are accepted only when no ID is supplied.
            if requested_institution:
                if saved_institution != requested_institution:
                    continue

            for known_embedding in student_data["embeddings"]:
                if live_embedding.shape != known_embedding.shape:
                    continue

                score = self.cosine_similarity(
                    live_embedding, known_embedding
                )

                if score > best_score:
                    best_score = score
                    best_student = student_id

        if best_student is None or best_score < threshold:
            return None, max(best_score, 0.0)

        return best_student, best_score
