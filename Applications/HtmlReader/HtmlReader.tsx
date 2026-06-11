"use client";

import { useState, useEffect } from "react";
import { useWindowActions } from "@/hooks/useWindowActions";
import { vfs } from "@/lib/vfs";
import { toast } from "sonner";
import { useSystemDialogs } from "@/hooks/useSystemDialogs";
import { useAppMessage } from "@/hooks/useAppMessage";
import { useGetWindowState } from "@/hooks/useGetWindowState";
import { registry } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface HtmlReaderSettingsPanelProps {
  filePath: string;
  initialScripts: boolean;
  initialModals: boolean;
  onSave: (scripts: boolean, modals: boolean) => void;
}

function HtmlReaderSettingsPanel({ filePath, initialScripts, initialModals, onSave }: HtmlReaderSettingsPanelProps) {
  const [allowScripts, setAllowScripts] = useState(initialScripts);
  const [allowModals, setAllowModals] = useState(initialModals);
  const { close } = useWindowActions();

  const handleSave = () => {
    onSave(allowScripts, allowModals);
    close();
  };

  return (
    <div className="p-4 bg-slate-50 h-full flex flex-col gap-4">
      <div className="text-sm font-medium text-slate-700 truncate" title={filePath}>
        Security Settings for {filePath.split('/').pop()}
      </div>
      <div className="flex flex-col gap-2 flex-1 mt-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowScripts} onChange={(e) => setAllowScripts(e.target.checked)} />
          <span className="text-sm">Allow Scripts</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowModals} onChange={(e) => setAllowModals(e.target.checked)} />
          <span className="text-sm">Allow Modals (Alerts, Prompts)</span>
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}

interface HtmlReaderProps {
  filePath?: string;
}

export default function HtmlReader({ filePath: initialFilePath }: HtmlReaderProps) {
  const { openChildWindow, setMenuBar, close } = useWindowActions();
  const [filePath, setFilePath] = useState(initialFilePath);
  const { showOpenFileDialog } = useSystemDialogs();
  const [content, setContent] = useState("");
  const { appId } = useGetWindowState(["appId"]);

  const [allowScripts, setAllowScripts] = useState(false);
  const [allowModals, setAllowModals] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  const getRegistryKey = (path: string) => {
    const encodedPath = btoa(path).replace(/=/g, "");
    return `HKEY_CURRENT_USER/SOFTWARE/AmerOS/Applications/HtmlReader/AllowLists/${encodedPath}`;
  };

  useAppMessage((message) => {
    if (message.type === 'LAUNCH_ARGS' && message.args.filePath) {
      setFilePath(message.args.filePath);
    }
  });

  const handleOpenFile = async () => {
    try {
      const selectedFile = await showOpenFileDialog();
      if (selectedFile) {
        setFilePath(selectedFile);
      }
    } catch (err) {
      toast.error("Failed to open file.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (filePath) {
      setIsSettingsLoaded(false);
      const loadSettings = async () => {
        const key = getRegistryKey(filePath);
        const scripts = await registry.get<boolean>(`${key}/allowScripts`, false);
        const modals = await registry.get<boolean>(`${key}/allowModals`, false);
        setAllowScripts(scripts);
        setAllowModals(modals);
        setIsSettingsLoaded(true);
      };
      loadSettings();
    } else {
      setAllowScripts(false);
      setAllowModals(false);
      setIsSettingsLoaded(true);
    }
  }, [filePath]);

  useEffect(() => {
    const loadFile = async () => {
      if (!filePath) {
        setContent("");
        return;
      }

      try {
        const blob = await vfs.readFile(filePath);
        const text = await blob.text();
        setContent(text);
      } catch (err) {
        toast.error("Failed to load HTML file.");
        console.error(err);
      }
    };

    loadFile();
  }, [filePath]);

  useEffect(() => {
    setMenuBar([
      {
        type: "submenu",
        label: "File",
        items: [
          { type: "item", label: "Open...", action: handleOpenFile },
          { type: "separator" },
          { type: "item", label: "Exit", action: close },
        ],
      }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  const handleSaveSettings = async (scripts: boolean, modals: boolean) => {
    if (filePath) {
      const key = getRegistryKey(filePath);
      await registry.createKey(key);
      await registry.set(`${key}/allowScripts`, scripts);
      await registry.set(`${key}/allowModals`, modals);
      setAllowScripts(scripts);
      setAllowModals(modals);
      toast.success("Security settings saved");
    }
  };

  const handleOpenSettings = () => {
    if (!filePath) {
      toast.error("Open a file first to configure settings.");
      return;
    }
    openChildWindow({
      title: "Security Settings",
      component: HtmlReaderSettingsPanel,
      launchArgs: { filePath, initialScripts: allowScripts, initialModals: allowModals, onSave: handleSaveSettings },
      width: 320,
      height: 220,
      modal: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
    });
  };

  let sandboxAttrs = "allow-same-origin";
  if (allowScripts) sandboxAttrs += " allow-scripts";
  if (allowModals) sandboxAttrs += " allow-modals";

  return (
    <div className="flex flex-col w-full h-full bg-white">
      <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-slate-500">🌐</span>
        <span className="flex-1 truncate">{filePath ? filePath : "No file opened"} - HTML Reader</span>
        {filePath && (
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={handleOpenSettings} title="Security Settings">
            <Settings className="w-4 h-4 text-slate-500 hover:text-slate-700" />
          </Button>
        )}
      </div>
      <div className="flex-1 w-full h-full relative">
        {!isSettingsLoaded ? (
          <div className="flex w-full h-full items-center justify-center text-slate-400 text-sm">
            Loading security policy...
          </div>
        ) : (
          <iframe
            srcDoc={content}
            sandbox={sandboxAttrs}
            className="absolute inset-0 w-full h-full border-none"
            title="HTML Document Viewer"
          />
        )}
      </div>
    </div>
  );
}
