
import { useEffect, useMemo, useRef, useState } from "react";
import "./AdvisorStudents.css";

const STUDENTS_KEY = "smartclassroom_students";
const ATTENDANCE_KEY = "smartclassroom_attendance";

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStudentId(s) {
  return String(
    s?.studentId || s?.student_id || s?.studentIdNumber ||
    s?.rollNumber || s?.registerNumber || s?.id || ""
  ).trim();
}

function getRecordStudentId(r) {
  return String(
    r?.studentId || r?.student_id || r?.studentIdNumber ||
    r?.rollNumber || r?.registerNumber || ""
  ).trim();
}

function getRecordDate(r) {
  return String(r?.date || r?.attendanceDate || r?.createdAt || "").slice(0, 10);
}

function getName(s) {
  return s?.name || s?.studentName || s?.fullName || "Unknown student";
}

function notifyUpdate() {
  window.dispatchEvent(new Event("smartclassroom:dataUpdated"));
}

export default function AdvisorStudents() {
  // All hooks must stay inside the component.
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [students, setStudents] = useState(() => readArray(STUDENTS_KEY));
  const [attendance, setAttendance] = useState(() => readArray(ATTENDANCE_KEY));
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedFace, setCapturedFace] = useState(null);
  const [faceMessage, setFaceMessage] = useState("");
  const [faceRegistering, setFaceRegistering] = useState(false);

  const [form, setForm] = useState({
    studentId: "",
    name: "",
    email: "",
    department: "Information Technology",
    year: "III",
    section: "A",
  });

  useEffect(() => {
    function reload() {
      setStudents(readArray(STUDENTS_KEY));
      setAttendance(readArray(ATTENDANCE_KEY));
    }

    window.addEventListener("storage", reload);
    window.addEventListener("focus", reload);
    window.addEventListener("smartclassroom:dataUpdated", reload);

    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("smartclassroom:dataUpdated", reload);
    };
  }, []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        setFaceMessage("Unable to start camera preview.");
      });
    }
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function saveData(nextStudents, nextAttendance) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(nextStudents));
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(nextAttendance));
    setStudents(nextStudents);
    setAttendance(nextAttendance);
    notifyUpdate();
  }

  async function openCamera() {
    setFaceMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setFaceMessage("Camera unavailable. Use localhost or HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
      setCapturedFace(null);
    } catch {
      setFaceMessage("Camera permission denied or camera is unavailable.");
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function captureFace() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth) {
      setFaceMessage("Wait until the camera preview is ready.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setCapturedFace(canvas.toDataURL("image/jpeg", 0.9));
    setFaceMessage("Photo captured. Register it after entering the Student ID.");
    closeCamera();
  }

  function changeForm(event) {
    setForm((old) => ({
      ...old,
      [event.target.name]: event.target.value,
    }));
  }

  async function registerFace(studentId) {
    if (!studentId.trim()) {
      setFaceMessage("Enter the Student ID first.");
      return false;
    }

    if (!capturedFace) {
      setFaceMessage("Capture a photo first.");
      return false;
    }

    setFaceRegistering(true);
    setFaceMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/ai/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  studentId,
  studentName: form.name.trim(),
  image: capturedFace,
}),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Face registration failed.");
      }

      setFaceMessage("Face registered successfully.");
      return true;
    } catch (e) {
      setFaceMessage(
        e.message ||
        "Registration failed. Check the backend and registration endpoint."
      );
      return false;
    } finally {
      setFaceRegistering(false);
    }
  }

  async function addStudent(event) {
    event.preventDefault();
    setError("");

    const id = form.studentId.trim();
    const name = form.name.trim();

    if (!id || !name) {
      setError("Student ID and name are required.");
      return;
    }

    if (students.some((s) => getStudentId(s).toLowerCase() === id.toLowerCase())) {
      setError("This Student ID already exists.");
      return;
    }

    // Require face registration before adding the student.
    if (!capturedFace) {
      setError("Capture the student's face before saving.");
      return;
    }

    const registered = await registerFace(id);
    if (!registered) return;

    const newStudent = {
      id,
      studentId: id,
      name,
      email: form.email.trim(),
      department: form.department.trim(),
      year: form.year,
      section: form.section.trim(),
      className: `${form.year} IT - ${form.section.trim()}`,
    };

    saveData([...students, newStudent], attendance);

    setForm({
      studentId: "",
      name: "",
      email: "",
      department: "Information Technology",
      year: "III",
      section: "A",
    });

    setCapturedFace(null);
    setFaceMessage("");
    setShowForm(false);
  }

  function deleteStudent(id) {
    if (!window.confirm(`Delete student ${id} and all attendance history?`)) {
      return;
    }

    const nextStudents = students.filter((s) => getStudentId(s) !== String(id));
    const nextAttendance = attendance.filter(
      (r) => getRecordStudentId(r) !== String(id)
    );

    saveData(nextStudents, nextAttendance);
  }

  function deleteAttendance(record) {
    if (!window.confirm("Delete this attendance record permanently?")) return;

    const nextAttendance = attendance.filter((r) => {
      if (record.id != null && r.id != null) return r.id !== record.id;
      return r !== record;
    });

    saveData(students, nextAttendance);
  }

  function markPresent(student) {
    const id = getStudentId(student);

    const exists = attendance.some(
      (r) =>
        getRecordStudentId(r) === id &&
        getRecordDate(r) === selectedDate &&
        String(r.status).toLowerCase() === "present"
    );

    if (exists) {
      window.alert("This student is already marked present on this date.");
      return;
    }

    saveData(students, [
      ...attendance,
      {
        id: `${id}-${selectedDate}-${Date.now()}`,
        studentId: id,
        studentName: getName(student),
        date: selectedDate,
        time: new Date().toLocaleTimeString(),
        status: "Present",
        source: "Manual demo",
      },
    ]);
  }

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) =>
      [getStudentId(s), getName(s), s.email, s.department, s.className]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [students, search]);

  const selectedAttendance = useMemo(
    () => attendance.filter((r) => getRecordDate(r) === selectedDate),
    [attendance, selectedDate]
  );

  return (
    <div className="advisor-students-page">
      <div className="students-toolbar">
        <div>
          <h2>Manage students</h2>
          <p>Add students, register their faces, and manage attendance.</p>
        </div>

        <button
          className="students-button students-button-primary"
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setError("");
          }}
        >
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {showForm && (
        <section className="students-card">
          <h2>Add student</h2>

          <form onSubmit={addStudent}>
            <div className="students-form-grid">
              <label>
                Student ID *
                <input
                  name="studentId"
                  value={form.studentId}
                  onChange={changeForm}
                  required
                />
              </label>

              <label>
                Full name *
                <input
                  name="name"
                  value={form.name}
                  onChange={changeForm}
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={changeForm}
                />
              </label>

              <label>
                Department
                <input
                  name="department"
                  value={form.department}
                  onChange={changeForm}
                />
              </label>

              <label>
                Year
                <select name="year" value={form.year} onChange={changeForm}>
                  <option value="I">I Year</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                  <option value="IV">IV Year</option>
                </select>
              </label>

              <label>
                Section
                <input
                  name="section"
                  value={form.section}
                  onChange={changeForm}
                  required
                />
              </label>
            </div>

            <div className="face-registration">
              <h3>Student face registration</h3>
              <p>Capture a clear, front-facing image with the student's consent.</p>

              {cameraOpen && (
                <div className="face-camera">
                  <video ref={videoRef} autoPlay muted playsInline />

                  <div className="face-camera-actions">
                    <button
                      className="students-button students-button-primary"
                      type="button"
                      onClick={captureFace}
                    >
                      Capture photo
                    </button>

                    <button
                      className="students-button students-button-secondary"
                      type="button"
                      onClick={closeCamera}
                    >
                      Close camera
                    </button>
                  </div>
                </div>
              )}

              {capturedFace && (
                <div className="face-captured">
                  <img src={capturedFace} alt="Captured student face" />

                  <button
                    className="students-button students-button-secondary"
                    type="button"
                    onClick={openCamera}
                  >
                    Retake photo
                  </button>
                </div>
              )}

              {!cameraOpen && !capturedFace && (
                <button
                  className="students-button students-button-primary"
                  type="button"
                  onClick={openCamera}
                >
                  Open camera
                </button>
              )}

              {faceMessage && <p className="face-message">{faceMessage}</p>}

              <canvas ref={canvasRef} hidden />
            </div>

            {error && <p className="students-error">{error}</p>}

            <div className="students-form-actions">
              <button
                className="students-button students-button-secondary"
                type="button"
                onClick={() => {
                  closeCamera();
                  setShowForm(false);
                  setCapturedFace(null);
                  setError("");
                  setFaceMessage("");
                }}
              >
                Cancel
              </button>

              <button
                className="students-button students-button-primary"
                type="submit"
                disabled={faceRegistering}
              >
                {faceRegistering ? "Registering face..." : "Register face & save"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="students-card">
        <div className="students-list-heading">
          <div>
            <h2>Student list</h2>
            <p>{students.length} students registered in this browser</p>
          </div>

          <input
            className="students-search"
            type="search"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredStudents.length === 0 ? (
          <div className="students-empty">
            <h3>No students found</h3>
            <p>Add a student or change your search.</p>
          </div>
        ) : (
          <div className="students-table-wrap">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={getStudentId(s) || i}>
                    <td className="students-id">{getStudentId(s)}</td>
                    <td>{getName(s)}</td>
                    <td>{s.email || "—"}</td>
                    <td>{s.className || s.class || "—"}</td>
                    <td>
                      <div className="students-row-actions">
                       

                        <button
                          type="button"
                          className="students-button students-button-danger"
                          onClick={() => deleteStudent(getStudentId(s))}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

     
    </div>
  );
}
