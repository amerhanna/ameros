"use client"

import { useState } from "react"
import { useSystemDialogs } from "@/hooks/useSystemDialogs"
import { Button } from "@/components/ui/button"

export default function CommonDialogDemo() {
  const { showOpenFileDialog, showSaveFileDialog, showFolderChooseDialog } = useSystemDialogs()
  const [result, setResult] = useState<string | null>(null)

  const handleOpen = async () => {
    const path = await showOpenFileDialog()
    setResult(path ? `Opened: ${path}` : "Cancelled Open")
  }

  const handleSave = async () => {
    const path = await showSaveFileDialog()
    setResult(path ? `Saved To: ${path}` : "Cancelled Save")
  }

  const handleFolder = async () => {
    const path = await showFolderChooseDialog()
    setResult(path ? `Selected Folder: ${path}` : "Cancelled Folder Selection")
  }

  return (
    <div className="p-4 flex flex-col gap-4 bg-[#f0f0f0] h-full text-black">
      <div className="text-sm font-bold mb-2">useSystemDialogs Demo</div>
      
      <div className="flex flex-col gap-2">
        <Button 
          onClick={handleOpen}
          className="w-full h-8 border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] text-black hover:bg-gray-200 active:shadow-inner rounded-none"
        >
          Show Open File Dialog
        </Button>
        <Button 
          onClick={handleSave}
          className="w-full h-8 border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] text-black hover:bg-gray-200 active:shadow-inner rounded-none"
        >
          Show Save File Dialog
        </Button>
        <Button 
          onClick={handleFolder}
          className="w-full h-8 border-t-white border-l-white border-b-[#808080] border-r-[#808080] border bg-[#f0f0f0] text-black hover:bg-gray-200 active:shadow-inner rounded-none"
        >
          Show Folder Choose Dialog
        </Button>
      </div>

      <div className="mt-4 p-2 border border-[#808080] bg-white min-h-[60px] text-xs break-all">
        <div className="text-slate-500 mb-1 font-bold italic">Result:</div>
        {result || "No action taken yet."}
      </div>

      <div className="text-[10px] text-slate-500 mt-auto italic">
        This demo showcases the useSystemDialogs hook, which provides a promise-based API for classic Windows-style common dialogs.
      </div>
    </div>
  )
}
