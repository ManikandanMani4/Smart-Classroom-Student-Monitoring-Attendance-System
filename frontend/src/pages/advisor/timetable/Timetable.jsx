
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

const storageKey = (year) => `smartClassroomTimetable_${year}`;
const timeKey = (year) => `smartClassroomAdminTimings_${year}`;

const makeEntry = () => ({
  day: "Monday",
  period: "I",
  startTime: "",
  endTime: "",
  subject: "",
  staffName: "",
});

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function makeEmptyTimings() {
  const names = [
    ...new Set(
      [...firstYearSlots, ...seniorYearSlots].map((slot) => slot.name)
    ),
  ];

  return Object.fromEntries(
    names.map((name) => [name, { start: "", end: "" }])
  );
}

function loadTimings(year) {
  const saved = loadData(timeKey(year), {});
  const empty = makeEmptyTimings();

  return Object.fromEntries(
    Object.keys(empty).map((name) => [
      name,
      {
        start: saved?.[name]?.start || "",
        end: saved?.[name]?.end || "",
      },
    ])
  );
}

export default function Timetable() {
  const [year, setYear] = useState("1st Year");

  const [entriesByYear, setEntriesByYear] = useState(() =>
    Object.fromEntries(
      years.map((item) => [item, loadData(storageKey(item), [])])
    )
  );

  const [timingsByYear, setTimingsByYear] = useState(() =>
    Object.fromEntries(
      years.map((item) => [item, loadTimings(item)])
    )
  );

  const [entry, setEntry] = useState(makeEntry);
  const [message, setMessage] = useState("");

  const entries = entriesByYear[year] || [];
  const timings = timingsByYear[year] || makeEmptyTimings();

  const slots =
    year === "1st Year" ? firstYearSlots : seniorYearSlots;

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
    const updated = {
      ...(timingsByYear[year] || makeEmptyTimings()),
      [periodName]: {
        ...(timingsByYear[year]?.[periodName] || {
          start: "",
          end: "",
        }),
        [field]: value,
      },
    };

    try {
      localStorage.setItem(timeKey(year), JSON.stringify(updated));

      setTimingsByYear((previous) => ({
        ...previous,
        [year]: updated,
      }));

      setMessage("");
    } catch (error) {
      console.error("Timing save failed:", error);
      setMessage("Unable to save timings. Check browser storage.");
    }
  };

  const saveTimings = () => {
    for (const slot of slots) {
      const time = timings[slot.name];

      if (!time?.start || !time?.end) {
        setMessage(`Enter both timings for ${slot.name}.`);
        return;
      }

      if (time.start >= time.end) {
        setMessage(`End time must be after start time for ${slot.name}.`);
        return;
      }
    }

    try {
      localStorage.setItem(timeKey(year), JSON.stringify(timings));

      const saved = loadData(timeKey(year), null);

      if (!saved || JSON.stringify(saved) !== JSON.stringify(timings)) {
        throw new Error("Could not verify saved timings.");
      }

      setMessage(`${year} timings saved successfully.`);
    } catch (error) {
      console.error("Unable to save timings:", error);
      setMessage("Unable to save timings. Check browser storage.");
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
      setMessage("Enter the subject, staff name, start time and end time.");
      return;
    }

    if (entry.startTime >= entry.endTime) {
      setMessage("End time must be after start time.");
      return;
    }

    if (
      entries.some(
        (item) => item.day === entry.day && item.period === entry.period
      )
    ) {
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
      localStorage.setItem(storageKey(year), JSON.stringify(updatedEntries));

      setEntriesByYear((previous) => ({
        ...previous,
        [year]: updatedEntries,
      }));

      setEntry(makeEntry());
      setMessage("Subject saved successfully.");
    } catch (error) {
      console.error("Unable to save subject:", error);
      setMessage("Unable to save the subject.");
    }
  };

  const removeEntry = (index) => {
    const updatedEntries = entries.filter((_, i) => i !== index);

    try {
      localStorage.setItem(storageKey(year), JSON.stringify(updatedEntries));

      setEntriesByYear((previous) => ({
        ...previous,
        [year]: updatedEntries,
      }));

      setMessage("Subject removed from the schedule.");
    } catch (error) {
      console.error("Unable to remove subject:", error);
      setMessage("Unable to remove the subject.");
    }
  };

  return (
    <main className="timetable-page">
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

      <section className="entry-section">
        <h2>Add Subject Entry — {year}</h2>

        <form onSubmit={saveEntry}>
          <div className="entry-grid">
            <div className="form-field">
              <label htmlFor="entry-day">Day</label>
              <select
                id="entry-day"
                value={entry.day}
                onChange={(event) => updateEntry("day", event.target.value)}
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
                onChange={(event) => selectPeriod(event.target.value)}
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
              message.includes("Save") ||
              message.includes("removed")
                ? "success-message"
                : "status-message"
            }
            role="status"
          >
            {message}
          </p>
        )}
      </section>

      <section className="weekly-schedule">
        <div className="weekly-heading">
          <div>
            <h2>{year} — Weekly Schedule</h2>
          </div>

          <span className="schedule-count">
            {entries.length} subjects
          </span>
        </div>

        <details className="timing-settings">
          <summary>Configure {year} period and break timings</summary>

          <div className="timing-grid">
            {slots.map((slot) => (
              <div className="timing-card" key={slot.name}>
                <strong>{slot.name}</strong>

                <label htmlFor={`start-${year}-${slot.name}`}>
                  Start
                </label>
                <input
                  id={`start-${year}-${slot.name}`}
                  type="time"
                  value={timings[slot.name]?.start || ""}
                  onChange={(event) =>
                    updateTiming(slot.name, "start", event.target.value)
                  }
                />

                <label htmlFor={`end-${year}-${slot.name}`}>
                  End
                </label>
                <input
                  id={`end-${year}-${slot.name}`}
                  type="time"
                  value={timings[slot.name]?.end || ""}
                  onChange={(event) =>
                    updateTiming(slot.name, "end", event.target.value)
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
                    className={slot.type !== "period" ? "special-period" : ""}
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
                        className={slot.type !== "period" ? "special-period" : ""}
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
                                removeEntry(entries.indexOf(item))
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
