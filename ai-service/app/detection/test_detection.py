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
        print("Could not read frame")
        break

    faces = detector.detect(frame)

    for face in faces:

        # -----------------------------
        # Full face bounding box
        # -----------------------------
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
            "Face",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

        # -----------------------------
        # Facial landmarks
        # -----------------------------
        landmarks = face.kps

        if landmarks is not None:

            # InsightFace landmark order:
            # 0 = left eye
            # 1 = right eye
            # 2 = nose
            # 3 = left mouth
            # 4 = right mouth

            left_eye = landmarks[0]
            right_eye = landmarks[1]

            left_x, left_y = map(int, left_eye)
            right_x, right_y = map(int, right_eye)

            # -----------------------------
            # Draw eye landmark points
            # -----------------------------
            cv2.circle(
                frame,
                (left_x, left_y),
                6,
                (255, 0, 0),
                -1
            )

            cv2.circle(
                frame,
                (right_x, right_y),
                6,
                (255, 0, 0),
                -1
            )

            # -----------------------------
            # Create eye region
            # -----------------------------
            eye_width = abs(right_x - left_x)

            padding_x = int(eye_width * 0.35)
            padding_y = int(eye_width * 0.25)

            eye_x1 = max(
                0,
                min(left_x, right_x) - padding_x
            )

            eye_x2 = min(
                frame.shape[1],
                max(left_x, right_x) + padding_x
            )

            eye_y1 = max(
                0,
                min(left_y, right_y) - padding_y
            )

            eye_y2 = min(
                frame.shape[0],
                max(left_y, right_y) + padding_y
            )

            # -----------------------------
            # Draw eye-region rectangle
            # -----------------------------
            cv2.rectangle(
                frame,
                (eye_x1, eye_y1),
                (eye_x2, eye_y2),
                (255, 0, 0),
                2
            )

            cv2.putText(
                frame,
                "Eye Region",
                (eye_x1, eye_y1 - 8),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                2
            )

    cv2.imshow(
        "Smart Classroom - Face + Eye Detection",
        frame
    )

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


camera.release()
cv2.destroyAllWindows()