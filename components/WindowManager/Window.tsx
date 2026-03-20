"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface WindowProps {
  id: string
  title?: string
  width?: number
  height?: number
  x?: number
  y?: number
  isMinimized?: boolean
  isMaximized?: boolean
  isActive?: boolean
  zIndex?: number
  children?: React.ReactNode
  onMinimize?: (id: string) => void
  onMaximize?: (id: string) => void
  onClose?: (id: string) => void
  onFocus?: (id: string) => void
  onMove?: (id: string, x: number, y: number) => void
  onBlur?: (id: string) => void
}

export default function Window({
  id,
  title = "Untitled",
  width = 800,
  height = 600,
  x = 100,
  y = 100,
  isMinimized = false,
  isMaximized = false,
  isActive = false,
  zIndex = 1,
  children,
  onMinimize,
  onMaximize,
  onClose,
  onFocus,
  onMove,
  onBlur,
}: WindowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const prevActiveRef = useRef(isActive)

  useEffect(() => {
    if (prevActiveRef.current && !isActive) {
      onBlur?.(id)
    }
    prevActiveRef.current = isActive
  }, [isActive, id, onBlur])

  const maximizedStyle = isMaximized
    ? {
        width: "100vw",
        height: "calc(100vh - 32px)", // 32px for taskbar height
        left: "0px",
        top: "0px",
      }
    : {
        width: `${width}px`,
        height: `${height}px`,
        left: `${x}px`,
        top: `${y}px`,
      }

  const startDragging = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't allow dragging when maximized
    if (isMaximized || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    setDragging(true)
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    onFocus?.(id)
  }

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging && containerRef.current && !isMaximized) {
      const newX = e.clientX - position.x
      const newY = e.clientY - position.y
      containerRef.current.style.left = `${newX}px`
      containerRef.current.style.top = `${newY}px`
      onMove?.(id, newX, newY)
    }
  }

  const stopDragging = () => {
    setDragging(false)
  }

  const handleWindowClick = () => {
    onFocus?.(id)
  }

  const handleDoubleClickTitleBar = () => {
    onMaximize?.(id)
  }

  if (isMinimized) {
    return null
  }

  // Title bar styling based on active state
  const titleBarClass = isActive ? "bg-blue-900 text-white" : "bg-gray-500 text-gray-200"

  const buttonHoverClass = isActive ? "hover:bg-blue-700" : "hover:bg-gray-400"

  return (
    <div
      ref={containerRef}
      className="absolute bg-gray-200 border-2 border-white shadow-md"
      style={{
        ...maximizedStyle,
        zIndex,
      }}
      onClick={handleWindowClick}
    >
      {/* Title Bar */}
      <div
        className={`${titleBarClass} px-2 py-1 flex justify-between items-center select-none ${
          isMaximized ? "cursor-default" : "cursor-move"
        }`}
        onMouseDown={startDragging}
        onMouseMove={onDrag}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onDoubleClick={handleDoubleClickTitleBar}
      >
        <span>{title}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass}`}
            onClick={(e) => {
              e.stopPropagation()
              onMinimize?.(id)
            }}
          >
            _
          </Button>
          <Button
            variant="ghost"
            className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass}`}
            onClick={(e) => {
              e.stopPropagation()
              onMaximize?.(id)
            }}
          >
            {isMaximized ? "❐" : "□"}
          </Button>
          <Button
            variant="ghost"
            className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass}`}
            onClick={(e) => {
              e.stopPropagation()
              onClose?.(id)
            }}
          >
            ×
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className="flex-grow overflow-auto bg-gray-200"
        style={{
          height: isMaximized ? "calc(100vh - 64px)" : `${height - 32}px`, // 64px = 32px taskbar + 32px title bar
        }}
      >
        {children}
      </div>
    </div>
  )
}
