"use client"

import { useState, useEffect } from "react"
import { useWindowContext } from "@/hooks/useWindowContext"
import { Button } from "@/components/ui/button"

// In-app Search panel component (not in the application registry)
function SearchPanel() {
  const [searchText, setSearchText] = useState("");
  const { close } = useWindowContext();

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
}

export default function TextEditor({ filePath }: TextEditorProps) {
  const { openChildWindow, setMenuBar } = useWindowContext();
  const [content, setContent] = useState("");

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

  useEffect(() => {
    setMenuBar([
      {
        type: 'submenu',
        label: 'File',
        items: [
          { type: 'item', label: 'New', action: () => setContent("") },
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
  }, []);

  return (
    <div className="p-4 h-full">
      <h2 className="text-lg font-bold mb-2">
        {filePath ? filePath : 'Untitled'} - Text Editor
      </h2>
      <textarea
        className="w-full h-full p-2 border border-gray-400 resize-none font-mono text-sm"
        placeholder="Type your text here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ height: "calc(100% - 40px)" }}
      />
    </div>
  )
}
