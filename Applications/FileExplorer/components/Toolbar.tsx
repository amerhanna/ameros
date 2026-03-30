"use client"

import { ChevronLeft, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ToolbarProps {
  currentPath: string
  canGoBack: boolean
  onBack: () => void
  onMount: () => void
}

export function Toolbar({ currentPath, canGoBack, onBack, onMount }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 border-b bg-[#e1e1e1] shadow-sm">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onBack}
        disabled={!canGoBack}
        className="h-8 w-8 hover:bg-[#c1c1c1] border border-transparent hover:border-[#808080]"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="flex-1 px-3 py-1 bg-white border border-[#808080] text-sm truncate font-medium">
        {currentPath}
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onMount} 
        className="gap-2 h-8 bg-[#e1e1e1] hover:bg-[#c1c1c1] border-[#808080]"
      >
        <PlusCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Mount Local Folder</span>
      </Button>
    </div>
  )
}
