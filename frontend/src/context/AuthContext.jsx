
import {
  createContext,
  useContext,
  useState,
} from "react";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const AuthContext = createContext(null);

const demoUsers = [
  {
    email: "hod.it@smartclassroom.com",
    password: "Hod@123",
    name: "Dr. IT Department HOD",
    role: "HOD",
    department: "Information Technology",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password, selectedRole) => {
    const cleanEmail = email.trim().toLowerCase();

    // Firebase Authentication for Admin.
    if (selectedRole === "admin") {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        const firebaseUser = credential.user;

        // Only the configured Admin account is allowed here.
        if (firebaseUser.email?.toLowerCase() !== "admin@smartclassroom.com") {
          await signOut(auth);
          return {
            success: false,
            message: "This account is not authorized as College Admin.",
          };
        }

        const loggedUser = {
          uid: firebaseUser.uid,
          name: "College Administrator",
          email: firebaseUser.email,
          role: "COLLEGE_ADMIN",
          department: "Administration",
        };

        setUser(loggedUser);
        return { success: true, user: loggedUser };
      } catch (error) {
        console.error("Admin login failed:", error);
        return {
          success: false,
          message:
            error.code === "auth/invalid-credential"
              ? "Invalid Admin email or password."
              : "Admin login failed. Check your Firebase account and connection.",
        };
      }
    }

    // Keep HOD demo login temporarily.
    if (selectedRole === "hod") {
      const foundUser = demoUsers.find(
        (item) =>
          item.email.toLowerCase() === cleanEmail &&
          item.password === password
      );

      if (!foundUser) {
        return {
          success: false,
          message: "Invalid email or password.",
        };
      }

      const loggedUser = {
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        department: foundUser.department,
        className: "",
      };

      setUser(loggedUser);
      return { success: true, user: loggedUser };
    }

    // Firebase Authentication for Class Advisors.
    if (selectedRole === "advisor") {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        const firebaseUser = credential.user;
        const profileRef = doc(db, "users", firebaseUser.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
          await signOut(auth);
          return {
            success: false,
            message: "Advisor profile not found. Contact the administrator.",
          };
        }

        const profile = profileSnapshot.data();

        if (
          profile.role !== "CLASS_ADVISOR" ||
          profile.approvalStatus !== "approved" ||
          !profile.assignedClassId
        ) {
          await signOut(auth);
          return {
            success: false,
            message:
              "Your account is awaiting Admin approval and class assignment.",
          };
        }

        const loggedUser = {
          uid: firebaseUser.uid,
          name: profile.name || firebaseUser.displayName || "Class Advisor",
          email: firebaseUser.email || cleanEmail,
          role: profile.role,
          department: profile.department || "",
          className: profile.className || "",
          assignedClassId: profile.assignedClassId,
        };

        setUser(loggedUser);
        return { success: true, user: loggedUser };
      } catch (error) {
        console.error("Advisor login failed:", error);
        return {
          success: false,
          message:
            error.code === "auth/invalid-credential"
              ? "Invalid email or password."
              : "Advisor login failed. Check your Firebase configuration and connection.",
        };
      }
    }

    return {
      success: false,
      message: "Please select a valid account role.",
    };
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
