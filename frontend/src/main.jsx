import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import {
  CameraSessionProvider,
} from "./context/CameraSessionContext";

import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <AuthProvider>

      <CameraSessionProvider>

        <App />

      </CameraSessionProvider>

    </AuthProvider>
  </React.StrictMode>
);