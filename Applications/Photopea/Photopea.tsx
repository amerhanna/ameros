"use client";

import { useEffect, useRef, useState } from "react";
import { vfs } from "@/lib/vfs";
import { useWindowActions } from "@/hooks/useWindowActions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSystemDialogs } from "@/hooks/useSystemDialogs";

interface PhotopeaProps {
  filePath?: string;
}

export default function Photopea({ filePath }: PhotopeaProps) {
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
            var fmt = "psd";
            if(src.indexOf(".") != -1) {
              var ext = src.split(".").pop().toLowerCase();
              if(ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "svg") fmt = (ext == "jpeg") ? "jpg" : ext;
            }
            app.echoToOE(src);
            app.activeDocument.saveToOE(fmt);
          })()
        `,
      },
    },
  };

  const photopeaUrl = `https://www.photopea.com#${encodeURIComponent(JSON.stringify(config))}`;

  // Unified save logic that "ties" the two events together
  const processSave = async (path: string, data: ArrayBuffer) => {
    let targetPath = path;

    // If it's a new file created in Photopea, show "Save As" dialog
    if (path.startsWith("local,")) {
      const suggestedName = path.split(",").pop() || "image.psd";
      const ext = suggestedName.split(".").pop()?.toLowerCase() || "psd";

      const chosenPath = await showSaveFileDialog({
        initialPath: `/home/Pictures/${suggestedName}`,
        // Add a filter based on what Photopea told us the file is
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

      // Ensure the chosen path has the correct extension if the user omitted it
      if (!targetPath.toLowerCase().endsWith(`.${ext}`)) {
        targetPath += `.${ext}`;
      }
    }

    try {
      await vfs.writeFile(targetPath, data);
      const fileName = targetPath.split("/").pop() || "Untitled";
      toast.success(`Saved successfully to ${fileName}`);

      // If we just saved a new file, tell Photopea its new home
      if (path.startsWith("local,")) {
        const baseName = fileName.includes(".") ? fileName.split(".").slice(0, -1).join(".") : fileName;

        const script = `app.activeDocument.source = "${targetPath}"; app.activeDocument.name = "${baseName}";`;
        iframeRef.current?.contentWindow?.postMessage(script, "*");
      }

      pendingSavePath.current = null; // Reset for next save
    } catch (err) {
      console.error("Photopea: Failed to save file to VFS", err);
      toast.error("Failed to save image to VFS");
    }
  };

  useEffect(() => {
    if (filePath) {
      const fileName = filePath.split("/").pop() || "Image";
      setTitle(`${fileName} - Photopea`);
    } else {
      setTitle("Photopea");
    }
  }, [filePath, setTitle]);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      console.log("Photopea event: ", e);
      // 1. Path Tie-in: If it's a string starting with / or local,, it's our file path
      if (typeof e.data === "string" && (e.data.startsWith("/") || e.data.startsWith("local,"))) {
        pendingSavePath.current = e.data;
        return;
      }

      // 2. Data Tie-in: If it's an ArrayBuffer, tie it to the pending path
      if (e.data instanceof ArrayBuffer) {
        const path = pendingSavePath.current;
        if (path) {
          await processSave(path, e.data);
        }
        return;
      }

      // 3. Handshake logic
      if (e.data === "done") {
        setIsReady(true);
        if (filePath && fileSentRef.current !== filePath) {
          try {
            const blob = await vfs.readFile(filePath);
            const buffer = await blob.arrayBuffer();

            fileSentRef.current = filePath;

            iframeRef.current?.contentWindow?.postMessage(buffer, "*");

            // Set metadata: name and source path
            const fileName = filePath.split("/").pop() || "image";
            const baseName = fileName.includes(".") ? fileName.split(".").slice(0, -1).join(".") : fileName;
            const script = `
              app.activeDocument.name = "${baseName}";
              app.activeDocument.source = "${filePath}";
            `;
            iframeRef.current?.contentWindow?.postMessage(script, "*");

            setLoading(false);
          } catch (err) {
            console.error("Photopea: Failed to load file from VFS", err);
            toast.error("Failed to load image from VFS");
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
          <p className="text-sm font-medium animate-pulse">Loading image from VFS...</p>
        </div>
      )}
      <iframe ref={iframeRef} src={photopeaUrl} className="w-full h-full border-none" title="Photopea" />
    </div>
  );
}
