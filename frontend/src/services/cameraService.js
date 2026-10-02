const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

export async function startClassroomSession(
  sessionData
) {
  const response = await fetch(
    `${API_BASE_URL}/classroom-sessions/start`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(sessionData),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to start classroom session."
    );
  }

  return response.json();
}

export async function stopClassroomSession(
  sessionId
) {
  const response = await fetch(
    `${API_BASE_URL}/classroom-sessions/${sessionId}/stop`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to stop classroom session."
    );
  }

  return response.json();
}

export async function recognizeFace(
  imageBlob,
  sessionId
) {
  const formData = new FormData();

  formData.append(
    "image",
    imageBlob,
    "classroom-frame.jpg"
  );

  formData.append(
    "sessionId",
    sessionId
  );

  const response = await fetch(
    `${API_BASE_URL}/recognition/recognize`,
    {
      method: "POST",

      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      "Face recognition request failed."
    );
  }

  return response.json();
}