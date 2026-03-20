"use client"

import { Button } from "@/components/ui/button"

export default function Calculator() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Calculator</h2>
      <div className="mb-2">
        <input type="text" className="w-full p-2 border border-gray-400 text-right" readOnly value="0" />
      </div>
      <div className="grid grid-cols-4 gap-2 w-48">
        {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"].map((btn) => (
          <Button key={btn} variant="outline" className="h-8 bg-gray-100 hover:bg-gray-200">
            {btn}
          </Button>
        ))}
      </div>
    </div>
  )
}
