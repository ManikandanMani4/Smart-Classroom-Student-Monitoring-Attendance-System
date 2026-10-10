import cv2
import numpy as np

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