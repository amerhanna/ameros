"use client";

import { useState, useEffect } from "react";
import { vfs } from "@/lib/vfs";
import { toast } from "sonner";

interface PDFViewerProps {
  filePath?: string;
  url?: string; // Support for web URLs as well, though emphasis is on VFS
}

export default function PDFViewer({ filePath, url }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(url || null);
  const [isLoading, setIsLoading] = useState(!!filePath && !url);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;

    let objectUrl: string | null = null;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const content = await vfs.readFile(filePath);
        
        // Convert to Blob with proper PDF MIME type for the browser to handle it correctly
        let blob: Blob;
        if (content instanceof Blob) {
          blob = new Blob([content], { type: "application/pdf" });
        } else if (content instanceof ArrayBuffer) {
          blob = new Blob([content], { type: "application/pdf" });
        } else {
          // If it's a string, it's likely not a PDF content but let's try
          blob = new Blob([content], { type: "application/pdf" });
        }

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setError("Failed to load PDF file. Please ensure the file exists and is a valid PDF.");
        toast.error("Failed to load PDF file.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filePath]);

  if (!filePath && !url) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500 italic">
        No PDF source provided.
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
            <span className="text-sm text-slate-600 font-medium">Loading PDF...</span>
          </div>
        </div>
      )}
      
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          className="w-full h-full border-none bg-white shadow-inner"
          title={`PDF Viewer - ${filePath || url}`}
        />
      )}
    </div>
  );
}
