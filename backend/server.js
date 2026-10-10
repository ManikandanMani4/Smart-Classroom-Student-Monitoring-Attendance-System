
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = 5000;
const AI_URL = "http://127.0.0.1:8000/api/ai/recognize";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Keep uploaded frames in memory, not on disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SmartClassroom backend is running.",
  });
});

// Receive a React camera frame and forward it to Python.
app.post(
  "/api/classroom/frame",
  upload.single("frame"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No frame received.",
        });
      }

      console.log(
        "Frame received:",
        req.file.size,
        "bytes"
      );

      const formData = new FormData();
      const imageBlob = new Blob([req.file.buffer], {
        type: req.file.mimetype || "image/jpeg",
      });

      formData.append(
        "frame",
        imageBlob,
        req.file.originalname || "classroom-frame.jpg"
      );

      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      let result;

      try {
        result = await aiResponse.json();
      } catch {
        result = {
          success: false,
          message: "Invalid response from AI service.",
        };
      }

      if (!aiResponse.ok) {
        return res.status(aiResponse.status).json(result);
      }

      console.log("AI recognition results:");

for (const face of result.faces || []) {
  console.log({
    student_id: face.student_id,
    recognized: face.recognized,
    confidence: face.confidence,
  });
}

      return res.json(result);
    } catch (error) {
      console.error("Frame processing error:", error.message);

      return res.status(502).json({
        success: false,
        message:
          "Could not process the frame. Check that the Python AI service is running.",
      });
    }
  }
);

app.listen(PORT, () => {
  console.log("======================================");
  console.log("SmartClassroom Backend");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`AI service: http://127.0.0.1:8000`);
  console.log("Frame storage: In memory");
  console.log("======================================");
});
