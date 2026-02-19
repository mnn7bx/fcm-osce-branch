"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FcmUser } from "@/types";

interface UserContextValue {
  user: FcmUser | null;
  setUser: (user: FcmUser | null) => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<FcmUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fcm-user");
    if (stored) {
      try {
        setUserState(JSON.parse(stored));
      } catch {
        localStorage.removeItem("fcm-user");
      }
    }
  }, []);

  function setUser(user: FcmUser | null) {
    setUserState(user);
    if (user) {
      localStorage.setItem("fcm-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("fcm-user");
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
