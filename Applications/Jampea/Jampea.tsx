"use client";

import { useEffect, useRef, useState } from "react";
import { vfs } from "@/lib/vfs";
import { useWindowActions } from "@/hooks/useWindowActions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSystemDialogs } from "@/hooks/useSystemDialogs";

interface JampeaProps {
  filePath?: string;
}

export default function Jampea({ filePath }: JampeaProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { setTitle } = useWindowActions();
  const { showSaveFileDialog } = useSystemDialogs();
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(!!filePath);
  const fileSentRef = useRef<string | null>(null);

  // This ref "ties" the incoming binary data to the preceding path message
  const pendingSavePath = useRef<string | null>(null);

  const config = {
    environment: {
      theme: 1, // Dark theme
      customIO: {
        // Dynamically determine format in the script based on current document source
        save: `
          (function(){
            var src = app.activeDocument.source;
            var fmt = "mid";
            if(src.indexOf(".") != -1) {
              var ext = src.split(".").pop().toLowerCase();
              if(ext == "mid" || ext == "midi") fmt = ext;
            }
            app.echoToOE(src);
            app.activeDocument.saveToOE(fmt);
          })()
        `,
      },
    },
  };

  const jampeaUrl = `https://jampea.com#${encodeURIComponent(JSON.stringify(config))}`;

  // Unified save logic that "ties" the two events together
  const processSave = async (path: string, data: ArrayBuffer) => {
    let targetPath = path;

    // If it's a new file created in Jampea, show "Save As" dialog
    if (path.startsWith("local,")) {
      const suggestedName = path.split(",").pop() || "track.mid";
      const ext = suggestedName.split(".").pop()?.toLowerCase() || "mid";

      const chosenPath = await showSaveFileDialog({
        initialPath: `/home/Music/${suggestedName}`,
        fileFilter: (node) => {
          if (node.type === "dir") return true;
          return node.name.toLowerCase().endsWith(`.${ext}`);
        },
      });

      if (!chosenPath) {
        pendingSavePath.current = null;
        return; // User cancelled
      }
      targetPath = chosenPath;

      if (!targetPath.toLowerCase().endsWith(`.${ext}`)) {
        targetPath += `.${ext}`;
      }
    }

    try {
      await vfs.writeFile(targetPath, data);
      const fileName = targetPath.split("/").pop() || "Untitled";
      toast.success(`Saved successfully to ${fileName}`);

      if (path.startsWith("local,")) {
        const baseName = fileName.includes(".") ? fileName.split(".").slice(0, -1).join(".") : fileName;
        const script = `app.activeDocument.source = "${targetPath}"; app.activeDocument.name = "${baseName}";`;
        iframeRef.current?.contentWindow?.postMessage(script, "*");
      }

      pendingSavePath.current = null;
    } catch (err) {
      console.error("Jampea: Failed to save file to VFS", err);
      toast.error("Failed to save audio to VFS");
    }
  };

  useEffect(() => {
    if (filePath) {
      const fileName = filePath.split("/").pop() || "Audio";
      setTitle(`${fileName} - Jampea`);
    } else {
      setTitle("Jampea");
    }
  }, [filePath, setTitle]);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      
      if (typeof e.data === "string" && (e.data.startsWith("/") || e.data.startsWith("local,"))) {
        pendingSavePath.current = e.data;
        return;
      }

      if (e.data instanceof ArrayBuffer) {
        const path = pendingSavePath.current;
        if (path) {
          await processSave(path, e.data);
        }
        return;
      }

      if (e.data === "done") {
        setIsReady(true);
        if (filePath && fileSentRef.current !== filePath) {
          try {
            const blob = await vfs.readFile(filePath);
            const buffer = await blob.arrayBuffer();
            fileSentRef.current = filePath;
            iframeRef.current?.contentWindow?.postMessage(buffer, "*");

            const fileName = filePath.split("/").pop() || "audio";
            const baseName = fileName.includes(".") ? fileName.split(".").slice(0, -1).join(".") : fileName;
            const script = `
              app.activeDocument.name = "${baseName}";
              app.activeDocument.source = "${filePath}";
            `;
            iframeRef.current?.contentWindow?.postMessage(script, "*");
            setLoading(false);
          } catch (err) {
            console.error("Jampea: Failed to load file from VFS", err);
            toast.error("Failed to load audio from VFS");
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [filePath]);

  return (
    <div className="w-full h-full bg-[#1c1c1c] relative flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1c1c1c] text-white">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-sm font-medium animate-pulse">Loading audio from VFS...</p>
        </div>
      )}
      <iframe ref={iframeRef} src={jampeaUrl} className="w-full h-full border-none" title="Jampea" />
    </div>
  );
}
