"use client"

import { Button } from "@/components/ui/button"
import type { WindowState } from "./types/window"

interface TaskbarProps {
  windows: WindowState[]
  activeWindowId: string | null
  onWindowSelect: (id: string) => void
  onStartMenuToggle: () => void
  isStartMenuOpen: boolean
}

export default function Taskbar({
  windows,
  activeWindowId,
  onWindowSelect,
  onStartMenuToggle,
  isStartMenuOpen,
}: TaskbarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-300 border-t-2 border-white flex items-center px-1 gap-1">
      {/* Start Button */}
      <Button
        variant="ghost"
        className={`h-6 px-3 text-sm border border-gray-400 font-bold ${
          isStartMenuOpen ? "bg-gray-400 border-gray-500 shadow-inner" : "bg-gray-300 hover:bg-gray-200"
        }`}
        onClick={onStartMenuToggle}
      >
        <span className="mr-1">🪟</span>
        Start
      </Button>

      {/* Window Tabs */}
      <div className="flex gap-1 flex-1">
        {windows.map((window) => (
          <Button
            key={window.id}
            variant="ghost"
            className={`h-6 px-3 text-sm max-w-40 truncate ${
              activeWindowId === window.id
                ? "bg-gray-400 border border-gray-500 shadow-inner"
                : "bg-gray-300 border border-gray-400 hover:bg-gray-200"
            }`}
            onClick={() => onWindowSelect(window.id)}
          >
            {window.title}
          </Button>
        ))}
      </div>

      {/* System Tray Area */}
      <div className="flex items-center gap-2 px-2">
        <div className="text-sm">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  )
}
