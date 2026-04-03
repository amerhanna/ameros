"use client";

import { useContext } from "react";
import { WindowContext } from "@/components/WindowManager/WindowContext";

export default function WebApp() {
  const context = useContext(WindowContext);

  if (!context?.launchArgs?.url) {
    return <div className="p-4">No URL provided</div>;
  }

  return (
    <iframe
      src={context.launchArgs.url}
      className="w-full h-full bg-white border-none"
      title={context.launchArgs.title || "Web App"}
    />
  );
}
