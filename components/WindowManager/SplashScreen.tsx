'use client';

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onFinish, minDuration = 3000 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= minDuration) {
        clearInterval(interval);
        setTimeout(() => {
          setIsVisible(false);
          if (onFinish) onFinish();
        }, 500); // Small delay for polish
      }
    }, 50);

    return () => clearInterval(interval);
  }, [minDuration, onFinish]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-serif text-white overflow-hidden select-none">
      {/* Main Logo Area */}
      <div className="relative flex flex-col items-center mb-12 transform scale-75 sm:scale-100">
        {/* Sky Background for Logo */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-white opacity-20 blur-2xl rounded-full scale-150"></div>

        {/* AmerOS Text Logo Style */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-baseline space-x-1">
            <span className="text-6xl font-bold tracking-tighter italic text-blue-400">HannaSoft</span>
          </div>
          <div className="mt-[-10px] flex items-center space-x-4">
            <span className="text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-white to-blue-200 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
              AmerOS
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-black italic text-blue-400 leading-none">Version</span>
              <span className="text-4xl font-black italic text-blue-400 drop-shadow-[2px_2px_0px_white] leading-none">13.5.88</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="absolute bottom-20 w-64 h-6 border-2 border-gray-400 p-[1px] bg-black flex items-center overflow-hidden">
        {/* Progress Bar Blocks (Classic animated look) */}
        <div
          className="h-full bg-gradient-to-r from-blue-800 via-cyan-400 to-blue-800 transition-all duration-75 ease-linear"
          style={{
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
          }}
        />

        {/* Scanline effect for progress bar */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-8 text-xs text-gray-400 flex flex-col items-center space-y-1 opacity-70">
        <div className="flex items-center space-x-2">
          <span>HannaSoft</span>
          <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
          <span>AmerOS Version 13.5.88</span>
        </div>
        <div className="text-[10px] tracking-tight">Copyright © 1988-2026 HannaSoft Inc.</div>
      </div>

      {/* CRT Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none z-[10000] opacity-10 contrast-125 brightness-110">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
      </div>
    </div>
  );
}
