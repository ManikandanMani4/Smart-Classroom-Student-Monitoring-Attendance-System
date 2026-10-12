
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

const AI_URL = "http://127.0.0.1:8000/api/ai/recognize";
const REGISTER_URL = "http://127.0.0.1:8000/api/ai/register";
const AI_DELETE_URL = "http://127.0.0.1:8000/api/ai/students";

const AI_SERVICE_DIR = path.resolve(__dirname, "../ai-service");

const STUDENTS_FILE = path.join(
  AI_SERVICE_DIR,
  "data",
  "students",
  "students.json"
);

const ATTENDANCE_DIR = path.join(
  __dirname,
  "data",
  "attendance"
);

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// --------------------------------------------------
// FILE HELPERS
// --------------------------------------------------

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function attendanceFile(date) {
  return path.join(ATTENDANCE_DIR, `${date}.json`);
}

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), {
    recursive: true
  });

  const temporaryPath = `${filePath}.tmp`;

  await fs.promises.writeFile(
    temporaryPath,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  await fs.promises.rename(temporaryPath, filePath);
}

async function getStudents() {
  const students = await readJsonFile(STUDENTS_FILE, []);

  if (!Array.isArray(students)) {
    throw new Error("Student registry must contain a JSON array.");
  }

  return students;
}

async function getAttendanceRecords(date) {
  const records = await readJsonFile(attendanceFile(date), []);

  if (!Array.isArray(records)) {
    throw new Error("Attendance file must contain a JSON array.");
  }

  return records;
}

// --------------------------------------------------
// AUTOMATIC ATTENDANCE RECORDING
// --------------------------------------------------

async function recordRecognizedFaces(faces) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const recognizedIds = [
    ...new Set(
      faces
        .filter(
          (face) =>
            face.recognized === true &&
            typeof face.student_id === "string" &&
            face.student_id.trim()
        )
        .map((face) => face.student_id.trim().toUpperCase())
    )
  ];

  if (recognizedIds.length === 0) {
    return;
  }

  const students = await getStudents();

  const studentMap = new Map(
    students.map((student) => [
      String(student.student_id || "").trim().toUpperCase(),
      student
    ])
  );

  const records = await getAttendanceRecords(date);
  let changed = false;

  for (const studentId of recognizedIds) {
    const student = studentMap.get(studentId);

    // Never create attendance for an unregistered student.
    if (!student) {
      console.warn("Recognized ID not in student registry:", studentId);
      continue;
    }

    // One attendance entry per student per date.
    if (
      records.some(
        (record) =>
          String(record.studentId).trim().toUpperCase() === studentId
      )
    ) {
      continue;
    }

    records.push({
      id: `${date}-${studentId}`,
      studentId,
      studentName: student.student_name || "",
      subject: "",
      period: "",
      timestamp: now.toISOString(),
      status: "Present"
    });

    changed = true;
    console.log("Attendance recorded:", studentId);
  }

  if (changed) {
    await writeJsonFile(attendanceFile(date), records);
  }
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SmartClassroom backend is running."
  });
});

// --------------------------------------------------
// CLASSROOM FRAME RECOGNITION
// --------------------------------------------------

app.post(
  "/api/classroom/frame",
  upload.single("frame"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No frame received."
        });
      }

      const formData = new FormData();

      formData.append(
        "frame",
        new Blob([req.file.buffer], {
          type: req.file.mimetype || "image/jpeg"
        }),
        req.file.originalname || "classroom-frame.jpg"
      );

      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000)
      });

      const result = await aiResponse.json().catch(() => null);

      if (!result) {
        return res.status(502).json({
          success: false,
          message: "Python AI service returned an invalid response."
        });
      }

      if (!aiResponse.ok) {
        return res.status(aiResponse.status).json(result);
      }

      if (result.success && Array.isArray(result.faces)) {
        try {
          await recordRecognizedFaces(result.faces);
        } catch (error) {
          console.error("Attendance storage error:", error.message);

          return res.status(500).json({
            success: false,
            message: "Faces were recognized, but attendance could not be saved."
          });
        }
      }

      return res.json(result);
    } catch (error) {
      console.error("Frame processing error:", error.message);

      return res.status(502).json({
        success: false,
        message: "Could not reach the Python AI service."
      });
    }
  }
);

// --------------------------------------------------
// STUDENT FACE REGISTRATION
// --------------------------------------------------

app.post("/api/ai/register", async (req, res) => {
  try {
    const { studentId, studentName, image } = req.body || {};

    if (
      typeof studentId !== "string" ||
      !studentId.trim() ||
      typeof image !== "string" ||
      !image.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Student ID and captured image are required."
      });
    }

    const aiResponse = await fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: studentId.trim(),
        studentName:
          typeof studentName === "string" ? studentName.trim() : "",
        image
      }),
      signal: AbortSignal.timeout(30000)
    });

    const result = await aiResponse.json().catch(() => null);

    if (!result) {
      return res.status(502).json({
        success: false,
        message: "Python AI service returned an invalid response."
      });
    }

    return res.status(aiResponse.status).json(result);
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Could not reach the Python AI service."
    });
  }
});

// --------------------------------------------------
// PERMANENT STUDENT DELETION
// --------------------------------------------------

app.delete("/api/students/:studentId", async (req, res) => {
  const studentId = String(req.params.studentId || "").trim().toUpperCase();

  if (!/^[A-Z0-9_-]{1,50}$/.test(studentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID."
    });
  }

  try {
    const students = await getStudents();

    const studentExists = students.some(
      (student) =>
        String(student.student_id || "").trim().toUpperCase() === studentId
    );

    const embeddingPath = path.join(
      AI_SERVICE_DIR,
      "data",
      "embeddings",
      `${studentId}.json`
    );

    const embeddingExists = fs.existsSync(embeddingPath);

    if (!studentExists && !embeddingExists) {
      return res.status(404).json({
        success: false,
        message: "Student was not found."
      });
    }

    // First delete the AI registry entry and face embedding.
    const aiResponse = await fetch(
      `${AI_DELETE_URL}/${encodeURIComponent(studentId)}`,
      {
        method: "DELETE",
        signal: AbortSignal.timeout(30000)
      }
    );

    const aiResult = await aiResponse.json().catch(() => null);

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({
        success: false,
        message:
          aiResult?.message ||
          "AI service could not delete the student's face data."
      });
    }

    // Remove the student's attendance from every dated attendance file.
    await fs.promises.mkdir(ATTENDANCE_DIR, { recursive: true });

    const files = await fs.promises.readdir(ATTENDANCE_DIR);
    let deletedAttendanceRecords = 0;

    for (const filename of files) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(filename)) {
        continue;
      }

      const filePath = path.join(ATTENDANCE_DIR, filename);
      const records = await readJsonFile(filePath, []);

      if (!Array.isArray(records)) {
        throw new Error(`Invalid attendance file: ${filename}`);
      }

      const filteredRecords = records.filter((record) => {
        const matches =
          String(record.studentId || "").trim().toUpperCase() === studentId;

        if (matches) {
          deletedAttendanceRecords++;
        }

        return !matches;
      });

      if (filteredRecords.length !== records.length) {
        await writeJsonFile(filePath, filteredRecords);
      }
    }

    console.log(
      `Permanently deleted student ${studentId}; removed ${deletedAttendanceRecords} attendance record(s).`
    );

    return res.json({
      success: true,
      studentId,
      deletedAttendanceRecords,
      message: "Student face data and attendance history deleted."
    });
  } catch (error) {
    console.error("Permanent student deletion error:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "Student deletion was incomplete. Check the backend and AI service logs."
    });
  }
});

// --------------------------------------------------
// GET ATTENDANCE FOR A DATE
// --------------------------------------------------

app.get("/api/attendance", async (req, res) => {
  try {
    const date = req.query.date;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format."
      });
    }

    const [students, records] = await Promise.all([
      getStudents(),
      getAttendanceRecords(date)
    ]);

    const presentIds = new Set(
      records
        .filter((record) => record.status === "Present")
        .map((record) => String(record.studentId).toUpperCase())
    );

    const absentCount = Math.max(
      0,
      students.filter(
        (student) =>
          !presentIds.has(
            String(student.student_id || "").toUpperCase()
          )
      ).length
    );

    return res.json({
      success: true,
      date,
      totalStudents: students.length,
      presentCount: presentIds.size,
      absentCount,
      classroomStatus: "Check classroom service",
      activePeriod: "Not configured",
      records: records.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )
    });
  } catch (error) {
    console.error("Get attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load attendance records."
    });
  }
});

// --------------------------------------------------
// DELETE ATTENDANCE HISTORY FOR A DATE
// --------------------------------------------------

app.delete("/api/attendance/history", async (req, res) => {
  try {
    const date = req.query.date;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format."
      });
    }

    const filePath = attendanceFile(date);

    await fs.promises.mkdir(ATTENDANCE_DIR, {
      recursive: true
    });

    await fs.promises.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });

    return res.json({
      success: true,
      message: `Attendance history for ${date} deleted.`
    });
  } catch (error) {
    console.error("Delete attendance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not delete attendance history."
    });
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log("======================================");
  console.log("SmartClassroom Backend");
  console.log(`Server: http://localhost:${PORT}`);
  console.log("AI service: http://127.0.0.1:8000");
  console.log("Attendance API: /api/attendance");
  console.log("Frame recognition: /api/classroom/frame");
  console.log("Face registration: /api/ai/register");
  console.log("Student deletion: /api/students/:studentId");
  console.log("======================================");
});
