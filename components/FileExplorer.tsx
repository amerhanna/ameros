"use client"

import { useWindowContext } from "@/hooks/useWindowContext"

export default function FileExplorer() {
  const { launchApp } = useWindowContext();

  const handleOpenFile = (fileName: string) => {
    launchApp('TextEditor', { 
      title: `${fileName} - Text Editor`,
      launchArgs: { filePath: fileName }
    });
  };

  return (
    <div className="p-4 h-full">
      <h2 className="text-lg font-bold mb-2">File Explorer</h2>
      <div className="border border-gray-400 h-full bg-white p-2" style={{ height: "calc(100% - 40px)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 p-1 hover:bg-blue-100 cursor-pointer">
            <span>📁</span>
            <span>Documents</span>
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-blue-100 cursor-pointer">
            <span>📁</span>
            <span>Pictures</span>
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-blue-100 cursor-pointer">
            <span>📁</span>
            <span>Music</span>
          </div>
          <div 
            className="flex items-center gap-2 p-1 hover:bg-blue-100 cursor-pointer"
            onDoubleClick={() => handleOpenFile('readme.txt')}
          >
            <span>📄</span>
            <span>readme.txt</span>
          </div>
          <div 
            className="flex items-center gap-2 p-1 hover:bg-blue-100 cursor-pointer"
            onDoubleClick={() => handleOpenFile('notes.txt')}
          >
            <span>📄</span>
            <span>notes.txt</span>
          </div>
        </div>
      </div>
    </div>
  )
}
