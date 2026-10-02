import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const users = [
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

    {
      email: "advisor.it@smartclassroom.com",
      password: "Advisor@123",
      name: "Class Advisor",
      role: "CLASS_ADVISOR",
      department: "Information Technology",
      className: "III IT - A",
    },
  ];

  const login = (email, password) => {
    const foundUser = users.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() &&
        item.password === password
    );

    if (!foundUser) {
      return {
        success: false,
        message: "Invalid email or password",
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
  };

  const logout = () => {
    setUser(null);
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