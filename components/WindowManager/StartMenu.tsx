"use client"

import type React from "react"
import { useEffect, useMemo, useRef } from "react"
import { MenuContent, type MenuItemType } from "./Menu"
import type { StartMenuItem, WindowConfig, ApplicationRegistry } from "@/types/window"

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onOpenWindow: (config: Partial<WindowConfig> & { component: string }) => void
  items: StartMenuItem[]
  applicationRegistry: ApplicationRegistry
}

function mapStartMenuItems(items: StartMenuItem[], onOpenWindow: StartMenuProps["onOpenWindow"], applicationRegistry: ApplicationRegistry): MenuItemType[] {
  return items.map((item) => {
    if (item.type === "separator") {
      return { type: "separator" }
    }

    if (item.type === "action") {
      return {
        type: "item",
        label: item.label,
        icon: item.icon,
        action: () => {
          if (item.actionId === 'shutdown') {
            console.log('Shut down clicked');
          }
        },
      }
    }

    if (item.type === "submenu") {
      return {
        type: "submenu",
        label: item.label,
        icon: item.icon,
        disabled: item.disabled,
        items: mapStartMenuItems(item.items, onOpenWindow, applicationRegistry),
      }
    }

    return {
      type: "item",
      label: item.label,
      icon: applicationRegistry[item.component]?.icon,
      action: () => onOpenWindow({ component: item.component, launchArgs: item.launchArgs }),
    }
  })
}

export default function StartMenu({ isOpen, onClose, onOpenWindow, items, applicationRegistry }: StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-start-button="true"]')) {
        return
      }
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

  const menuItems = useMemo(() => mapStartMenuItems(items, onOpenWindow, applicationRegistry), [items, onOpenWindow, applicationRegistry])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-8 left-1 w-56 bg-gray-300 border-2 border-white shadow-lg select-none pb-1"
      style={{
        borderTopColor: "#c0c0c0",
        borderLeftColor: "#c0c0c0",
        // Keep Start Menu above any window z-index growth.
        zIndex: 2147483647,
      }}
    >
      {/* Start Menu Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-900 rounded flex items-center justify-center text-lg font-bold">W</div>
        <span className="text-base font-bold">AmerOS 95</span>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <MenuContent
          items={menuItems}
          onClose={onClose}
          className="bg-transparent border-none shadow-none min-w-full"
          style={{ backgroundColor: 'transparent', boxShadow: 'none' }}
        />
      </div>
    </div>
  )
}
