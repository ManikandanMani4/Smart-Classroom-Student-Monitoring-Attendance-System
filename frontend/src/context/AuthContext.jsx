
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
const ADMIN_EMAIL = "admin@smartclassroom.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the Firebase session after refresh.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        const email = firebaseUser.email?.toLowerCase() ?? "";

        if (email === ADMIN_EMAIL) {
          setUser({
            uid: firebaseUser.uid,
            name: "College Administrator",
            email: firebaseUser.email,
            role: "COLLEGE_ADMIN",
            department: "Administration",
          });
          return;
        }

        const snapshot = await getDoc(
          doc(db, "users", firebaseUser.uid)
        );

        if (!snapshot.exists()) {
          await signOut(auth);
          setUser(null);
          return;
        }

        const profile = snapshot.data();

        if (
          profile.role !== "CLASS_ADVISOR" ||
          profile.approvalStatus !== "approved" ||
          !profile.assignedClassId
        ) {
          await signOut(auth);
          setUser(null);
          return;
        }

        setUser({
          ...profile,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "CLASS_ADVISOR",
        });
      } catch (error) {
        console.error("Failed to restore session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Login
  const login = useCallback(async (email, password, selectedRole) => {
    const cleanEmail = email.trim().toLowerCase();

    const role = String(selectedRole ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

    console.log("[AuthContext] Selected role:", role);

    // College Admin
    if (["admin", "college admin", "college administrator"].includes(role)) {
      if (cleanEmail !== ADMIN_EMAIL) {
        throw new Error(
          "Please use the registered College Admin email."
        );
      }

      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const firebaseUser = credential.user;

      if (firebaseUser.email?.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        throw new Error("Unauthorized College Admin account.");
      }

      const adminUser = {
        uid: firebaseUser.uid,
        name: "College Administrator",
        email: firebaseUser.email,
        role: "COLLEGE_ADMIN",
        department: "Administration",
      };

      setUser(adminUser);
      return adminUser;
    }

    // HOD demo login
    if (["hod", "head of department"].includes(role)) {
      const hodUser = {
        uid: `hod-${cleanEmail}`,
        name: "Head of Department",
        email: cleanEmail,
        role: "HOD",
        department: "Information Technology",
      };

      setUser(hodUser);
      return hodUser;
    }

    // Class Advisor
    if (["advisor", "class advisor"].includes(role)) {
      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      try {
        const firebaseUser = credential.user;
        const snapshot = await getDoc(
          doc(db, "users", firebaseUser.uid)
        );

        if (!snapshot.exists()) {
          throw new Error(
            "Advisor profile not found. Contact the administrator."
          );
        }

        const profile = snapshot.data();

        if (profile.role !== "CLASS_ADVISOR") {
          throw new Error("This account is not a Class Advisor.");
        }

        if (profile.approvalStatus !== "approved") {
          throw new Error(
            "Your advisor account is awaiting College Admin approval."
          );
        }

        if (!profile.assignedClassId) {
          throw new Error("No class has been assigned to your account.");
        }

        const institutionId = String(
  profile.institutionId ??
  profile.institution_id ??
  profile.institution?.id ??
  ""
).trim();

const advisorUser = {
  ...profile,
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  role: "CLASS_ADVISOR",
  institutionId,
};

setUser(advisorUser);
return advisorUser;
      } catch (error) {
        await signOut(auth);
        throw error;
      }
    }

    throw new Error(`Invalid login role: "${selectedRole}".`);
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

export default AuthContext;
