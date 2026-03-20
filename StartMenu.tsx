"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onOpenWindow: (windowConfig: any) => void
}

export default function StartMenu({ isOpen, onClose, onOpenWindow }: StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const menuItems = [
    {
      icon: "📄",
      label: "Text Editor",
      action: () => {
        onOpenWindow({
          title: "Text Editor",
          width: 500,
          height: 350,
          x: 200,
          y: 150,
          isMinimized: false,
          isMaximized: false,
          component: "TextEditor",
        })
        onClose()
      },
    },
    {
      icon: "🧮",
      label: "Calculator",
      action: () => {
        onOpenWindow({
          title: "Calculator",
          width: 250,
          height: 300,
          x: 300,
          y: 200,
          isMinimized: false,
          isMaximized: false,
          component: "Calculator",
        })
        onClose()
      },
    },
    {
      icon: "📁",
      label: "File Explorer",
      action: () => {
        onOpenWindow({
          title: "File Explorer",
          width: 400,
          height: 400,
          x: 150,
          y: 100,
          isMinimized: false,
          isMaximized: false,
          component: "FileExplorer",
        })
        onClose()
      },
    },
    {
      icon: "🎨",
      label: "Demo Application",
      action: () => {
        onOpenWindow({
          title: "Demo Application",
          width: 400,
          height: 300,
          x: 100,
          y: 100,
          isMinimized: false,
          isMaximized: false,
          component: "DemoApp",
          props: { title: "My Demo App" },
        })
        onClose()
      },
    },
    { type: "separator" },
    {
      icon: "⚙️",
      label: "Settings",
      action: () => {
        console.log("Settings clicked")
        onClose()
      },
    },
    { type: "separator" },
    {
      icon: "🔌",
      label: "Shut Down...",
      action: () => {
        console.log("Shut down clicked")
        onClose()
      },
    },
  ]

  return (
    <div
      ref={menuRef}
      className="absolute bottom-8 left-1 w-48 bg-gray-300 border-2 border-white shadow-lg z-50"
      style={{ borderTopColor: "#c0c0c0", borderLeftColor: "#c0c0c0" }}
    >
      {/* Start Menu Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-900 rounded flex items-center justify-center text-sm font-bold">W</div>
        <span className="text-sm font-bold">Windows 95</span>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item, index) => {
          if (item.type === "separator") {
            return <div key={index} className="h-px bg-gray-400 mx-2 my-1" />
          }

          return (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start px-3 py-2 h-auto text-left hover:bg-blue-600 hover:text-white rounded-none"
              onClick={item.action}
            >
              <span className="mr-3 text-base">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
