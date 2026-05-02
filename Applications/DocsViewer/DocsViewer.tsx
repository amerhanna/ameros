"use client";

import { useEffect, useRef, useState } from "react";
import { useWindowActions } from "@/hooks/useWindowActions";
import { useSystemActions } from "@/hooks/useSystemActions";
import { vfs } from "@/lib/vfs";
import { toast } from "sonner";
import { renderAsync } from "docx-preview";

interface DocsViewerProps {
  filePath?: string;
}

export default function DocsViewer({ filePath }: DocsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(!!filePath);
  const [error, setError] = useState<string | null>(null);
  const { setMenuBar, setTitle, close } = useWindowActions();
  const { launchApp } = useSystemActions();

  useEffect(() => {
    if (!filePath) return;

    const loadDocx = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const content = await vfs.readFile(filePath);
        
        if (containerRef.current) {
          // Clear previous content if any
          containerRef.current.innerHTML = "";
          await renderAsync(content, containerRef.current);
        }
      } catch (err) {
        console.error("Failed to load DOCX:", err);
        setError("Failed to load document file.");
        toast.error("Failed to load document file.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocx();
  }, [filePath]);

  useEffect(() => {
    if (filePath) {
      setTitle(`${filePath} - Docs Viewer`);
    } else {
      setTitle("Docs Viewer");
    }

    setMenuBar([
      {
        type: "submenu",
        label: "File",
        items: [
          { type: "item", label: "Exit", action: close },
        ],
      },
    ]);
  }, [filePath, setTitle, setMenuBar, close]);

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500 italic">
        No document source provided.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6 text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <div className="text-slate-800 font-medium mb-2">{error}</div>
        <div className="text-slate-500 text-sm">{filePath}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-300 flex flex-col relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-slate-400 border-t-slate-800 rounded-full animate-spin mb-3"></div>
            <span className="text-sm text-slate-600 font-medium">Loading Document...</span>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="w-full h-full overflow-auto bg-white"
      />
    </div>
  );
}
