import cv2

from app.detection.face_detector import FaceDetector
from app.recognition.embedding import get_embedding


detector = FaceDetector()

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    print("Could not open camera")
    exit()

print("Camera started.")
print("Press Q to quit.")

embedding_created = False

while True:
    ret, frame = camera.read()

    if not ret:
        print("Could not read frame")
        break

    faces = detector.detect(frame)

    for face in faces:
        x1, y1, x2, y2 = map(int, face.bbox)

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        embedding = get_embedding(face)

        if embedding is not None:
            cv2.putText(
                frame,
                "Embedding Generated",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

            if not embedding_created:
                print("Embedding generated successfully!")
                print("Embedding size:", embedding.shape)
                print("Embedding type:", embedding.dtype)
                embedding_created = True

    cv2.imshow("Smart Classroom - Face Embedding", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()