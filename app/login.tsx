"use client";

import { FormEvent, useState } from "react";

const STORAGE_KEY = "mock-login-authenticated";
const MOCK_USERNAME = "admin";
const MOCK_PASSWORD = "password123";

type LoginProps = {
  onSuccess: () => void;
};

export function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "true");
      }
      setError("");
      onSuccess();
      return;
    }

    setError("Incorrect username or password.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-800">
        <h2 className="mb-6 text-2xl font-bold text-center text-zinc-900 dark:text-zinc-100">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:bg-zinc-700 dark:text-zinc-100"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:bg-zinc-700 dark:text-zinc-100"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

          <button type="submit" className="w-full rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
