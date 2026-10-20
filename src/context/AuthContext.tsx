"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, syncUserProfile } from "@/lib/firebase";
import { UserProfile } from "@/types/assets";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmulatorAccount: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setLoading(true);
    setError(null);
    setUser(currentUser);
    setUserProfile(null);
    if (currentUser) {
      try {
        setUserProfile(await syncUserProfile(currentUser));
      } catch (err) {
        let message = err instanceof Error ? err.message : "Failed to authenticate with Basechan identity system.";
        if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("insufficient")) {
          message = "Access Denied: Your account is not on the authorized access list for Basechan Asset Manager.";
        }
        setError(message);
        setUser(null);
        setUserProfile(null);
      }
    }
    setLoading(false);
  }), []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      let message = err instanceof Error ? err.message : "Sign-in failed.";
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("insufficient")) {
        message = "Access Denied: Your account is not on the authorized access list for Basechan Asset Manager.";
      }
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  const signInWithEmulatorAccount = async (email: string, password: string) => {
    if (process.env.NEXT_PUBLIC_E2E_AUTH_EMULATOR !== "true") throw new Error("Emulator sign-in is available only in local test mode.");
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test sign-in failed.";
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  return <AuthContext.Provider value={{ user, userProfile, loading, error, signInWithGoogle, signInWithEmulatorAccount, signOutUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
