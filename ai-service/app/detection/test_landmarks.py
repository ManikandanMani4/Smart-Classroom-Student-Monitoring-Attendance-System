import cv2

from app.detection.face_detector import FaceDetector


detector = FaceDetector()

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    print("Could not open camera")
    exit()

print("Camera started.")
print("Press Q to quit.")

while True:

    ret, frame = camera.read()

    if not ret:
        break

    faces = detector.detect(frame)

    for face in faces:

        print("Landmark shape:", face.kps.shape)
        print("Landmarks:")
        print(face.kps)

        x1, y1, x2, y2 = map(int, face.bbox)

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

    cv2.imshow("Landmark Test", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()