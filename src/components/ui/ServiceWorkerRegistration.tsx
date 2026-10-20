"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Offline shell unavailable:", error));
  }, []);
  return null;
}
