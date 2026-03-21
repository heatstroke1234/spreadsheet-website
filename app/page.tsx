"use client";

import { useState } from "react";
import { Login } from "./login";
import { TransactionManager } from "./transaction-manager";

const STORAGE_KEY = "mock-login-authenticated";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <Login onSuccess={() => setLoggedIn(true)} />;
  }

  return <TransactionManager onLogout={handleLogout} />;
}
