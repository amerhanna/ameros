"use client";

import { useEffect, useState } from "react";
import { bootSequencer } from "@/lib/boot-sequencer";
import { registry } from "@/lib/registry";
import { vfs } from "@/lib/vfs";

interface SplashScreenProps {
  onFinish: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onFinish, minDuration = 1500 }: SplashScreenProps) {
  const [status, setStatus] = useState("Powering on...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const boot = async () => {
      try {
        await bootSequencer.executeBootSequence((desc) => {
          if (isMounted) setStatus(desc);
        });

        // simulate error 50% of the time for testing
        if (Math.random() < 0.5) throw new Error("Simulated boot failure for testing.");

        const elapsed = Date.now() - startTime;
        const remaining = minDuration - elapsed;

        if (remaining > 0) {
          setTimeout(() => {
            if (isMounted) onFinish();
          }, remaining);
        } else {
          if (isMounted) onFinish();
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    boot();

    return () => {
      isMounted = false;
    };
  }, [onFinish, minDuration]);

  const handleResetRegistry = async () => {
    setStatus("Resetting registry to defaults...");
    setError(null);
    try {
      localStorage.removeItem("ameros-windows");
      localStorage.removeItem("ameros-active-window");
      await registry.factoryReset();
    } catch (e) {
      setError(`Reset failed: ${e}`);
    }
  };

  const handleFactoryReset = async () => {
    setStatus("Wiping VFS and registry, then restoring defaults...");
    setError(null);
    try {
      localStorage.removeItem("ameros-windows");
      localStorage.removeItem("ameros-active-window");
      await vfs.factoryReset();
    } catch (e) {
      setError(`Reset failed: ${e}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-serif text-white overflow-hidden select-none">
      <div className="relative flex flex-col items-center mb-12 transform scale-75 sm:scale-100">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-white opacity-20 blur-2xl rounded-full scale-150"></div>

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

      {error ? (
        <div className="w-[min(90vw,640px)] rounded-xl border border-white/10 bg-slate-950/95 p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-cyan-200 mb-4">Fatal Exception 0E</h2>
          <p className="mb-4 text-sm text-slate-300 whitespace-pre-wrap">{error}</p>
          <p className="mb-6 text-sm text-slate-400">
            The system has halted. You can restart or perform a factory reset to wipe all saved settings and recover from registry corruption.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Restart
            </button>
            <button
              onClick={handleResetRegistry}
              className="rounded-md border border-cyan-500 bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Reset Registry
            </button>
            <button
              onClick={handleFactoryReset}
              className="rounded-md border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Factory Reset
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute bottom-24 w-full max-w-[22rem] px-6">
            <div className="w-full h-6 border-2 border-gray-400 p-[1px] bg-black flex items-center overflow-hidden rounded-sm">
              <div
                className="h-full bg-gradient-to-r from-blue-800 via-cyan-400 to-blue-800 transition-all duration-75 ease-linear"
                style={{
                  width: `100%`,
                  boxShadow: "0 0 10px rgba(34, 211, 238, 0.5)",
                }}
              />
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%]" />
            </div>
            <p className="mt-3 text-sm text-gray-300 text-center">{status}</p>
          </div>
          <div className="absolute bottom-8 text-xs text-gray-400 flex flex-col items-center space-y-1 opacity-70">
            <div className="flex items-center space-x-2">
              <span>HannaSoft</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span>AmerOS Version 13.5.88</span>
            </div>
            <div className="text-[10px] tracking-tight">Copyright © 1988-2026 HannaSoft Inc.</div>
          </div>
          <div className="absolute inset-0 pointer-events-none z-[10000] opacity-10 contrast-125 brightness-110">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
          </div>
        </>
      )}
    </div>
  );
}
