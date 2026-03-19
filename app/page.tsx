"use client";

import { FormEvent, useState } from "react";

const MOCK_USERNAME = "admin";
const MOCK_PASSWORD = "password123";
const STORAGE_KEY = "mock-login-authenticated";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setLoggedIn(true);
      setError("");
      return;
    }

    setError("Incorrect username or password.");
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setLoggedIn(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  if (!loggedIn) {
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

            <button
              type="submit"
              className="w-full rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <CreditCardManager onLogout={handleLogout} />
  );
}

type CreditCard = {
  id: string;
  name: string;
  limit: number;
  color: string;
};

type CreditCardManagerProps = {
  onLogout: () => void;
};

function CreditCardManager({ onLogout }: CreditCardManagerProps) {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardName, setCardName] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardColor, setCardColor] = useState("#0ea5e9");

  const addCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = cardName.trim();
    const amount = Number(cardLimit);

    if (!trimmedName || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const newCard: CreditCard = {
      id: crypto.randomUUID(),
      name: trimmedName,
      limit: amount,
      color: cardColor,
    };

    setCards((prev) => [newCard, ...prev]);
    setCardName("");
    setCardLimit("");
    setCardColor("#0ea5e9");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-0">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Credit Card Manager</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">Add cards with names, limits and colors.</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Log out
          </button>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-4" onSubmit={addCard}>
          <input
            placeholder="Card name"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <input
            placeholder="Limit"
            type="number"
            min={1}
            value={cardLimit}
            onChange={(e) => setCardLimit(e.target.value)}
            className="rounded border p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <div className="flex items-center gap-2 rounded border p-2 dark:border-zinc-700">
            <label className="text-sm text-zinc-600 dark:text-zinc-300" htmlFor="cardColor">Color</label>
            <input
              id="cardColor"
              type="color"
              value={cardColor}
              onChange={(e) => setCardColor(e.target.value)}
              className="h-8 w-12 cursor-pointer border-0 p-0"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            Add Card
          </button>
        </form>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">No cards yet. Add one to start tracking.</p>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl p-4 shadow-md"
                style={{ backgroundColor: card.color, color: "white" }}
              >
                <h2 className="text-xl font-semibold">{card.name}</h2>
                <p className="text-sm opacity-90">Limit: ${card.limit.toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
