const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccount = require(
  path.resolve(
    __dirname,
    "../firebase-credentials/serviceAccountKey.json"
  )
);

admin.initializeApp({
  credential: admin.cert(serviceAccount),
});

const db = require("firebase-admin/firestore").getFirestore();

console.log("Firebase Admin initialized successfully.");

const app = express();
const PORT = 5000;

app.get("/api/test-firestore", async (req, res) => {
  try {
    await db.collection("system_checks").doc("backend_connection").set({
      status: "connected",
      checkedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Firestore read/write connection successful.",
    });
  } catch (error) {
    console.error("Firestore test failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Firestore connection failed.",
    });
  }
});

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

const ALERTS_DIR = path.join(__dirname, "data", "alerts");
const ALERTS_FILE = path.join(ALERTS_DIR, "alerts.json");

const UNKNOWN_ALERT_COOLDOWN_MS = 60 * 1000;
const WRONG_CLASS_ALERT_COOLDOWN_MS = 60 * 1000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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
    recursive: true,
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

async function getAlerts() {
  const alerts = await readJsonFile(ALERTS_FILE, []);

  if (!Array.isArray(alerts)) {
    throw new Error("Alert file must contain a JSON array.");
  }

  return alerts;
}

async function saveAlerts(alerts) {
  await writeJsonFile(ALERTS_FILE, alerts);
}

async function createClassroomAlert({
  type,
  title,
  classId,
  className,
  advisorId,
  location,
  severity = "high",
  cooldownMs = UNKNOWN_ALERT_COOLDOWN_MS,
  studentId = null,
  studentName = "",
  registeredClassId = "",
  registeredClassName = "",
  detectedClassId = "",
  detectedClassName = "",
}) {
  const alerts = await getAlerts();
  const now = Date.now();

  const duplicate = alerts.some((alert) => {
    if (
      alert.type !== type ||
      String(alert.classId || "") !== String(classId || "") ||
      String(alert.advisorId || "") !== String(advisorId || "") ||
      alert.status === "dismissed"
    ) {
      return false;
    }

    if (
      type === "WRONG_CLASSROOM_DETECTED" &&
      String(alert.studentId || "") !== String(studentId || "")
    ) {
      return false;
    }

    const createdAt = new Date(alert.createdAt).getTime();

    return (
      Number.isFinite(createdAt) &&
      now - createdAt < cooldownMs
    );
  });

  if (duplicate) {
    return null;
  }

  const alert = {
    id: `alert_${now}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    title,
    classId: String(classId || ""),
    className: String(className || ""),
    advisorId: String(advisorId || ""),
    location: String(location || className || "Unknown classroom"),
    severity,
    status: "unread",
    studentId,
    studentName,
    registeredClassId,
    registeredClassName,
    detectedClassId,
    detectedClassName,
    createdAt: new Date(now).toISOString(),
  };

  alerts.unshift(alert);
  await saveAlerts(alerts);

  console.log("Classroom alert created:", title);

  return alert;
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
    ),
  ];

  if (recognizedIds.length === 0) {
    return;
  }

  const students = await getStudents();

  const studentMap = new Map(
    students.map((student) => [
      String(student.student_id || "").trim().toUpperCase(),
      student,
    ])
  );

  const records = await getAttendanceRecords(date);
  let changed = false;

  for (const studentId of recognizedIds) {
    const student = studentMap.get(studentId);

    if (!student) {
      console.warn("Recognized ID not in student registry:", studentId);
      continue;
    }

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
      status: "Present",
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
    message: "SmartClassroom backend is running.",
  });
});
// --------------------------------------------------
// ATTENDANCE ROUTES
// --------------------------------------------------

app.get("/api/attendance", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "A valid date in YYYY-MM-DD format is required.",
      });
    }

    const records = await getAttendanceRecords(date);

    return res.json({
      success: true,
      date,
      records,
    });
  } catch (error) {
    console.error("Attendance retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance records.",
    });
  }
});

// --------------------------------------------------
// STUDENT FACE REGISTRATION
// Accept JSON image data from React and forward it to Python
// --------------------------------------------------

app.post("/api/ai/register", async (req, res) => {
  try {
    const {
      institutionId,
      studentId,
      studentName,
      image,
      classId,
      className,
      advisorId,
    } = req.body || {};

    // Validate captured image
    if (
      typeof image !== "string" ||
      !image.startsWith("data:image/")
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid student face image is required.",
      });
    }

    if (!String(institutionId || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Institution ID is required for student registration.",
      });
    }

    if (!String(studentId || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required.",
      });
    }

    if (!String(studentName || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Student name is required.",
      });
    }

    // Prepare JSON payload for Python
    const payload = {
      institutionId: String(institutionId).trim(),
      studentId: String(studentId).trim().toUpperCase(),
      studentName: String(studentName).trim(),
      image,
      classId: String(classId || ""),
      className: String(className || ""),
      advisorId: String(advisorId || ""),
    };

    console.log(
      "[Face registration] Image received:",
      Boolean(image)
    );

    console.log(
      "[Face registration] Image length:",
      image.length
    );

    console.log(
      "[Face registration] Student ID:",
      payload.studentId
    );

    // Forward JSON to Python AI service
    const aiResponse = await fetch(REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await aiResponse.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(
        "AI registration service returned non-JSON:",
        responseText.slice(0, 500)
      );

      return res.status(502).json({
        success: false,
        message: "The AI registration service returned invalid JSON.",
      });
    }

    if (!aiResponse.ok) {
      console.error("AI registration failed:", result);
    }

    return res.status(aiResponse.status).json(result);

  } catch (error) {
    console.error("Student registration failed:", error);

    return res.status(500).json({
      success: false,
      message: "Student registration failed.",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// ALERT ROUTES
// --------------------------------------------------

app.get("/api/alerts", async (req, res) => {
  try {
    const { advisorId, classId, status } = req.query;
    let alerts = await getAlerts();

    if (advisorId) {
      alerts = alerts.filter(
        (alert) => String(alert.advisorId || "") === String(advisorId)
      );
    }

    if (classId) {
      alerts = alerts.filter(
        (alert) => String(alert.classId || "") === String(classId)
      );
    }

    if (status) {
      alerts = alerts.filter(
        (alert) => String(alert.status || "") === String(status)
      );
    }

    return res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("Alert retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve alerts.",
    });
  }
});

app.patch("/api/alerts/:id", async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowedStatuses = ["unread", "read", "resolved", "dismissed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert status.",
      });
    }

    const alerts = await getAlerts();
    const index = alerts.findIndex(
      (alert) => String(alert.id) === String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
    }

    alerts[index] = {
      ...alerts[index],
      status,
      updatedAt: new Date().toISOString(),
    };

    await saveAlerts(alerts);

    return res.json({
      success: true,
      message: "Alert updated successfully.",
      alert: alerts[index],
    });
  } catch (error) {
    console.error("Alert update failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update alert.",
    });
  }
});

// --------------------------------------------------
// CLASSROOM RECOGNITION
// --------------------------------------------------

app.post(
  "/api/classroom/frame",
  upload.single("frame"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "A camera frame is required.",
        });
      }

      // institutionId is optional temporarily.
      const institutionId = String(
        req.body.institutionId || ""
      ).trim();

      const classId = String(req.body.classId || "").trim();
      const className = String(req.body.className || "").trim();
      const advisorId = String(req.body.advisorId || "").trim();

      if (!classId || !advisorId) {
        return res.status(400).json({
          success: false,
          message: "Class ID and advisor ID are required.",
        });
      }

      const formData = new FormData();

      formData.append(
        "frame",
        new Blob([req.file.buffer], {
          type: req.file.mimetype || "image/jpeg",
        }),
        req.file.originalname || "frame.jpg"
      );

      if (institutionId) {
        formData.append("institutionId", institutionId);
      }

      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        body: formData,
      });

      const responseText = await aiResponse.text();
      let aiResult;

      try {
        aiResult = JSON.parse(responseText);
      } catch {
        console.error("AI service returned non-JSON:", responseText);

        return res.status(502).json({
          success: false,
          message: "The AI service returned an invalid response.",
        });
      }

      if (!aiResponse.ok) {
        console.error("AI recognition failed:", aiResult);

        return res.status(aiResponse.status).json({
          success: false,
          message:
            aiResult.message ||
            aiResult.detail ||
            "Face recognition failed.",
        });
      }

      const faces = Array.isArray(aiResult.faces)
        ? aiResult.faces
        : [];

      const students = await getStudents();
      const studentMap = new Map(
        students.map((student) => [
          String(
            student.student_id || student.studentId || ""
          ).trim().toUpperCase(),
          student,
        ])
      );

      const allowedFaces = [];

      for (const face of faces) {
        const studentId = String(
          face.student_id || face.studentId || ""
        ).trim().toUpperCase();

        const isRecognized =
          face.recognized === true &&
          Boolean(studentId) &&
          !face.is_unknown;

        if (!isRecognized) {
          face.recognized = false;
          face.student_name = "Unknown Person";
          face.student_id = null;

          await createClassroomAlert({
            type: "UNKNOWN_PERSON_DETECTED",
            title: "Unknown Person Detected",
            classId,
            className,
            advisorId,
            location: className || classId,
            severity: "high",
            cooldownMs: UNKNOWN_ALERT_COOLDOWN_MS,
          });

          continue;
        }

        const student = studentMap.get(studentId);

        if (!student) {
          face.recognized = false;
          face.student_name = "Unknown Person";
          face.student_id = null;

          await createClassroomAlert({
            type: "UNKNOWN_PERSON_DETECTED",
            title: "Unknown Person Detected",
            classId,
            className,
            advisorId,
            location: className || classId,
            severity: "high",
            cooldownMs: UNKNOWN_ALERT_COOLDOWN_MS,
          });

          continue;
        }

        const registeredClassId = String(
          student.classId || student.class_id || ""
        ).trim();

        const registeredClassName = String(
          student.className || student.class_name || ""
        ).trim();

        const belongsToClass =
          registeredClassId &&
          registeredClassId.toLowerCase() === classId.toLowerCase();

        if (!belongsToClass) {
          face.recognized = true;
          face.student_id = studentId;
          face.student_name =
            student.student_name ||
            student.studentName ||
            face.student_name ||
            studentId;

          await createClassroomAlert({
            type: "WRONG_CLASSROOM_DETECTED",
            title: "Student Detected in Wrong Classroom",
            classId,
            className,
            advisorId,
            location: className || classId,
            severity: "medium",
            cooldownMs: WRONG_CLASS_ALERT_COOLDOWN_MS,
            studentId,
            studentName: face.student_name,
            registeredClassId,
            registeredClassName,
            detectedClassId: classId,
            detectedClassName: className,
          });

          continue;
        }

        face.recognized = true;
        face.student_id = studentId;
        face.student_name =
          student.student_name ||
          student.studentName ||
          face.student_name ||
          studentId;

        allowedFaces.push(face);
      }

      await recordRecognizedFaces(allowedFaces);

      return res.json({
        success: true,
        message: "Classroom frame processed successfully.",
        faces,
        attendanceRecorded: allowedFaces.length,
      });
    } catch (error) {
      console.error("Classroom frame processing failed:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to process the classroom frame.",
        error: error.message,
      });
    }
  }
);
// --------------------------------------------------
// STUDENT REGISTRATION
// --------------------------------------------------

app.post("/api/ai/register", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A student face image is required.",
      });
    }

    const institutionId = String(
      req.body.institutionId || ""
    ).trim();

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        message: "Institution ID is required for student registration.",
      });
    }

    const formData = new FormData();

    formData.append(
      "image",
      new Blob([req.file.buffer], {
        type: req.file.mimetype || "image/jpeg",
      }),
      req.file.originalname || "student.jpg"
    );

    for (const [key, value] of Object.entries(req.body)) {
      if (key !== "institutionId" && value != null) {
        formData.append(key, String(value));
      }
    }

    formData.append("institutionId", institutionId);

    const aiResponse = await fetch(REGISTER_URL, {
      method: "POST",
      body: formData,
    });

    const responseText = await aiResponse.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        success: false,
        message: "The AI registration service returned invalid JSON.",
      });
    }

    return res.status(aiResponse.status).json(result);
  } catch (error) {
    console.error("Student registration failed:", error);

    return res.status(500).json({
      success: false,
      message: "Student registration failed.",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// STUDENT REGISTRY
// --------------------------------------------------

app.get("/api/students", async (req, res) => {
  try {
    const students = await getStudents();

    return res.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error("Student retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve students.",
    });
  }
});

// --------------------------------------------------
// DELETE STUDENT
// --------------------------------------------------

app.delete("/api/students/:studentId", async (req, res) => {
  try {
    const studentId = String(req.params.studentId || "").trim();

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required.",
      });
    }

    const students = await getStudents();

    const student = students.find(
      (item) =>
        String(item.student_id || item.studentId || "").trim().toUpperCase() ===
        studentId.toUpperCase()
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const institutionId = String(
      req.body?.institutionId || req.query?.institutionId || ""
    ).trim();

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        message: "Institution ID is required to delete a student.",
      });
    }

    const deleteUrl =
      `${AI_DELETE_URL}/${encodeURIComponent(studentId)}` +
      `?institutionId=${encodeURIComponent(institutionId)}`;

    const aiResponse = await fetch(deleteUrl, {
      method: "DELETE",
    });

    const responseText = await aiResponse.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({
        success: false,
        message: result.message || "AI service could not delete the student.",
      });
    }

    return res.json({
      success: true,
      message: "Student deletion request completed.",
      result,
    });
  } catch (error) {
    console.error("Student deletion failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete student.",
      error: error.message,
    });
  }
});
// --------------------------------------------------
// FIRESTORE CLASSROOM ROUTES
// --------------------------------------------------

app.get("/api/classes/:classId", async (req, res) => {
  try {
    const classId = String(req.params.classId || "").trim();

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required.",
      });
    }

    const snapshot = await db
      .collection("classes")
      .doc(classId)
      .get();

    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    return res.json({
      success: true,
      class: {
        id: snapshot.id,
        ...snapshot.data(),
      },
    });
  } catch (error) {
    console.error("Class retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class information.",
    });
  }
});

// --------------------------------------------------
// SERVER START
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`SmartClassroom backend running at http://localhost:${PORT}`);
  console.log(`AI recognition service: ${AI_URL}`);
});