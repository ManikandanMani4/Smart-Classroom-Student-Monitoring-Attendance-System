import numpy as np


class LivenessDetector:

    def __init__(self):
        self.previous_ear = None
        self.blink_detected = False

    def eye_aspect_ratio(self, eye):

        # Vertical distances
        A = np.linalg.norm(eye[1] - eye[5])
        B = np.linalg.norm(eye[2] - eye[4])

        # Horizontal distance
        C = np.linalg.norm(eye[0] - eye[3])

        if C == 0:
            return 0.0

        return (A + B) / (2.0 * C)

    def check_blink(self, landmarks):

        # This requires detailed eye landmarks.
        # InsightFace's 5-point landmarks are not enough
        # for reliable EAR-based blink detection.

        return False