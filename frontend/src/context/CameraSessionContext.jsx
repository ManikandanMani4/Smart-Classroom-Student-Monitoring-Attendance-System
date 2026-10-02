import {
  createContext,
  useContext,
  useState,
} from "react";

const CameraSessionContext = createContext(null);

export function CameraSessionProvider({ children }) {
  const [session, setSession] = useState(null);

  const startSession = ({
    classId,
    className,
    subject,
    subjectCode,
    period,
    classroom,
    advisorId,
  }) => {
    const newSession = {
      sessionId: `SESSION-${Date.now()}`,

      classId: classId || "",

      className: className || "",

      subject: subject || "",

      subjectCode: subjectCode || "",

      period: period || "",

      classroom: classroom || "",

      advisorId: advisorId || "",

      startedAt: new Date().toISOString(),

      status: "ACTIVE",
    };

    setSession(newSession);

    return newSession;
  };

  const stopSession = () => {
    setSession((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        status: "ENDED",
        endedAt: new Date().toISOString(),
      };
    });

    setSession(null);
  };

  return (
    <CameraSessionContext.Provider
      value={{
        session,
        startSession,
        stopSession,
      }}
    >
      {children}
    </CameraSessionContext.Provider>
  );
}

export function useCameraSession() {
  const context =
    useContext(CameraSessionContext);

  if (!context) {
    throw new Error(
      "useCameraSession must be used inside CameraSessionProvider"
    );
  }

  return context;
}