"use client"

import { useState, useCallback } from "react"
import { useWindowActions } from "@/hooks/useWindowActions"
import { Button } from "@/components/ui/button"

interface NameInputDialogProps {
  initialValue: string
  label: string
  onConfirm: (val: string) => void
  onClose?: () => void
}

export function NameInputDialog({ 
  initialValue, 
  label, 
  onConfirm, 
  onClose 
}: NameInputDialogProps) {
  const { close } = useWindowActions()
  const [value, setValue] = useState(initialValue)
  
  const handleClose = useCallback(() => {
    if (onClose) onClose()
    close()
  }, [close, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onConfirm(value.trim())
      handleClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#f0f0f0] flex flex-col gap-3 h-full border-t border-white shadow-sm">
      <div className="text-xs font-medium text-slate-700">{label}</div>
      <input
        autoFocus
        className="px-2 py-1 border border-[#808080] bg-white text-sm outline-none focus:border-blue-500 shadow-inner"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        onFocus={(e) => e.target.select()}
      />
      <div className="flex justify-end gap-2 mt-auto">
        <Button 
          size="sm" 
          type="submit" 
          className="bg-[#e1e1e1] border border-[#808080] hover:bg-[#d1d1d1] text-black h-6 px-4 rounded-none shadow-sm active:shadow-inner"
        >
          OK
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          type="button" 
          onClick={handleClose} 
          className="bg-[#e1e1e1] border border-[#808080] hover:bg-[#d1d1d1] text-black h-6 px-4 rounded-none shadow-sm active:shadow-inner"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
