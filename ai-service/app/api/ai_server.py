
import cv2
import base64
import binascii
import json
import os
import re
import numpy as np
import tempfile

from flask_cors import CORS
from flask import Flask, jsonify, request
from app.timetable_ocr import extract_timetable
from app.recognition.embedding import get_embedding
from app.detection.face_detector import FaceDetector
from app.recognition.face_recognizer import FaceRecognizer


app = Flask(__name__)

CORS(app, resources={
    r"/api/timetable/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ]
    }
})


print("==============================================")
print("Starting SmartClassroom AI Service")
print("==============================================")

print("Loading face detector...")
detector = FaceDetector()

print("Loading registered face embeddings...")
recognizer = FaceRecognizer()

print("==============================================")
print("AI Service Ready")
print("==============================================")


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "success": True,
        "message": "SmartClassroom AI service is running.",
        "service": "face-recognition"
    }), 200


# --------------------------------------------------
# TIMETABLE OCR EXTRACTION
# --------------------------------------------------

@app.route("/api/timetable/extract", methods=["POST"])
def extract_timetable_route():
    from app.timetable_ocr import extract_timetable_data

    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "No timetable file was uploaded."
        }), 400

    uploaded_file = request.files["file"]
    extension = os.path.splitext(
        uploaded_file.filename or ""
    )[1].lower()

    if extension not in {".png", ".jpg", ".jpeg", ".pdf"}:
        return jsonify({
            "success": False,
            "error": "Upload a PNG, JPG, JPEG, or PDF file."
        }), 400

    temporary_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=extension,
            delete=False
        ) as temp:
            temporary_path = temp.name

        uploaded_file.save(temporary_path)
        result = extract_timetable_data(temporary_path)

        if not result["text"].strip():
            return jsonify({
                "success": False,
                "error": "No text was detected in the uploaded file."
            }), 422

        return jsonify({
            "success": True,
            "text": result["text"],
            "timetable": result["timetable"],
            "other_information": result["other_information"],
            "table_detected": result["table_detected"],
            "entries": []
        }), 200

    except Exception:
        app.logger.exception("Timetable extraction failed")

        return jsonify({
            "success": False,
            "error": (
                "Timetable extraction failed. "
                "Check the AI service logs."
            )
        }), 500

    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.remove(temporary_path)


# --------------------------------------------------
# FACE RECOGNITION
# Temporary single-institution mode
# --------------------------------------------------

@app.route("/api/ai/recognize", methods=["POST"])
def recognize_frame():
    try:
        if "frame" not in request.files:
            return jsonify({
                "success": False,
                "message": "No frame received."
            }), 400

        uploaded_file = request.files["frame"]

        if not uploaded_file.filename:
            return jsonify({
                "success": False,
                "message": "Empty frame received."
            }), 400

        image_bytes = uploaded_file.read()

        if not image_bytes:
            return jsonify({
                "success": False,
                "message": "Frame contains no data."
            }), 400

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is None:
            return jsonify({
                "success": False,
                "message": "Unable to decode image."
            }), 400

        # Optional for temporary single-institution recognition.
        institution_id = str(
            request.form.get("institutionId", "")
        ).strip()

        faces = detector.detect(frame)
        results = []

        for face in faces:
            student_id, confidence = recognizer.recognize(
                face,
                institution_id=institution_id or None,
                threshold=0.5
            )

            recognized = student_id is not None

            result = {
                "student_id": student_id if recognized else None,
                "recognized": recognized,
                "label": (
                    "Recognized"
                    if recognized
                    else "Unknown Person"
                ),
                "confidence": round(float(confidence), 4)
            }

            if hasattr(face, "bbox") and face.bbox is not None:
                result["bbox"] = np.asarray(
                    face.bbox
                ).astype(int).tolist()

            results.append(result)

        return jsonify({
            "success": True,
            "face_count": len(faces),
            "faces": results
        }), 200

    except Exception:
        app.logger.exception("AI recognition failed")

        return jsonify({
            "success": False,
            "message": "AI processing failed. Check service logs."
        }), 500


# --------------------------------------------------
# STUDENT FACE REGISTRATION
# Institution ID remains required for registration
# --------------------------------------------------

@app.route("/api/ai/register", methods=["POST"])
def register_face():
    try:
        data = request.get_json(silent=True) or {}

        student_id = data.get("studentId")
        student_name = data.get("studentName", "")
        image_data = data.get("image")

        institution_id = str(
            data.get("institutionId", "")
        ).strip()

        if not institution_id:
            return jsonify({
                "success": False,
                "message": (
                    "Institution ID is required for registration."
                )
            }), 400

        class_id = data.get("classId")
        class_name = data.get("className")
        advisor_id = data.get("advisorId")

        if not isinstance(student_id, str):
            return jsonify({
                "success": False,
                "message": "A valid student ID is required."
            }), 400

        student_id = student_id.strip().upper()

        if not re.fullmatch(r"[A-Z0-9_-]{1,50}", student_id):
            return jsonify({
                "success": False,
                "message": "Invalid student ID."
            }), 400

        if not isinstance(student_name, str) or not student_name.strip():
            return jsonify({
                "success": False,
                "message": "Student name is required."
            }), 400

        student_name = student_name.strip()

        if not isinstance(image_data, str) or not image_data:
            return jsonify({
                "success": False,
                "message": "Captured face image is required."
            }), 400

        if image_data.startswith("data:"):
            if "," not in image_data:
                return jsonify({
                    "success": False,
                    "message": "Invalid image data URL."
                }), 400

            header, image_data = image_data.split(",", 1)

            if ";base64" not in header:
                return jsonify({
                    "success": False,
                    "message": "Image must use base64 encoding."
                }), 400

        try:
            image_bytes = base64.b64decode(
                image_data,
                validate=True
            )
        except (binascii.Error, ValueError):
            return jsonify({
                "success": False,
                "message": "Invalid base64 image."
            }), 400

        if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
            return jsonify({
                "success": False,
                "message": "Image must not exceed 5 MB."
            }), 400

        frame = cv2.imdecode(
            np.frombuffer(image_bytes, dtype=np.uint8),
            cv2.IMREAD_COLOR
        )

        if frame is None:
            return jsonify({
                "success": False,
                "message": "Could not decode the image."
            }), 400

        faces = detector.detect(frame)

        if len(faces) != 1:
            return jsonify({
                "success": False,
                "message": (
                    "Exactly one face must be visible. "
                    f"Detected {len(faces)} faces."
                )
            }), 400

        embedding = get_embedding(faces[0])

        if embedding is None:
            return jsonify({
                "success": False,
                "message": "Could not generate face embedding."
            }), 422

        embedding = np.asarray(embedding, dtype=np.float32).reshape(-1)

        if embedding.size == 0 or not np.all(np.isfinite(embedding)):
            return jsonify({
                "success": False,
                "message": "Invalid face embedding."
            }), 422

        embedding_dir = os.path.abspath("data/embeddings")
        student_file = os.path.abspath("data/students/students.json")

        os.makedirs(embedding_dir, exist_ok=True)
        os.makedirs(os.path.dirname(student_file), exist_ok=True)

        embedding_path = os.path.join(
            embedding_dir,
            f"{student_id}.json"
        )

        students = []

        if os.path.isfile(student_file):
            try:
                with open(student_file, "r", encoding="utf-8") as file:
                    students = json.load(file)

                if not isinstance(students, list):
                    raise ValueError("Registry must be a JSON list.")

            except (json.JSONDecodeError, OSError, ValueError) as error:
                return jsonify({
                    "success": False,
                    "message": f"Could not read student registry: {error}"
                }), 500

        existing_student = next(
            (
                student for student in students
                if isinstance(student, dict)
                and str(student.get("student_id", "")).strip().upper()
                == student_id
            ),
            None
        )

        existing_embeddings = []

        if os.path.isfile(embedding_path):
            try:
                with open(embedding_path, "r", encoding="utf-8") as file:
                    saved_data = json.load(file)

                if isinstance(saved_data, dict):
                    saved_institution = str(
                        saved_data.get("institution_id", "")
                    ).strip()

                    if (
                        saved_institution
                        and saved_institution != institution_id
                    ):
                        return jsonify({
                            "success": False,
                            "message": (
                                "This student ID belongs to another "
                                "institution. No changes made."
                            )
                        }), 409

                    raw = saved_data.get("embeddings", [])
                    if isinstance(raw, list):
                        existing_embeddings = raw

                elif isinstance(saved_data, list):
                    existing_embeddings = saved_data

                else:
                    existing_embeddings = [saved_data]

            except (json.JSONDecodeError, OSError):
                return jsonify({
                    "success": False,
                    "message": (
                        "Existing face data is invalid. "
                        "No registration changes were made."
                    )
                }), 500

        # Reject a face that appears to belong to another student
        # in this institution.
        duplicate_threshold = 0.60

        for filename in os.listdir(embedding_dir):
            if not filename.lower().endswith(".json"):
                continue

            registered_id = filename[:-5].strip().upper()

            if registered_id == student_id:
                continue

            path = os.path.join(embedding_dir, filename)

            try:
                with open(path, "r", encoding="utf-8") as file:
                    saved_data = json.load(file)

                if not isinstance(saved_data, dict):
                    continue

                if str(
                    saved_data.get("institution_id", "")
                ).strip() != institution_id:
                    continue

                samples = saved_data.get("embeddings", [])

                if not isinstance(samples, list):
                    continue

                for sample in samples:
                    known = np.asarray(
                        sample, dtype=np.float32
                    ).reshape(-1)

                    if (
                        known.shape != embedding.shape
                        or known.size == 0
                        or not np.all(np.isfinite(known))
                    ):
                        continue

                    denominator = (
                        np.linalg.norm(embedding)
                        * np.linalg.norm(known)
                    )

                    if denominator == 0:
                        continue

                    similarity = float(np.dot(embedding, known) / denominator)

                    if similarity >= duplicate_threshold:
                        return jsonify({
                            "success": False,
                            "duplicate": True,
                            "message": (
                                "This face may already be registered "
                                "under another student ID. "
                                "Registration was rejected."
                            ),
                            "similarity": round(similarity, 4)
                        }), 409

            except (
                json.JSONDecodeError,
                OSError,
                TypeError,
                ValueError
            ):
                app.logger.warning(
                    "Could not validate embedding file: %s",
                    filename
                )

        updated_embeddings = existing_embeddings + [
            embedding.tolist()
        ]

        updated_student = dict(existing_student or {})

        updated_student.update({
            "student_id": student_id,
            "student_name": student_name,
            "institution_id": institution_id,
            "embedding_file": os.path.relpath(
                embedding_path,
                os.getcwd()
            )
        })

        if class_id:
            updated_student["classId"] = class_id

        if class_name:
            updated_student["className"] = class_name

        if advisor_id:
            updated_student["advisorId"] = advisor_id

        updated_students = [
            student for student in students
            if not (
                isinstance(student, dict)
                and str(student.get("student_id", "")).strip().upper()
                == student_id
            )
        ]

        updated_students.append(updated_student)

        embedding_temp = embedding_path + ".tmp"
        student_temp = student_file + ".tmp"

        try:
            with open(embedding_temp, "w", encoding="utf-8") as file:
                json.dump({
                    "student_key": student_id,
                    "student_id": student_id,
                    "institution_id": institution_id,
                    "embeddings": updated_embeddings
                }, file, indent=2)

            with open(student_temp, "w", encoding="utf-8") as file:
                json.dump(updated_students, file, indent=2)

            os.replace(embedding_temp, embedding_path)
            os.replace(student_temp, student_file)

        finally:
            for temporary_path in (embedding_temp, student_temp):
                if os.path.exists(temporary_path):
                    os.remove(temporary_path)

        recognizer.load_embeddings()

        return jsonify({
            "success": True,
            "message": "Student face registered successfully.",
            "student_id": student_id,
            "samples": len(updated_embeddings)
        }), 201

    except Exception:
        app.logger.exception("Face registration failed")

        return jsonify({
            "success": False,
            "message": (
                "Face registration failed. Check the AI service logs."
            )
        }), 500


# --------------------------------------------------
# PERMANENT STUDENT AND FACE DATA DELETION
# --------------------------------------------------

@app.route("/api/ai/students/<student_id>", methods=["DELETE"])
def delete_registered_student(student_id):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,50}", student_id or ""):
        return jsonify({
            "success": False,
            "message": "Invalid student ID."
        }), 400

    student_id = student_id.strip().upper()

    embedding_dir = os.path.abspath("data/embeddings")
    student_file = os.path.abspath("data/students/students.json")
    embedding_path = os.path.join(embedding_dir, f"{student_id}.json")

    try:
        if os.path.isfile(student_file):
            with open(student_file, "r", encoding="utf-8") as file:
                students = json.load(file)
        else:
            students = []

        if not isinstance(students, list):
            return jsonify({
                "success": False,
                "message": "Student registry is invalid."
            }), 500

        registered = any(
            isinstance(student, dict)
            and str(student.get("student_id", "")).strip().upper()
            == student_id
            for student in students
        )

        embedding_exists = os.path.isfile(embedding_path)

        if not registered and not embedding_exists:
            return jsonify({
                "success": False,
                "message": "Student was not found."
            }), 404

        remaining_students = [
            student for student in students
            if not (
                isinstance(student, dict)
                and str(student.get("student_id", "")).strip().upper()
                == student_id
            )
        ]

        os.makedirs(os.path.dirname(student_file), exist_ok=True)
        temporary_file = student_file + ".tmp"

        with open(temporary_file, "w", encoding="utf-8") as file:
            json.dump(remaining_students, file, indent=2)

        os.replace(temporary_file, student_file)

        if embedding_exists:
            os.remove(embedding_path)

        recognizer.load_embeddings()

        return jsonify({
            "success": True,
            "student_id": student_id,
            "message": "Student registry entry and face data deleted."
        }), 200

    except Exception:
        app.logger.exception("Student deletion failed")

        return jsonify({
            "success": False,
            "message": (
                "Student deletion failed. "
                "Check the registry and embedding files."
            )
        }), 500


# --------------------------------------------------
# START FLASK SERVER
# --------------------------------------------------

if __name__ == "__main__":
    print("==============================================")
    print("Flask server starting...")
    print("URL: http://127.0.0.1:8000")
    print("==============================================")

    app.run(
        host="127.0.0.1",
        port=8000,
        debug=False
    )
