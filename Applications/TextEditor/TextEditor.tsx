"use client"

import { useState, useEffect } from "react"
import { useWindowActions } from "@/hooks/useWindowActions"
import { Button } from "@/components/ui/button"
import { vfs } from "@/lib/vfs"
import { toast } from "sonner"

// In-app Search panel component (not in the application registry)
function SearchPanel() {
  const [searchText, setSearchText] = useState("");
  const { close } = useWindowActions();

  return (
    <div className="p-3 bg-gray-200">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Find what:</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-400 text-sm"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="px-4 py-1 h-7 text-sm bg-gray-300 border border-gray-500 hover:bg-gray-400"
            onClick={() => {
              if (searchText) {
                console.log('Find next:', searchText);
              }
            }}
          >
            Find Next
          </Button>
          <Button
            variant="ghost"
            className="px-4 py-1 h-7 text-sm bg-gray-300 border border-gray-500 hover:bg-gray-400"
            onClick={close}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TextEditorProps {
  filePath?: string;
  initialContent?: string;
}

export default function TextEditor({ filePath, initialContent = "" }: TextEditorProps) {
  const { openChildWindow, setMenuBar } = useWindowActions();
  const [content, setContent] = useState(initialContent);

  const handleOpenSearch = () => {
    openChildWindow({
      title: 'Find',
      component: SearchPanel,
      width: 350,
      height: 120,
      modal: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
    });
  };

  const handleSave = async () => {
    if (!filePath) {
      toast.error("Cannot save untitled file. Use 'Save As' (not implemented).");
      return;
    }
    try {
      await vfs.writeFile(filePath, content);
      toast.success("File saved successfully.");
    } catch (err) {
      toast.error("Failed to save file.");
      console.error(err);
    }
  };

  useEffect(() => {
    setMenuBar([
      {
        type: 'submenu',
        label: 'File',
        items: [
          { type: 'item', label: 'New', action: () => setContent("") },
          { type: 'item', label: 'Save', action: handleSave },
        ],
      },
      {
        type: 'submenu',
        label: 'Edit',
        items: [
          { type: 'item', label: 'Find...', action: handleOpenSearch },
        ],
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, filePath]);

  return (
    <div className="p-4 h-full bg-slate-50">
      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
        <span className="text-slate-500">📄</span>
        {filePath ? filePath : 'Untitled'} - Text Editor
      </h2>
      <textarea
        className="w-full h-full p-3 border border-slate-300 rounded shadow-inner resize-none font-mono text-sm focus:outline-blue-400"
        placeholder="Type your text here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ height: "calc(100% - 40px)" }}
      />
    </div>
  )
}
