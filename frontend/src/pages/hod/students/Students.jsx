import { useEffect, useMemo, useState } from "react";
import "./Students.css";

const STUDENTS_KEY = "smartclassroom_students";

const emptyForm = {
  studentId: "",
  name: "",
  email: "",
  department: "Information Technology",
  year: "I",
  section: "A",
};

function readStudents() {
  try {
    const data = JSON.parse(localStorage.getItem(STUDENTS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function getId(student) {
  return String(
    student.studentId ||
    student.student_id ||
    student.rollNumber ||
    student.registerNumber ||
    student.id ||
    ""
  ).trim();
}

function getName(student) {
  return student.name || student.studentName || student.fullName || "—";
}

function getClass(student) {
  return (
    student.className ||
    student.class ||
    [student.year, student.department?.includes("Information Technology")
      ? "IT"
      : student.department,
    student.section ? `- ${student.section}` : ""]
      .filter(Boolean)
      .join(" ") ||
    "—"
  );
}

export default function Students() {
  const [students, setStudents] = useState(readStudents);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const reload = () => setStudents(readStudents());

    window.addEventListener("storage", reload);
    window.addEventListener("focus", reload);
    window.addEventListener("smartclassroom:dataUpdated", reload);

    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("smartclassroom:dataUpdated", reload);
    };
  }, []);

  function saveStudents(nextStudents) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(nextStudents));
    setStudents(nextStudents);
    window.dispatchEvent(new Event("smartclassroom:dataUpdated"));
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEditForm(student) {
    setForm({
      studentId: getId(student),
      name: getName(student) === "—" ? "" : getName(student),
      email: student.email || "",
      department: student.department || "Information Technology",
      year: String(student.year || "I").replace(/\s*Year$/i, ""),
      section: student.section || "A",
    });

    setEditingId(getId(student));
    setError("");
    setShowForm(true);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const id = form.studentId.trim();
    const name = form.name.trim();

    if (!id || !name) {
      setError("Student ID and full name are required.");
      return;
    }

    const duplicate = students.some((student) => {
      const sameId = getId(student).toLowerCase() === id.toLowerCase();
      const isCurrent = editingId &&
        getId(student).toLowerCase() === editingId.toLowerCase();

      return sameId && !isCurrent;
    });

    if (duplicate) {
      setError("A student with this ID already exists.");
      return;
    }

    const studentData = {
      id,
      studentId: id,
      name,
      email: form.email.trim(),
      department: form.department.trim(),
      year: form.year,
      section: form.section.trim(),
      className: `${form.year} IT - ${form.section.trim()}`,
    };

    let nextStudents;

    if (editingId) {
      nextStudents = students.map((student) =>
        getId(student).toLowerCase() === editingId.toLowerCase()
          ? { ...student, ...studentData }
          : student
      );
    } else {
      nextStudents = [...students, studentData];
    }

    saveStudents(nextStudents);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function deleteStudent(student) {
    const id = getId(student);

    if (!window.confirm(`Delete student ${getName(student)} (${id})?`)) {
      return;
    }

    saveStudents(
      students.filter(
        (item) => getId(item).toLowerCase() !== id.toLowerCase()
      )
    );
  }

  const classes = useMemo(
    () => [...new Set(students.map(getClass).filter((value) => value !== "—"))],
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const searchable = [
        getId(student),
        getName(student),
        student.email,
        student.department,
        getClass(student),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesClass =
        classFilter === "all" || getClass(student) === classFilter;
      const matchesYear =
        yearFilter === "all" ||
        String(student.year || "").replace(/\s*Year$/i, "") === yearFilter;

      return matchesSearch && matchesClass && matchesYear;
    });
  }, [students, search, classFilter, yearFilter]);

  return (
    <main className="hod-students-page">
      <header className="hs-page-header">
        <div>
          <span className="hs-eyebrow">HOD MANAGEMENT</span>
          <h1>Students</h1>
          <p>Manage and monitor students in your department.</p>
        </div>

        <button className="hs-primary-btn" onClick={openAddForm}>
          <span aria-hidden="true">＋</span> Add Student
        </button>
      </header>

      <section className="hs-stats">
        <article className="hs-stat-card">
          <span className="hs-stat-icon">♙</span>
          <div>
            <p>Total Students</p>
            <strong>{students.length}</strong>
            <small>Registered student records</small>
          </div>
        </article>

        <article className="hs-stat-card">
          <span className="hs-stat-icon">▦</span>
          <div>
            <p>Classes Represented</p>
            <strong>{classes.length}</strong>
            <small>Classes in the student directory</small>
          </div>
        </article>

        <article className="hs-stat-card">
          <span className="hs-stat-icon">⌕</span>
          <div>
            <p>Matching Students</p>
            <strong>{filteredStudents.length}</strong>
            <small>Based on current filters</small>
          </div>
        </article>
      </section>

      {showForm && (
        <section className="hs-panel hs-form-panel">
          <div className="hs-panel-heading">
            <div>
              <h2>{editingId ? "Edit Student" : "Add New Student"}</h2>
              <p>Enter the student's department details below.</p>
            </div>

            <button
              type="button"
              className="hs-close-btn"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="hs-form-grid">
              <label>
                Student ID *
                <input
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                  disabled={Boolean(editingId)}
                  required
                  placeholder="Enter student ID"
                />
              </label>

              <label>
                Full Name *
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  placeholder="Enter full name"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="student@example.com"
                />
              </label>

              <label>
                Department
                <input
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Academic Year
                <select
                  value={form.year}
                  onChange={(e) =>
                    setForm({ ...form, year: e.target.value })
                  }
                >
                  <option value="I">I Year</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                  <option value="IV">IV Year</option>
                </select>
              </label>

              <label>
                Section
                <input
                  value={form.section}
                  onChange={(e) =>
                    setForm({ ...form, section: e.target.value })
                  }
                  required
                  placeholder="Example: A"
                />
              </label>
            </div>

            {error && <p className="hs-error">{error}</p>}

            <div className="hs-form-actions">
              <button
                type="button"
                className="hs-secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>

              <button type="submit" className="hs-primary-btn">
                {editingId ? "Save Changes" : "Add Student"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="hs-panel hs-directory">
        <div className="hs-panel-heading hs-directory-heading">
          <div>
            <h2>Student Directory</h2>
            <p>Search, filter, and manage department records.</p>
          </div>

          <span className="hs-record-count">
            {filteredStudents.length} records
          </span>
        </div>

        <div className="hs-filters">
          <div className="hs-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, student ID, email..."
              aria-label="Search student records"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
          >
            <option value="all">All Classes</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Filter by academic year"
          >
            <option value="all">All Years</option>
            <option value="I">I Year</option>
            <option value="II">II Year</option>
            <option value="III">III Year</option>
            <option value="IV">IV Year</option>
          </select>

          <button
            type="button"
            className="hs-secondary-btn"
            onClick={() => {
              setSearch("");
              setClassFilter("all");
              setYearFilter("all");
            }}
          >
            Reset
          </button>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="hs-empty-state">
            <div className="hs-empty-icon">♙</div>
            <h3>
              {students.length === 0
                ? "No students added yet"
                : "No matching students"}
            </h3>
            <p>
              {students.length === 0
                ? "Start building your department directory by adding a student."
                : "Try changing your search or filters."}
            </p>
            {students.length === 0 && (
              <button className="hs-primary-btn" onClick={openAddForm}>
                ＋ Add First Student
              </button>
            )}
          </div>
        ) : (
          <div className="hs-table-wrap">
            <table className="hs-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={getId(student) || index}>
                    <td>
                      <div className="hs-student-cell">
                        <span className="hs-student-avatar">
                          {getName(student).charAt(0).toUpperCase()}
                        </span>
                        <strong>{getName(student)}</strong>
                      </div>
                    </td>
                    <td>{getId(student) || "—"}</td>
                    <td>{student.email || "—"}</td>
                    <td>
                      <span className="hs-class-badge">
                        {getClass(student)}
                      </span>
                    </td>
                    <td>{student.department || "—"}</td>
                    <td>
                      <div className="hs-row-actions">
                        <button
                          type="button"
                          className="hs-action-btn"
                          onClick={() => openEditForm(student)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="hs-action-btn hs-delete-btn"
                          onClick={() => deleteStudent(student)}
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
    </main>
  );
}
