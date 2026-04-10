"use client"

import { ChevronLeft, ChevronRight, CornerLeftUp, FolderPlus, FolderMinus, Search, SearchSlash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface ToolbarProps {
  currentPath: string
  canGoBack: boolean
  onBack: () => void
  canGoForward: boolean
  onForward: () => void
  canGoUp: boolean
  onUp: () => void
  canMount: boolean;
  onMount: () => void
  onUnmount: () => void
  canUnmount: boolean
  onPathChange: (path: string) => void
}

export function Toolbar({
  currentPath,
  canGoBack,
  onBack,
  canGoForward,
  onForward,
  canGoUp,
  onUp,
  canMount,
  onMount,
  onUnmount,
  canUnmount,
  onPathChange,
}: ToolbarProps) {
  const [inputValue, setInputValue] = useState(currentPath);

  useEffect(() => {
    setInputValue(currentPath === "/" ? "This PC" : currentPath);
  }, [currentPath]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let submitPath = inputValue.trim();
      if (submitPath.toLowerCase() === "this pc") {
        submitPath = "/";
      }
      onPathChange(submitPath);
    }
  };

  return (
    <div className="flex flex-col gap-1 p-1 bg-[#dfdfdf] border-b border-[#808080] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      {/* Top Row: Action Buttons */}
      <div className="flex items-center gap-1 w-full flex-wrap">
        <div className="flex items-center border-r border-[#808080] pr-1 mr-1 gap-1 shadow-[1px_0_0_rgba(255,255,255,0.8)]">
          <Button
            title="Back"
            variant="ghost"
            size="icon"
            onClick={onBack}
            disabled={!canGoBack}
            className="h-8 w-8 rounded-none hover:bg-[#c1c1c1] border border-transparent hover:border-b-white hover:border-r-white hover:border-t-[#808080] hover:border-l-[#808080]"
          >
            <ChevronLeft className="w-5 h-5 text-slate-800" />
          </Button>
          <Button
            title="Forward"
            variant="ghost"
            size="icon"
            onClick={onForward}
            disabled={!canGoForward}
            className="h-8 w-8 rounded-none hover:bg-[#c1c1c1] border border-transparent hover:border-b-white hover:border-r-white hover:border-t-[#808080] hover:border-l-[#808080]"
          >
            <ChevronRight className="w-5 h-5 text-slate-800" />
          </Button>
          <Button
            title="Up One Level"
            variant="ghost"
            size="icon"
            onClick={onUp}
            disabled={!canGoUp}
            className="h-8 w-8 rounded-none hover:bg-[#c1c1c1] border border-transparent hover:border-b-white hover:border-r-white hover:border-t-[#808080] hover:border-l-[#808080]"
          >
            <CornerLeftUp className="w-4 h-4 text-slate-800" />
          </Button>
        </div>

        <div className="flex items-center border-r border-[#808080] pr-1 mr-1 gap-1 shadow-[1px_0_0_rgba(255,255,255,0.8)]">
          <Button
            title="Search (Coming Soon)"
            variant="ghost"
            size="icon"
            disabled
            className="h-8 w-8 rounded-none hover:bg-[#c1c1c1] border border-transparent"
          >
            <Search className="w-4 h-4 text-slate-800" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            title="Mount Folder"
            variant="ghost"
            size="icon"
            onClick={onMount}
            disabled={!canMount}
            className="h-8 w-8 rounded-none hover:bg-[#c1c1c1] border border-transparent hover:border-b-white hover:border-r-white hover:border-t-[#808080] hover:border-l-[#808080]"
          >
            <FolderPlus className="w-4 h-4 text-slate-800" />
          </Button>
          <Button
            title="Unmount Folder"
            variant="ghost"
            size="icon"
            onClick={onUnmount}
            disabled={!canUnmount}
            className="h-8 w-8 rounded-none hover:bg-[#c1c1c1] border border-transparent hover:border-b-white hover:border-r-white hover:border-t-[#808080] hover:border-l-[#808080]"
          >
            <FolderMinus className="w-4 h-4 text-slate-800" />
          </Button>
        </div>
      </div>

      {/* Bottom Row: Location Address Bar */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-black text-sm pl-1">Address</span>
        <div className="flex-1 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white flex items-center h-6 overflow-hidden">
          <input
            type="text"
            className="w-full text-sm outline-none px-1 h-full text-black bg-transparent"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
