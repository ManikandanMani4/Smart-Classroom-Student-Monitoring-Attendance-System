
import { useState } from "react";
import "./Timetable.css";

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const firstYearSlots = [
  { name: "I", type: "period" },
  { name: "II", type: "period" },
  { name: "III", type: "period" },
  { name: "Break 1", type: "break" },
  { name: "IV", type: "period" },
  { name: "V", type: "period" },
  { name: "Lunch", type: "lunch" },
  { name: "VI", type: "period" },
  { name: "VII", type: "period" },
  { name: "Break 2", type: "break" },
  { name: "VIII", type: "period" },
];

const seniorYearSlots = [
  { name: "I", type: "period" },
  { name: "II", type: "period" },
  { name: "Break 1", type: "break" },
  { name: "III", type: "period" },
  { name: "IV", type: "period" },
  { name: "Lunch", type: "lunch" },
  { name: "V", type: "period" },
  { name: "VI", type: "period" },
  { name: "Break 2", type: "break" },
  { name: "VII", type: "period" },
  { name: "VIII", type: "period" },
];

const defaultTimes = {
  I: ["09:15", "10:00"],
  II: ["10:00", "10:45"],
  III: ["11:00", "11:45"],
  IV: ["11:45", "12:30"],
  V: ["13:30", "14:05"],
  VI: ["14:05", "14:50"],
  VII: ["15:05", "15:50"],
  VIII: ["15:50", "16:35"],
  "Break 1": ["10:45", "11:00"],
  Lunch: ["12:30", "13:30"],
  "Break 2": ["14:50", "15:05"],
};

const makeEntry = () => ({
  day: "Monday",
  period: "I",
  startTime: "",
  endTime: "",
  subject: "",
  staffName: "",
});

const storageKey = (year) =>
  `smartClassroomTimetable_${year}`;

const timeKey = (year) =>
  `smartClassroomTimings_${year}`;

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function makeDefaultTimings() {
  return Object.fromEntries(
    Object.entries(defaultTimes).map(([name, times]) => [
      name,
      { start: times[0], end: times[1] },
    ])
  );
}

export default function Timetable() {
  const [year, setYear] = useState("1st Year");
  const [entriesByYear, setEntriesByYear] = useState(() =>
    Object.fromEntries(
      years.map((item) => [
        item,
        loadData(storageKey(item), []),
      ])
    )
  );

  const [timingsByYear, setTimingsByYear] = useState(() =>
    Object.fromEntries(
      years.map((item) => [
        item,
        loadData(timeKey(item), makeDefaultTimings()),
      ])
    )
  );

  const [entry, setEntry] = useState(makeEntry);
  const [message, setMessage] = useState("");

  const entries = entriesByYear[year] || [];
  const timings =
    timingsByYear[year] || makeDefaultTimings();

  const slots =
    year === "1st Year"
      ? firstYearSlots
      : seniorYearSlots;

  const teachingPeriods = slots.filter(
    (slot) => slot.type === "period"
  );

  const changeYear = (newYear) => {
    setYear(newYear);
    setEntry(makeEntry());
    setMessage("");
  };

  const updateEntry = (field, value) => {
    setEntry((previous) => ({
      ...previous,
      [field]: value,
    }));
    setMessage("");
  };

  
const selectPeriod = (periodName) => {
  const time = timings[periodName];

  setEntry((previous) => ({
    ...previous,
    period: periodName,
    startTime: time?.start || "",
    endTime: time?.end || "",
  }));

  setMessage("");
};


  const updateTiming = (periodName, field, value) => {
    setTimingsByYear((previous) => ({
      ...previous,
      [year]: {
        ...previous[year],
        [periodName]: {
          ...previous[year][periodName],
          [field]: value,
        },
      },
    }));

    setMessage("");
  };

  const saveTimings = () => {
    for (const slot of slots) {
      const time = timings[slot.name];

      if (!time?.start || !time?.end) {
        setMessage(`Enter both timings for ${slot.name}.`);
        return;
      }

      if (time.start >= time.end) {
        setMessage(
          `End time must be after start time for ${slot.name}.`
        );
        return;
      }
    }

    try {
      localStorage.setItem(
        timeKey(year),
        JSON.stringify(timings)
      );

      setTimingsByYear((previous) => ({
        ...previous,
        [year]: { ...timings },
      }));

      setMessage(`${year} timings saved successfully.`);
    } catch {
      setMessage("Unable to save timings.");
    }
  };

  const saveEntry = (event) => {
    event.preventDefault();

    if (
      !entry.subject.trim() ||
      !entry.staffName.trim() ||
      !entry.startTime ||
      !entry.endTime
    ) {
      setMessage(
        "Enter the subject, staff name, start time and end time."
      );
      return;
    }

    if (entry.startTime >= entry.endTime) {
      setMessage("End time must be after start time.");
      return;
    }

    const duplicate = entries.some(
      (item) =>
        item.day === entry.day &&
        item.period === entry.period
    );

    if (duplicate) {
      setMessage(
        `${entry.day}, Period ${entry.period} already has a subject in ${year}.`
      );
      return;
    }

    const updatedEntries = [
      ...entries,
      {
        ...entry,
        subject: entry.subject.trim(),
        staffName: entry.staffName.trim(),
      },
    ];

    try {
      localStorage.setItem(
        storageKey(year),
        JSON.stringify(updatedEntries)
      );

      setEntriesByYear((previous) => ({
        ...previous,
        [year]: updatedEntries,
      }));

      setEntry(makeEntry());
      setMessage("Subject saved. You can enter the next subject.");
    } catch {
      setMessage("Unable to save the subject.");
    }
  };

  const removeEntry = (index) => {
    const updatedEntries = entries.filter(
      (_, i) => i !== index
    );

    try {
      localStorage.setItem(
        storageKey(year),
        JSON.stringify(updatedEntries)
      );

      setEntriesByYear((previous) => ({
        ...previous,
        [year]: updatedEntries,
      }));

      setMessage("Subject removed from the schedule.");
    } catch {
      setMessage("Unable to remove the subject.");
    }
  };

  return (
    <main className="timetable-page">
      {/* 1. Academic year selector */}
      <section className="year-selector">
        <div>
          <h1>Academic Year</h1>
        </div>

        <label htmlFor="academic-year">Select Year</label>
        <select
          id="academic-year"
          value={year}
          onChange={(event) => changeYear(event.target.value)}
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      {/* 2. Subject entry form */}
      <section className="entry-section">
        <h2>Add Subject Entry — {year}</h2>
      

        <form onSubmit={saveEntry}>
          <div className="entry-grid">
            <div className="form-field">
              <label htmlFor="entry-day">Day</label>
              <select
                id="entry-day"
                value={entry.day}
                onChange={(event) =>
                  updateEntry("day", event.target.value)
                }
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="entry-period">Period</label>
              <select
                id="entry-period"
                value={entry.period}
                onChange={(event) =>
                  selectPeriod(event.target.value)
                }
              >
                {teachingPeriods.map((slot) => (
                  <option key={slot.name} value={slot.name}>
                    Period {slot.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="entry-start">Start Time</label>
              <input
                id="entry-start"
                type="time"
                value={entry.startTime}
                onChange={(event) =>
                  updateEntry("startTime", event.target.value)
                }
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="entry-end">End Time</label>
              <input
                id="entry-end"
                type="time"
                value={entry.endTime}
                onChange={(event) =>
                  updateEntry("endTime", event.target.value)
                }
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="entry-subject">Subject</label>
              <input
                id="entry-subject"
                type="text"
                placeholder="Subject name"
                value={entry.subject}
                onChange={(event) =>
                  updateEntry("subject", event.target.value)
                }
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="entry-staff">Staff Name</label>
              <input
                id="entry-staff"
                type="text"
                placeholder="Staff name"
                value={entry.staffName}
                onChange={(event) =>
                  updateEntry("staffName", event.target.value)
                }
                required
              />
            </div>
          </div>

          <button className="approve-button" type="submit">
            Save Subject
          </button>
        </form>

        {message && (
          <p
            className={
              message.includes("saved") ||
              message.includes("Save")
                ? "success-message"
                : "status-message"
            }
            role="status"
          >
            {message}
          </p>
        )}
      </section>

      {/* 3. Weekly schedule for selected year */}
      <section className="weekly-schedule">
        <div className="weekly-heading">
          <div>
            <h2>{year} — Weekly Schedule</h2>
            
          </div>

          <span className="schedule-count">
            {entries.length} subjects
          </span>
        </div>

        {/* Configure times for this year's timetable */}
        <details className="timing-settings">
          <summary>Configure {year} period and break timings</summary>

          <div className="timing-grid">
            {slots.map((slot) => (
              <div className="timing-card" key={slot.name}>
                <strong>{slot.name}</strong>

                <label htmlFor={`start-${slot.name}`}>
                  Start
                </label>
                <input
                  id={`start-${slot.name}`}
                  type="time"
                  value={timings[slot.name]?.start || ""}
                  onChange={(event) =>
                    updateTiming(
                      slot.name,
                      "start",
                      event.target.value
                    )
                  }
                />

                <label htmlFor={`end-${slot.name}`}>
                  End
                </label>
                <input
                  id={`end-${slot.name}`}
                  type="time"
                  value={timings[slot.name]?.end || ""}
                  onChange={(event) =>
                    updateTiming(
                      slot.name,
                      "end",
                      event.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={saveTimings}
          >
            Save {year} Timings
          </button>
        </details>

        <div className="weekly-table-wrapper">
          <table className="weekly-table">
            <thead>
              <tr>
                <th className="day-column">Day</th>

                {slots.map((slot) => (
                  <th
                    key={slot.name}
                    className={
                      slot.type !== "period"
                        ? "special-period"
                        : ""
                    }
                  >
                    {slot.type === "period"
                      ? `Period ${slot.name}`
                      : slot.name}

                    <small>
                      {timings[slot.name]?.start || "--:--"}
                      {" – "}
                      {timings[slot.name]?.end || "--:--"}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <th className="day-column">{day}</th>

                  {slots.map((slot) => {
                    const item = entries.find(
                      (savedEntry) =>
                        savedEntry.day === day &&
                        savedEntry.period === slot.name
                    );

                    return (
                      <td
                        key={slot.name}
                        className={
                          slot.type !== "period"
                            ? "special-period"
                            : ""
                        }
                      >
                        {slot.type !== "period" ? (
                          <strong>{slot.name}</strong>
                        ) : item ? (
                          <div className="schedule-subject">
                            <strong>{item.subject}</strong>
                            <small>{item.staffName}</small>

                            <button
                              type="button"
                              className="delete-cell-button"
                              onClick={() =>
                                removeEntry(
                                  entries.findIndex(
                                    (savedEntry) =>
                                      savedEntry === item
                                  )
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="empty-period">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
