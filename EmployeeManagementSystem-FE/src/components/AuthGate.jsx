import { useEffect, useState } from "react";
import { api } from "../api.js";
import Login from "../pages/shared/Login.jsx";

export default function AuthGate({ children }) {
  const isEmployeeSetup = new URLSearchParams(window.location.search).get("setup") === "employee";
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem("ems-token")) && !isEmployeeSetup);

  useEffect(() => {
    if (isEmployeeSetup || !localStorage.getItem("ems-token")) return;

    api("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => localStorage.removeItem("ems-token"))
      .finally(() => setChecking(false));

    const clearSession = () => setUser(null);
    window.addEventListener("ems:unauthorized", clearSession);
    return () => window.removeEventListener("ems:unauthorized", clearSession);
  }, []);

  const login = (result) => {
    localStorage.setItem("ems-token", result.token);
    setUser(result.user);
  };
  const logout = () => {
    localStorage.removeItem("ems-token");
    setUser(null);
  };

  if (checking) return <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">Loading your workspace…</div>;
  if (!user) return <Login onLogin={login} />;

  return children({ user, logout });
}
