"use client"

export default function TextEditor() {
  return (
    <div className="p-4 h-full">
      <h2 className="text-lg font-bold mb-2">Text Editor</h2>
      <textarea
        className="w-full h-full p-2 border border-gray-400 resize-none"
        placeholder="Type your text here..."
        style={{ height: "calc(100% - 40px)" }}
      />
    </div>
  )
}
