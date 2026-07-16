"use client";

import React, { useState, useEffect } from "react";
import SplashScreen from "@/components/WindowManager/SplashScreen";

interface OSProviderProps {
  children: React.ReactNode;
}

export default function OSProvider({ children }: OSProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <>{!mounted || !isSplashFinished ? <SplashScreen onFinish={() => setIsSplashFinished(true)} minDuration={1500} /> : children}</>;
}
