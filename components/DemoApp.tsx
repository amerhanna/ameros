"use client"

import { Button } from "@/components/ui/button"

interface DemoAppProps {
  title?: string
}

export default function DemoApp({ title = "Demo Application" }: DemoAppProps) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{title}</h1>
      <p className="mb-4">This is a demo application running in a window.</p>
      <p className="mb-4">You can drag the window around and interact with the taskbar.</p>
      <Button>Sample Button</Button>
    </div>
  )
}
