"use client"
import Window from "./Window"

export default function WindowDemo() {
  return (
    <Window
      title="Demo Application"
      width={600}
      height={400}
      onMinimize={() => console.log("Minimize clicked")}
      onMaximize={() => console.log("Maximize clicked")}
      onClose={() => console.log("Close clicked")}
    >
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Generic Window Content</h1>
        <p>This is a reusable window component that can contain any content.</p>
        <p>The window can be dragged around by clicking and dragging the title bar.</p>
      </div>
    </Window>
  )
}
