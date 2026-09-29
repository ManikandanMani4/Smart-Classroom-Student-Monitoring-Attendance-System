import cv2

from app.detection.face_detector import FaceDetector
from app.recognition.face_recognizer import FaceRecognizer


detector = FaceDetector()
recognizer = FaceRecognizer()

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    print("Could not open camera")
    exit()

print("Camera started.")
print("Press Q to quit.")

while True:

    ret, frame = camera.read()

    if not ret:
        print("Could not read frame")
        break

    faces = detector.detect(frame)

    for face in faces:

        x1, y1, x2, y2 = map(int, face.bbox)

        student_id, score = recognizer.recognize(face)

        if student_id is not None:
            label = f"{student_id} | {score:.3f}"
        else:
            label = "Unknown"

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            label,
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

    cv2.imshow(
        "Smart Classroom - Face Recognition",
        frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()