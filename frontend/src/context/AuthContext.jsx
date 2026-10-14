
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
    email: "admin@smartclassroom.com",
    password: "Admin@123",
    name: "College Administrator",
    role: "COLLEGE_ADMIN",
    department: "Administration",
  },
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

    // Keep existing demo Admin and HOD login.
    if (selectedRole === "admin" || selectedRole === "hod") {
      const expectedRole =
        selectedRole === "admin"
          ? "COLLEGE_ADMIN"
          : "HOD";

      const foundUser = demoUsers.find(
        (item) =>
          item.email.toLowerCase() === cleanEmail &&
          item.password === password &&
          item.role === expectedRole
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
        department: foundUser.department || "",
        className: foundUser.className || "",
      };

      setUser(loggedUser);

      return {
        success: true,
        user: loggedUser,
      };
    }

    // Firebase login for Class Advisors.
    if (selectedRole === "advisor") {
      try {
        const credential =
          await signInWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        const firebaseUser = credential.user;

        const profileRef = doc(
          db,
          "users",
          firebaseUser.uid
        );

        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
          await signOut(auth);

          return {
            success: false,
            message:
              "Advisor profile not found. Please register again or contact the administrator.",
          };
        }

        const profile = profileSnapshot.data();

        if (profile.role !== "CLASS_ADVISOR") {
          await signOut(auth);

          return {
            success: false,
            message:
              "This account is not registered as a Class Advisor.",
          };
        }

        const loggedUser = {
          uid: firebaseUser.uid,
          name:
            profile.name ||
            firebaseUser.displayName ||
            "Class Advisor",
          email: firebaseUser.email || cleanEmail,
          role: profile.role,
          department: profile.department || "",
          className: profile.className || "",
          assignedClassId: profile.assignedClassId || null,
        };

        setUser(loggedUser);

        return {
          success: true,
          user: loggedUser,
        };
      } catch (error) {
        console.error("Advisor login failed:", error);

        const messages = {
          "auth/invalid-credential":
            "Invalid email or password.",
          "auth/user-not-found":
            "No account exists with this email.",
          "auth/wrong-password":
            "Invalid email or password.",
          "auth/invalid-email":
            "Please enter a valid email address.",
          "auth/too-many-requests":
            "Too many attempts. Please try again later.",
          "auth/network-request-failed":
            "Network error. Check your internet connection.",
          "permission-denied":
            "Unable to read your advisor profile. Check Firestore security rules.",
        };

        return {
          success: false,
          message:
            messages[error.code] ||
            "Login failed. Check your Firebase configuration and Firestore permissions.",
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
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
