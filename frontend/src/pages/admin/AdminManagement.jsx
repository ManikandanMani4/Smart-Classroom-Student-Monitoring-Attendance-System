import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./AdminManagement.css";


/* =========================================================
   INITIAL DATA
========================================================= */

const INITIAL_DATA = {
  Departments: [],
  Staff: [],
  Students: [],
  Classes: [],
  Subjects: [],
};


/* =========================================================
   FIELD CONFIGURATION
========================================================= */

const FIELD_CONFIG = {
  Departments: [
    ["code", "Department Code", "text"],
    ["name", "Department Name", "text"],
    ["hod", "Head of Department", "text"],
    ["email", "HOD Email", "email"],
    ["phone", "Contact Number", "text"],
    ["status", "Status", "select"],
  ],

  Staff: [
    ["staffId", "Staff ID", "text"],
    ["name", "Full Name", "text"],
    ["email", "Email Address", "email"],
    ["phone", "Phone Number", "text"],
    ["designation", "Designation", "text"],
    ["department", "Department", "text"],
    ["role", "Role", "select"],
    ["status", "Status", "select"],
  ],

  Students: [
    ["studentId", "Student ID", "text"],
    ["name", "Full Name", "text"],
    ["email", "Email Address", "email"],
    ["phone", "Phone Number", "text"],
    ["department", "Department", "text"],
    ["className", "Class", "text"],
    ["status", "Status", "select"],
  ],

  Classes: [
    ["code", "Class Code", "text"],
    ["name", "Class Name", "text"],
    ["department", "Department", "text"],
    ["advisor", "Class Advisor", "text"],
    ["students", "Total Students", "number"],
    ["status", "Status", "select"],
  ],

  Subjects: [
    ["code", "Subject Code", "text"],
    ["name", "Subject Name", "text"],
    ["department", "Department", "text"],
    ["semester", "Semester", "text"],
    ["status", "Status", "select"],
  ],
};


/* =========================================================
   ADMIN SIDEBAR MENU
========================================================= */

const ADMIN_MENU = [
  {
    label: "Departments",
    path: "/admin/departments",
    icon: "▦",
  },
  {
    label: "Staff",
    path: "/admin/staff",
    icon: "♙",
  },
  {
    label: "Students",
    path: "/admin/students",
    icon: "♧",
  },
  {
    label: "Classes",
    path: "/admin/classes",
    icon: "▣",
  },
  {
    label: "Subjects",
    path: "/admin/subjects",
    icon: "▤",
  },
  {
    label: "HOD Management",
    path: "/admin/hod",
    icon: "◉",
  },
  {
    label: "Timetable",
    path: "/admin/timetable",
    icon: "◷",
  },
  {
    label: "Attendance",
    path: "/admin/attendance",
    icon: "✓",
  },
  {
    label: "Monitoring",
    path: "/admin/monitoring",
    icon: "◉",
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: "▤",
  },
];


/* =========================================================
   ADMIN MANAGEMENT
========================================================= */

function AdminManagement({
  module = "Staff",
  onBack,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const storageKey =
    `smartclassroom_${module}`;

  const fields =
    FIELD_CONFIG[module] || [];

  const cameraRequired =
    module === "Staff" ||
    module === "Students";


  /* =========================================================
     DATA
  ========================================================= */

  const [data, setData] = useState(() => {
    try {
      const saved =
        localStorage.getItem(
          storageKey
        );

      return saved
        ? JSON.parse(saved)
        : INITIAL_DATA[module] || [];
    } catch (error) {
      console.error(
        "Unable to load data:",
        error
      );

      return (
        INITIAL_DATA[module] || []
      );
    }
  });


  const [search, setSearch] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [formData, setFormData] =
    useState({});

  const [deleteId, setDeleteId] =
    useState(null);


  /* =========================================================
     CAMERA
  ========================================================= */

  const videoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const [cameraActive, setCameraActive] =
    useState(false);

  const [capturedFace, setCapturedFace] =
    useState(null);

  const [cameraError, setCameraError] =
    useState("");


  /* =========================================================
     SAVE DATA
  ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error(
        "Unable to save data:",
        error
      );
    }
  }, [data, storageKey]);


  /* =========================================================
     CAMERA CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      const video =
        videoRef.current;

      if (video?.srcObject) {
        video.srcObject
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        video.srcObject = null;
      }
    };
  }, []);


  /* =========================================================
     FILTER
  ========================================================= */

  const filteredData =
    useMemo(() => {
      if (!search.trim()) {
        return data;
      }

      const value =
        search
          .trim()
          .toLowerCase();

      return data.filter((item) =>
        Object.values(item).some(
          (field) =>
            String(field)
              .toLowerCase()
              .includes(value)
        )
      );
    }, [data, search]);


  /* =========================================================
     EMPTY FORM
  ========================================================= */

  const createEmptyForm = () => {
    const result = {};

    fields.forEach(([key]) => {
      result[key] = "";
    });

    return result;
  };


  /* =========================================================
     START CAMERA
  ========================================================= */

  const startCamera =
    async () => {
      try {
        setCameraError("");

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {
          setCameraError(
            "Camera access is not supported by this browser."
          );

          return;
        }

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: {
                facingMode: "user",
                width: {
                  ideal: 1280,
                },
                height: {
                  ideal: 720,
                },
              },
              audio: false,
            });

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          await videoRef.current.play();

          setCameraActive(true);
        }
      } catch (error) {
        console.error(
          "Camera error:",
          error
        );

        setCameraError(
          "Unable to access the camera. Please allow camera permission."
        );
      }
    };


  /* =========================================================
     STOP CAMERA
  ========================================================= */

  const stopCamera = () => {
    const video =
      videoRef.current;

    if (video?.srcObject) {
      video.srcObject
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      video.srcObject = null;
    }

    setCameraActive(false);
  };


  /* =========================================================
     CAPTURE FACE
  ========================================================= */

  const captureFace = () => {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (
      !video ||
      !canvas ||
      !cameraActive
    ) {
      setCameraError(
        "Please start the camera first."
      );

      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError(
        "Camera is not ready. Please wait."
      );

      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      setCameraError(
        "Unable to capture image."
      );

      return;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image =
      canvas.toDataURL(
        "image/jpeg",
        0.85
      );

    setCapturedFace(image);

    setCameraError("");

    stopCamera();
  };


  /* =========================================================
     RETAKE
  ========================================================= */

  const retakeFace = () => {
    setCapturedFace(null);
    setCameraError("");

    startCamera();
  };


  /* =========================================================
     REMOVE FACE
  ========================================================= */

  const removeFace = () => {
    setCapturedFace(null);
    setCameraError("");
  };


  /* =========================================================
     OPEN ADD FORM
  ========================================================= */

  const openAddForm = () => {
    stopCamera();

    setEditingId(null);

    setFormData(
      createEmptyForm()
    );

    setCapturedFace(null);

    setCameraError("");

    setShowForm(true);
  };


  /* =========================================================
     OPEN EDIT FORM
  ========================================================= */

  const openEditForm =
    (item) => {
      stopCamera();

      setEditingId(item.id);

      setFormData({
        ...item,
      });

      setCapturedFace(
        item.faceRegistration ===
          "Registered"
          ? "registered"
          : null
      );

      setCameraError("");

      setShowForm(true);
    };


  /* =========================================================
     CLOSE FORM
  ========================================================= */

  const closeForm = () => {
    stopCamera();

    setShowForm(false);

    setEditingId(null);

    setFormData({});

    setCapturedFace(null);

    setCameraError("");
  };


  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleFormChange =
    (key, value) => {
      setFormData(
        (previous) => ({
          ...previous,
          [key]: value,
        })
      );
    };


  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit =
    (event) => {
      event.preventDefault();

      for (
        const [key, label]
        of fields
      ) {
        if (
          !String(
            formData[key] || ""
          ).trim()
        ) {
          alert(
            `Please enter ${label}.`
          );

          return;
        }
      }


      /* FACE REQUIRED */

      if (
        cameraRequired &&
        !editingId &&
        !capturedFace
      ) {
        setCameraError(
          "Face capture is required before saving."
        );

        return;
      }


      /* UPDATE */

      if (editingId) {
        setData(
          (previous) =>
            previous.map(
              (item) => {
                if (
                  item.id !==
                  editingId
                ) {
                  return item;
                }

                return {
                  ...item,
                  ...formData,

                  ...(cameraRequired &&
                  capturedFace &&
                  capturedFace !==
                    "registered"
                    ? {
                        faceRegistration:
                          "Registered",

                        faceCapturedAt:
                          new Date()
                            .toISOString(),
                      }
                    : {}),
                };
              }
            )
        );
      }


      /* ADD */

      else {
        const newRecord = {
          ...formData,

          id: Date.now(),

          createdAt:
            new Date()
              .toISOString(),

          ...(cameraRequired
            ? {
                faceRegistration:
                  "Registered",

                faceCapturedAt:
                  new Date()
                    .toISOString(),
              }
            : {}),
        };

        setData(
          (previous) => [
            ...previous,
            newRecord,
          ]
        );
      }

      closeForm();
    };


  /* =========================================================
     DELETE
  ========================================================= */

  const confirmDelete = () => {
    setData(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== deleteId
        )
    );

    setDeleteId(null);
  };


  /* =========================================================
     BACK
  ========================================================= */

  const handleBack = () => {
    closeForm();

    if (onBack) {
      onBack();
    } else {
      navigate(
        "/admin/dashboard"
      );
    }
  };


  /* =========================================================
     STATUS
  ========================================================= */

  const getStatusClass =
    (status) => {
      switch (
        String(status)
          .toLowerCase()
      ) {
        case "active":
          return "status-success";

        case "pending":
          return "status-warning";

        default:
          return "status-danger";
      }
    };


  /* =========================================================
     ADD LABEL
  ========================================================= */

  const addLabel =
    module === "Staff"
      ? "Staff"
      : module === "Students"
      ? "Student"
      : module === "Departments"
      ? "Department"
      : module === "Classes"
      ? "Class"
      : "Subject";


  /* =========================================================
     SIDEBAR NAVIGATION
  ========================================================= */

  const handleAdminNavigation =
    (path) => {
      closeForm();
      navigate(path);
    };


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="admin-management-layout">

      {/* =====================================================
          ADMIN SIDEBAR
          SIDEBAR IS INSIDE THIS FILE
      ===================================================== */}

      <aside className="admin-management-sidebar">

        {/* BRAND */}

        <div className="admin-management-brand">

          <div className="admin-management-brand-icon">
            SC
          </div>

          <div className="admin-management-brand-text">

            <h2>
              SmartClassroom
            </h2>

            <span>
              SMART CAMPUS
            </span>

          </div>

        </div>


        {/* ROLE */}

        <div className="admin-management-role">

          <div className="admin-management-role-label">
            ROLE
          </div>

          <div className="admin-management-role-name">
            COLLEGE ADMIN
          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="admin-management-navigation">

          {ADMIN_MENU.map(
            (item) => {

              const isActive =
                location.pathname ===
                item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`admin-management-nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleAdminNavigation(
                      item.path
                    )
                  }
                >

                  <span className="admin-management-nav-icon">
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>

                </button>
              );
            }
          )}

        </nav>


        {/* USER */}

        <div className="admin-management-sidebar-bottom">

          <div className="admin-management-user">

            <div className="admin-management-avatar">
              A
            </div>

            <div className="admin-management-user-info">

              <strong>
                College Administrator
              </strong>

              <span>
                College Admin
              </span>

            </div>

          </div>


          <button
            type="button"
            className="admin-management-signout"
            onClick={() => {
              closeForm();
              navigate("/login");
            }}
          >

            <span>
              ↪
            </span>

            <span>
              Sign out
            </span>

          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="admin-management-main">

        <div className="management-page">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="management-header">

            <div className="management-header-left">

              <button
                type="button"
                className="management-back"
                onClick={
                  handleBack
                }
              >

                <span className="back-arrow">
                  ←
                </span>

                <span>
                  Back to Dashboard
                </span>

              </button>


              <div className="management-heading">

                <p className="management-label">
                  ADMINISTRATION
                </p>

                <h1>
                  Manage {module}
                </h1>

                <p className="management-description">
                  Add, update and manage{" "}
                  {module.toLowerCase()}{" "}
                  across the college.
                </p>

              </div>

            </div>


            <button
              type="button"
              className="add-record-button"
              onClick={
                openAddForm
              }
            >

              <span className="add-icon">
                +
              </span>

              <span>
                Add {addLabel}
              </span>

            </button>

          </div>


          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="management-stats">

            <div className="management-stat">

              <span>
                Total Records
              </span>

              <strong>
                {data.length}
              </strong>

            </div>


            <div className="management-stat">

              <span>
                Showing
              </span>

              <strong>
                {filteredData.length}
              </strong>

            </div>


            <div className="management-stat">

              <span>
                Active
              </span>

              <strong>
                {
                  data.filter(
                    (item) =>
                      item.status ===
                      "Active"
                  ).length
                }
              </strong>

            </div>


            <div className="management-stat">

              <span>
                Face Registered
              </span>

              <strong>
                {cameraRequired
                  ? data.filter(
                      (item) =>
                        item.faceRegistration ===
                        "Registered"
                    ).length
                  : "—"}
              </strong>

            </div>

          </div>


          {/* =================================================
              TABLE CARD
          ================================================= */}

          <div className="management-card">


            {/* TOOLBAR */}

            <div className="management-toolbar">

              <div className="management-search">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder={`Search ${module.toLowerCase()}...`}
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                />

              </div>


              <div className="toolbar-right">

                {search && (

                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    Clear
                  </button>

                )}

              </div>

            </div>


            {/* TABLE */}

            <div className="management-table-wrapper">

              <table className="management-table">

                <thead>

                  <tr>

                    {fields.map(
                      ([key, label]) => (

                        <th key={key}>
                          {label}
                        </th>

                      )
                    )}


                    {cameraRequired && (

                      <th>
                        Face
                      </th>

                    )}


                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredData.length ===
                  0 ? (

                    <tr>

                      <td
                        colSpan={
                          fields.length +
                          (cameraRequired
                            ? 2
                            : 1)
                        }
                        className="empty-table"
                      >

                        <div>

                          <strong>
                            No records found
                          </strong>

                          <p>
                            There are no{" "}
                            {module.toLowerCase()}{" "}
                            records yet.
                          </p>

                          <button
                            type="button"
                            onClick={
                              openAddForm
                            }
                          >
                            + Add{" "}
                            {addLabel}
                          </button>

                        </div>

                      </td>

                    </tr>

                  ) : (

                    filteredData.map(
                      (item) => (

                        <tr
                          key={
                            item.id
                          }
                        >

                          {fields.map(
                            ([key]) => (

                              <td
                                key={key}
                              >

                                {key ===
                                "status" ? (

                                  <span
                                    className={`management-status ${getStatusClass(
                                      item[key]
                                    )}`}
                                  >

                                    <i />

                                    {item[
                                      key
                                    ] || "—"}

                                  </span>

                                ) : (

                                  item[
                                    key
                                  ] || "—"

                                )}

                              </td>

                            )
                          )}


                          {cameraRequired && (

                            <td>

                              <span
                                className={`management-status ${
                                  item.faceRegistration ===
                                  "Registered"
                                    ? "status-success"
                                    : "status-warning"
                                }`}
                              >

                                <i />

                                {item.faceRegistration ===
                                "Registered"
                                  ? "Registered"
                                  : "Required"}

                              </span>

                            </td>

                          )}


                          <td>

                            <div className="record-actions">

                              <button
                                type="button"
                                className="edit-button"
                                onClick={() =>
                                  openEditForm(
                                    item
                                  )
                                }
                              >
                                Edit
                              </button>


                              <button
                                type="button"
                                className="delete-button"
                                onClick={() =>
                                  setDeleteId(
                                    item.id
                                  )
                                }
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>


            {/* FOOTER */}

            <div className="management-footer">

              Showing{" "}

              <strong>
                {filteredData.length}
              </strong>

              {" "}of{" "}

              <strong>
                {data.length}
              </strong>

              {" "}records

            </div>

          </div>


          {/* =================================================
              ADD / EDIT MODAL
          ================================================= */}

          {showForm && (

            <div className="management-overlay">

              <div className="management-modal">


                {/* MODAL HEADER */}

                <div className="management-modal-header">

                  <div>

                    <p>
                      {editingId
                        ? "UPDATE RECORD"
                        : "NEW RECORD"}
                    </p>

                    <h2>
                      {editingId
                        ? `Edit ${module}`
                        : `Add ${addLabel}`}
                    </h2>

                  </div>


                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
                  >
                    ×
                  </button>

                </div>


                {/* FORM */}

                <form
                  className="management-form"
                  onSubmit={
                    handleSubmit
                  }
                >

                  <div className="form-grid">

                    {fields.map(
                      ([
                        key,
                        label,
                        type,
                      ]) => (

                        <label
                          key={key}
                        >

                          <span>
                            {label}
                            <b>*</b>
                          </span>


                          {type ===
                          "select" ? (

                            <select
                              value={
                                formData[
                                  key
                                ] || ""
                              }
                              onChange={(
                                event
                              ) =>
                                handleFormChange(
                                  key,
                                  event
                                    .target
                                    .value
                                )
                              }
                            >

                              <option value="">
                                Select{" "}
                                {label}
                              </option>


                              {key ===
                                "status" && (
                                <>
                                  <option value="Active">
                                    Active
                                  </option>

                                  <option value="Inactive">
                                    Inactive
                                  </option>

                                  <option value="Pending">
                                    Pending
                                  </option>
                                </>
                              )}


                              {key ===
                                "role" && (
                                <>
                                  <option value="HOD">
                                    HOD
                                  </option>

                                  <option value="CLASS ADVISOR">
                                    Class Advisor
                                  </option>

                                  <option value="FACULTY">
                                    Faculty
                                  </option>

                                  <option value="STAFF">
                                    Staff
                                  </option>
                                </>
                              )}

                            </select>

                          ) : (

                            <input
                              type={type}
                              value={
                                formData[
                                  key
                                ] || ""
                              }
                              placeholder={`Enter ${label.toLowerCase()}`}
                              onChange={(
                                event
                              ) =>
                                handleFormChange(
                                  key,
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                          )}

                        </label>

                      )
                    )}

                  </div>


                  {/* =================================================
                      CAMERA
                  ================================================= */}

                  {cameraRequired && (

                    <div className="face-verification-section">

                      <div className="face-verification-header">

                        <div>

                          <span className="face-verification-label">
                            FACE VERIFICATION
                          </span>

                          <h3>
                            {module ===
                            "Staff"
                              ? "Staff Face Registration"
                              : "Student Face Registration"}
                          </h3>

                          <p>
                            Capture a clear
                            front-facing image
                            for face enrollment.
                          </p>

                        </div>


                        <div
                          className={
                            capturedFace
                              ? "face-status verified"
                              : "face-status pending"
                          }
                        >

                          <span />

                          {capturedFace
                            ? "Face Captured"
                            : "Required"}

                        </div>

                      </div>


                      <div className="face-camera-container">

                        <div className="camera-preview">

                          {!capturedFace ? (

                            <video
                              ref={
                                videoRef
                              }
                              className={
                                cameraActive
                                  ? "camera-video active"
                                  : "camera-video"
                              }
                              autoPlay
                              muted
                              playsInline
                            />

                          ) : capturedFace ===
                            "registered" ? (

                            <div className="registered-face">

                              <div className="registered-face-icon">
                                ✓
                              </div>

                              <strong>
                                Face Already Registered
                              </strong>

                              <span>
                                Capture again to
                                replace it.
                              </span>

                            </div>

                          ) : (

                            <img
                              src={
                                capturedFace
                              }
                              alt="Captured face"
                              className="captured-face-image"
                            />

                          )}


                          {!cameraActive &&
                            !capturedFace && (

                              <div className="camera-placeholder">

                                <div className="camera-placeholder-icon">
                                  ◉
                                </div>

                                <strong>
                                  Camera not started
                                </strong>

                                <span>
                                  Start camera to
                                  register the face
                                </span>

                              </div>

                            )}

                        </div>


                        <canvas
                          ref={
                            canvasRef
                          }
                          className="hidden-camera-canvas"
                        />


                        <div className="camera-controls">

                          {!cameraActive &&
                            !capturedFace && (

                              <button
                                type="button"
                                className="camera-start-button"
                                onClick={
                                  startCamera
                                }
                              >
                                ◉ Start Camera
                              </button>

                            )}


                          {cameraActive &&
                            !capturedFace && (

                              <>
                                <button
                                  type="button"
                                  className="camera-capture-button"
                                  onClick={
                                    captureFace
                                  }
                                >
                                  ● Capture Face
                                </button>

                                <button
                                  type="button"
                                  className="camera-stop-button"
                                  onClick={
                                    stopCamera
                                  }
                                >
                                  Stop Camera
                                </button>
                              </>

                            )}


                          {capturedFace && (

                            <>
                              <button
                                type="button"
                                className="camera-retake-button"
                                onClick={
                                  retakeFace
                                }
                              >
                                Retake
                              </button>

                              <button
                                type="button"
                                className="camera-remove-button"
                                onClick={
                                  removeFace
                                }
                              >
                                Remove
                              </button>
                            </>

                          )}

                        </div>


                        {cameraError && (

                          <div className="camera-error">
                            {cameraError}
                          </div>

                        )}


                        <div className="camera-instructions">

                          <div>
                            <span>1</span>
                            Look directly at
                            the camera
                          </div>

                          <div>
                            <span>2</span>
                            Keep your face
                            clearly visible
                          </div>

                          <div>
                            <span>3</span>
                            Use good lighting
                          </div>

                        </div>

                      </div>

                    </div>

                  )}


                  {/* FORM BUTTONS */}

                  <div className="form-actions">

                    <button
                      type="button"
                      className="cancel-form"
                      onClick={
                        closeForm
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="submit"
                      className="save-form"
                    >
                      {editingId
                        ? "Update Record"
                        : `Save ${addLabel}`}
                    </button>

                  </div>

                </form>

              </div>

            </div>

          )}


          {/* =================================================
              DELETE MODAL
          ================================================= */}

          {deleteId && (

            <div className="management-overlay">

              <div className="delete-modal">

                <div className="delete-icon">
                  !
                </div>

                <h2>
                  Delete Record?
                </h2>

                <p>
                  This action cannot be
                  undone. Are you sure you
                  want to delete this record?
                </p>


                <div className="delete-actions">

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteId(null)
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    className="confirm-delete"
                    onClick={
                      confirmDelete
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            </div>

          )}

        </div>

      </main>

    </div>
  );
}


export default AdminManagement; 