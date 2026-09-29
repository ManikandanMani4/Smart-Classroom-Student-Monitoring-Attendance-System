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

        if not os.path.exists(EMBEDDING_DIR):
            return

        for filename in os.listdir(EMBEDDING_DIR):

            if not filename.endswith(".json"):
                continue

            student_id = filename.replace(".json", "")

            path = os.path.join(
                EMBEDDING_DIR,
                filename
            )

            with open(path, "r") as file:
                data = json.load(file)

            # New format: multiple embeddings
            if "embeddings" in data:

                embeddings = []

                for embedding in data["embeddings"]:

                    embeddings.append(
                        np.array(
                            embedding,
                            dtype=np.float32
                        )
                    )

                self.known_faces[student_id] = embeddings

            # Old format: single embedding
            else:

                embedding = np.array(
                    data,
                    dtype=np.float32
                )

                self.known_faces[student_id] = [
                    embedding
                ]

        print(
            f"Loaded {len(self.known_faces)} registered student(s)."
        )

    def cosine_similarity(
        self,
        embedding1,
        embedding2
    ):

        denominator = (
            np.linalg.norm(embedding1)
            * np.linalg.norm(embedding2)
        )

        if denominator == 0:
            return 0.0

        return float(
            np.dot(embedding1, embedding2)
            / denominator
        )

    def recognize(
        self,
        face,
        threshold=0.5
    ):

        live_embedding = get_embedding(face)

        if live_embedding is None:
            return None, 0.0

        best_student = None
        best_score = -1.0

        # Compare against every registered student
        for student_id, embeddings in self.known_faces.items():

            # Compare against all samples of this student
            for known_embedding in embeddings:

                score = self.cosine_similarity(
                    live_embedding,
                    known_embedding
                )

                if score > best_score:

                    best_score = score
                    best_student = student_id

        if best_score < threshold:

            return None, best_score

        return best_student, best_score