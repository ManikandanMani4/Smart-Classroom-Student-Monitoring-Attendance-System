
import cv2
import json
import os
import re
import hashlib

from app.detection.face_detector import FaceDetector
from app.recognition.embedding import get_embedding


STUDENT_FILE = "data/students/students.json"
EMBEDDING_DIR = "data/embeddings"


def safe_id(value):
    """Create a safe filename component."""
    value = str(value).strip().upper()
    return re.sub(r"[^A-Z0-9_-]", "_", value)


def make_student_key(institution_id, student_id):
    """Keep identical student IDs separate across institutions."""
    institution = str(institution_id).strip()
    student = str(student_id).strip().upper()

    digest = hashlib.sha256(
        institution.encode("utf-8")
    ).hexdigest()[:12]

    return f"{digest}_{safe_id(student)}"


class StudentRegistration:

    def __init__(self):
        self.detector = FaceDetector()

        os.makedirs("data/students", exist_ok=True)
        os.makedirs(EMBEDDING_DIR, exist_ok=True)

    def register(
        self,
        student_id,
        student_name,
        institution_id,
        class_id=None,
        advisor_id=None
    ):
        student_id = str(student_id).strip().upper()
        student_name = str(student_name).strip()
        institution_id = str(institution_id).strip()

        if not institution_id or not student_id or not student_name:
            print("Student ID, name, and institution ID are required.")
            return

        student_key = make_student_key(institution_id, student_id)

        camera = cv2.VideoCapture(0)

        if not camera.isOpened():
            print("Could not open camera.")
            return

        embeddings = []
        target_samples = 5

        try:
            print("Student ID:", student_id)
            print("Student Name:", student_name)
            print("Institution ID:", institution_id)
            print("Keep exactly one face visible.")
            print("Press S to capture a sample; Q to cancel.")

            while len(embeddings) < target_samples:
                ret, frame = camera.read()

                if not ret:
                    print("Could not read camera frame.")
                    return

                faces = self.detector.detect(frame)

                for face in faces:
                    x1, y1, x2, y2 = map(int, face.bbox)

                    cv2.rectangle(
                        frame, (x1, y1), (x2, y2),
                        (0, 255, 0), 2
                    )

                cv2.putText(
                    frame,
                    f"Samples: {len(embeddings)}/{target_samples}",
                    (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 0),
                    2
                )

                cv2.imshow("Student Registration", frame)
                key = cv2.waitKey(1) & 0xFF

                if key == ord("q"):
                    print("Registration cancelled.")
                    return

                if key == ord("s"):
                    if len(faces) != 1:
                        print("Please keep exactly one face visible.")
                        continue

                    embedding = get_embedding(faces[0])

                    if embedding is None:
                        print("Could not generate embedding.")
                        continue

                    embeddings.append(embedding.tolist())
                    print(
                        f"Captured sample {len(embeddings)}/{target_samples}"
                    )

        finally:
            camera.release()
            cv2.destroyAllWindows()

        embedding_path = os.path.join(
            EMBEDDING_DIR,
            f"{student_key}.json"
        )

        # Save the new embedding file first.
        with open(embedding_path, "w", encoding="utf-8") as file:
            json.dump(
                {
                    "student_key": student_key,
                    "student_id": student_id,
                    "institution_id": institution_id,
                    "embeddings": embeddings
                },
                file,
                indent=4
            )

        self.save_student(
            student_id=student_id,
            student_name=student_name,
            institution_id=institution_id,
            class_id=class_id,
            advisor_id=advisor_id,
            student_key=student_key,
            embedding_path=embedding_path
        )

        print("Student registered successfully.")
        print("Institution ID:", institution_id)
        print("Student ID:", student_id)
        print("Saved embedding:", embedding_path)

    def save_student(
        self,
        student_id,
        student_name,
        institution_id,
        class_id,
        advisor_id,
        student_key,
        embedding_path
    ):
        students = []

        if os.path.exists(STUDENT_FILE):
            with open(STUDENT_FILE, "r", encoding="utf-8") as file:
                try:
                    students = json.load(file)
                except json.JSONDecodeError:
                    raise ValueError(
                        "Student registry JSON is invalid. "
                        "Back it up and repair it before registering."
                    )

        if not isinstance(students, list):
            raise ValueError("Student registry must be a JSON array.")

        # Replace only the same student within the same institution.
        students = [
            student for student in students
            if not (
                str(student.get("institution_id", "")).strip()
                == institution_id
                and str(student.get("student_id", "")).strip().upper()
                == student_id
            )
        ]

        students.append({
            "student_key": student_key,
            "student_id": student_id,
            "student_name": student_name,
            "institution_id": institution_id,
            "class_id": class_id,
            "advisor_id": advisor_id,
            "embedding_file": embedding_path
        })

        temporary_file = STUDENT_FILE + ".tmp"

        with open(temporary_file, "w", encoding="utf-8") as file:
            json.dump(students, file, indent=4)

        os.replace(temporary_file, STUDENT_FILE)


if __name__ == "__main__":
    student_id = input("Enter Student ID: ").strip()
    student_name = input("Enter Student Name: ").strip()
    institution_id = input("Enter Institution ID: ").strip()

    registration = StudentRegistration()

    registration.register(
        student_id=student_id,
        student_name=student_name,
        institution_id=institution_id
    )
