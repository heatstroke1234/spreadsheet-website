"use client";

import { useState, useEffect } from "react";
import { Login } from "./login";
import { TransactionManager } from "./transaction-manager";

const STORAGE_KEY = "mock-login-authenticated";
const PERIODS_STORAGE_KEY = "finance-periods";

type Period = {
  id: string;
  name: string;
  createdAt: string;
  // TransactionManager state will be stored here
  cards: {
    id: string;
    name: string;
    limit: number;
    color: string;
  }[];
  transactions: {
    id: string;
    amount: number;
    method: "debit" | "card" | "bank";
    cardId?: string;
    cardName: string;
    description: string;
    createdAt: string;
  }[];
  bankTotal: number;
  visibleCardIds: Record<string, boolean>;
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [periods, setPeriods] = useState<Period[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(PERIODS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Failed to parse stored periods:", error);
        return [];
      }
    }
    return [];
  });

  const [currentPeriodId, setCurrentPeriodId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const stored = window.localStorage.getItem(PERIODS_STORAGE_KEY);
    if (stored) {
      try {
        const parsedPeriods: Period[] = JSON.parse(stored);
        if (parsedPeriods.length > 0) {
          const mostRecent = parsedPeriods.reduce((latest, current) => 
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          );
          return mostRecent.id;
        }
      } catch (error) {
        console.error("Failed to parse stored periods:", error);
      }
    }
    return "";
  });

  // Save periods to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && periods.length > 0) {
      window.localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(periods));
    }
  }, [periods]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoggedIn(false);
  };

  const createNewPeriod = (name: string) => {
    const newPeriod: Period = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      cards: [],
      transactions: [],
      bankTotal: 0,
      visibleCardIds: {},
    };
    setPeriods(prev => [...prev, newPeriod]);
    setCurrentPeriodId(newPeriod.id);
  };

  const switchPeriod = (periodId: string) => {
    setCurrentPeriodId(periodId);
  };

  const updatePeriodData = (periodId: string, data: Partial<Pick<Period, 'cards' | 'transactions' | 'bankTotal' | 'visibleCardIds'>>) => {
    setPeriods(prev => prev.map(period => 
      period.id === periodId 
        ? { ...period, ...data }
        : period
    ));
  };

  const deletePeriod = (periodId: string) => {
    setPeriods(prev => prev.filter(p => p.id !== periodId));
    if (currentPeriodId === periodId) {
      // Switch to the most recent remaining period
      const remaining = periods.filter(p => p.id !== periodId);
      if (remaining.length > 0) {
        const mostRecent = remaining.reduce((latest, current) => 
          new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
        );
        setCurrentPeriodId(mostRecent.id);
      } else {
        setCurrentPeriodId("");
      }
    }
  };

  if (!loggedIn) {
    return <Login onSuccess={() => setLoggedIn(true)} />;
  }

  const currentPeriod = periods.find(p => p.id === currentPeriodId);

  return (
    <TransactionManager 
      onLogout={handleLogout}
      periods={periods}
      currentPeriod={currentPeriod}
      onCreatePeriod={createNewPeriod}
      onSwitchPeriod={switchPeriod}
      onUpdatePeriodData={updatePeriodData}
      onDeletePeriod={deletePeriod}
    />
  );
}
