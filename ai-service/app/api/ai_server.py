import cv2
import base64
import binascii
import json
import os
import re
import numpy as np
from app.recognition.embedding import get_embedding
from flask import Flask, jsonify, request

from app.detection.face_detector import FaceDetector
from app.recognition.face_recognizer import FaceRecognizer


app = Flask(__name__)


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


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "success": True,
        "message": "SmartClassroom AI service is running.",
        "service": "face-recognition"
    })


@app.route("/api/ai/recognize", methods=["POST"])
def recognize_frame():

    try:

        # ------------------------------------------
        # 1. Check whether frame was received
        # ------------------------------------------

        if "frame" not in request.files:
            return jsonify({
                "success": False,
                "message": "No frame received."
            }), 400

        uploaded_file = request.files["frame"]

        if uploaded_file.filename == "":
            return jsonify({
                "success": False,
                "message": "Empty frame received."
            }), 400

        # ------------------------------------------
        # 2. Read image into memory
        # ------------------------------------------

        image_bytes = uploaded_file.read()

        if not image_bytes:
            return jsonify({
                "success": False,
                "message": "Frame contains no data."
            }), 400

        # ------------------------------------------
        # 3. Convert bytes to OpenCV image
        # ------------------------------------------

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

        # ------------------------------------------
        # 4. Detect faces
        # ------------------------------------------

        faces = detector.detect(frame)

        results = []

        # ------------------------------------------
        # 5. Recognize each detected face
        # ------------------------------------------

        for face in faces:

            student_id, confidence = recognizer.recognize(
                face,
                threshold=0.5
            )

            recognized = student_id is not None

            result = {
                "student_id": student_id if recognized else None,
                "recognized": recognized,
                "confidence": round(
                    float(confidence),
                    4
                )
            }

            # --------------------------------------
            # 6. Add face bounding box
            # --------------------------------------

            if hasattr(face, "bbox") and face.bbox is not None:

                bbox = np.asarray(
                    face.bbox
                ).astype(int).tolist()

                result["bbox"] = bbox

            results.append(result)

        # ------------------------------------------
        # 7. Return recognition results
        # ------------------------------------------

        return jsonify({
            "success": True,
            "face_count": len(faces),
            "faces": results
        })

    except Exception as error:

        print("==============================================")
        print("AI SERVICE ERROR")
        print(error)
        print("==============================================")

        return jsonify({
            "success": False,
            "message": "AI processing failed.",
            "error": str(error)
        }), 500

@app.route("/api/ai/register", methods=["POST"])
def register_face():
    try:
        data = request.get_json(silent=True) or {}

        student_id = data.get("studentId")
        student_name = data.get("studentName", "")
        image_data = data.get("image")

        if not isinstance(student_id, str):
            return jsonify({
                "success": False,
                "message": "A valid student ID is required."
            }), 400

        student_id = student_id.strip().upper()

        if not re.fullmatch(r"[A-Z0-9_-]{1,50}", student_id):
            return jsonify({
                "success": False,
                "message": "Student ID contains invalid characters."
            }), 400

        if not isinstance(image_data, str) or not image_data:
            return jsonify({
                "success": False,
                "message": "Captured image is required."
            }), 400

        if not isinstance(student_name, str):
            student_name = ""

        student_name = student_name.strip()

        # Accept a base64 image or a data URL from the browser.
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
                "message": "Image data is not valid base64."
            }), 400

        if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
            return jsonify({
                "success": False,
                "message": "Image must be between 1 byte and 5 MB."
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
                "message": "The uploaded image could not be decoded."
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
                "message": "Could not generate a face embedding."
            }), 422

        embedding = np.asarray(
            embedding,
            dtype=np.float32
        )

        if embedding.size == 0 or not np.all(np.isfinite(embedding)):
            return jsonify({
                "success": False,
                "message": "The generated face embedding is invalid."
            }), 422

        embedding_dir = os.path.abspath("data/embeddings")
        student_file = os.path.abspath("data/students/students.json")

        os.makedirs(embedding_dir, exist_ok=True)
        os.makedirs(os.path.dirname(student_file), exist_ok=True)

        embedding_path = os.path.join(
            embedding_dir,
            f"{student_id}.json"
        )

        # Preserve any existing samples for this student.
        existing_embeddings = []

        if os.path.isfile(embedding_path):
            try:
                with open(embedding_path, "r", encoding="utf-8") as file:
                    existing_data = json.load(file)

                if "embeddings" in existing_data:
                    existing_embeddings = existing_data["embeddings"]
                else:
                    existing_embeddings = [existing_data]

            except (json.JSONDecodeError, OSError):
                return jsonify({
                    "success": False,
                    "message": "Existing embedding file is invalid; no data was changed."
                }), 500

        existing_embeddings.append(embedding.tolist())

        # Save in the format supported by FaceRecognizer.
        with open(embedding_path, "w", encoding="utf-8") as file:
            json.dump({
                "student_id": student_id,
                "embeddings": existing_embeddings
            }, file, indent=2)

        # Update the student registry without removing other students.
        students = []

        if os.path.isfile(student_file):
            try:
                with open(student_file, "r", encoding="utf-8") as file:
                    students = json.load(file)

                if not isinstance(students, list):
                    raise ValueError("Student registry must be a JSON list.")

            except (json.JSONDecodeError, OSError, ValueError) as error:
                return jsonify({
                    "success": False,
                    "message": f"Could not read student registry: {error}"
                }), 500

        students = [
            student for student in students
            if student.get("student_id") != student_id
        ]

        students.append({
            "student_id": student_id,
            "student_name": student_name,
            "embedding_file": os.path.relpath(
                embedding_path,
                os.getcwd()
            )
        })

        with open(student_file, "w", encoding="utf-8") as file:
            json.dump(students, file, indent=2)

        # Make the newly saved face available immediately.
        recognizer.load_embeddings()

        return jsonify({
            "success": True,
            "message": "Student face registered successfully.",
            "student_id": student_id,
            "samples": len(existing_embeddings)
        }), 201

    except Exception as error:
        app.logger.exception("Face registration failed")
        return jsonify({
            "success": False,
            "message": "Face registration failed.",
            "error": str(error)
        }), 500

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