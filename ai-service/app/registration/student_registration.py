import cv2
import json
import os
import numpy as np

from app.detection.face_detector import FaceDetector
from app.recognition.embedding import get_embedding


STUDENT_FILE = "data/students/students.json"
EMBEDDING_DIR = "data/embeddings"


class StudentRegistration:

    def __init__(self):
        self.detector = FaceDetector()

        os.makedirs("data/students", exist_ok=True)
        os.makedirs(EMBEDDING_DIR, exist_ok=True)

    def register(self, student_id, student_name):

        camera = cv2.VideoCapture(0)

        if not camera.isOpened():
            print("Could not open camera")
            return

        embeddings = []
        target_samples = 5

        print()
        print("===================================")
        print("     STUDENT FACE REGISTRATION")
        print("===================================")
        print("Student ID:", student_id)
        print("Student Name:", student_name)
        print()
        print("Look at the camera.")
        print("Move your head slightly between samples.")
        print("Keep only ONE face visible.")
        print()

        while True:

            ret, frame = camera.read()

            if not ret:
                print("Could not read camera frame")
                break

            faces = self.detector.detect(frame)

            for face in faces:

                x1, y1, x2, y2 = map(int, face.bbox)

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    f"Samples: {len(embeddings)}/{target_samples}",
                    (x1, y1 - 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    "Press S to capture",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2
                )

            cv2.imshow(
                "Student Registration",
                frame
            )

            key = cv2.waitKey(1) & 0xFF

            # Capture sample
            if key == ord("s"):

                if len(faces) != 1:

                    print(
                        "Please keep exactly one face visible."
                    )

                    continue

                embedding = get_embedding(faces[0])

                if embedding is None:

                    print(
                        "Could not generate embedding."
                    )

                    continue

                embeddings.append(
                    embedding.tolist()
                )

                print(
                    f"Face sample {len(embeddings)}/{target_samples} captured."
                )

                if len(embeddings) >= target_samples:

                    break

            # Cancel
            elif key == ord("q"):

                print("Registration cancelled.")
                camera.release()
                cv2.destroyAllWindows()
                return

        camera.release()
        cv2.destroyAllWindows()

        if len(embeddings) < target_samples:

            print(
                "Registration failed. "
                "Not enough samples."
            )

            return

        # Save all embeddings
        embedding_path = os.path.join(
            EMBEDDING_DIR,
            f"{student_id}.json"
        )

        with open(embedding_path, "w") as file:

            json.dump(
                {
                    "student_id": student_id,
                    "embeddings": embeddings
                },
                file,
                indent=4
            )

        self.save_student(
            student_id,
            student_name,
            embedding_path
        )

        print()
        print("===================================")
        print(" Student registered successfully!")
        print("===================================")
        print("Student ID:", student_id)
        print("Student Name:", student_name)
        print("Samples:", len(embeddings))
        print("Saved:", embedding_path)

    def save_student(
        self,
        student_id,
        student_name,
        embedding_path
    ):

        students = []

        if os.path.exists(STUDENT_FILE):

            with open(STUDENT_FILE, "r") as file:

                try:
                    students = json.load(file)

                except json.JSONDecodeError:

                    students = []

        # Remove previous record for same ID
        students = [
            student
            for student in students
            if student.get("student_id") != student_id
        ]

        student = {
            "student_id": student_id,
            "student_name": student_name,
            "embedding_file": embedding_path
        }

        students.append(student)

        with open(STUDENT_FILE, "w") as file:

            json.dump(
                students,
                file,
                indent=4
            )


if __name__ == "__main__":

    student_id = input("Enter Student ID: ")
    student_name = input("Enter Student Name: ")

    registration = StudentRegistration()

    registration.register(
        student_id,
        student_name
    )