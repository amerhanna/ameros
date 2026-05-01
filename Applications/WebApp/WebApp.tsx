"use client";

import { useEffect } from "react";
import { useWindowActions } from "@/hooks/useWindowActions";

export default function WebApp({url, title}: {url: string, title: string}) {
  const { setTitle: setWindowTitle } = useWindowActions();

  useEffect(() => {
    if (title) {
      setWindowTitle(title);
    }
  }, [title, setWindowTitle]);

  if (!url) {
    return <div className="p-4">No URL provided</div>;
  }

  return (
    <iframe
      src={url}
      className="w-full h-full bg-white border-none"
      title={title || "Web App"}
    />
  );
}
