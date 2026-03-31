# AmerOS Project Structure

AmerOS is a React-based (Next.js) web application that simulates a desktop operating system. It features a window manager, a virtual file system (VFS), and a suite of "Applications".

> Doc Version: 2026-03-31.after-017a7f1.add-clipboard-context-and-integrate-into-explorer
> Baseline Commit: 017a7f1
> Baseline Summary: Add clipboard context and integrate into explorer
> Generated At (UTC): 2026-03-31T19:16:20Z
> Changes Since Baseline: 0 (up to date at generation time)

## Documentation Versioning

This document is versioned against a git commit summary so future agents can judge recency before relying on architecture details.

- `Baseline Commit` and `Baseline Summary` identify the exact repository snapshot this structure describes.
- `Doc Version` encodes generation date plus that commit summary for quick comparison across updates.
- `Changes Since Baseline` is the staleness signal: if non-zero, commits exist that may not be reflected in this structure yet.
- When `Changes Since Baseline` is non-zero, prefer git history and code over this document, then regenerate docs.

## Directory Overview

- [**`app/`**](file:///c:/dev/personal/ameros/app): Next.js App Router root.
    - `layout.tsx`: Root layout, includes the `ClipboardProvider`.
    - `page.tsx`: Entry point, renders the `WindowManagerDemo`.
- [**`Applications/`**](file:///c:/dev/personal/ameros/Applications): Contains individual OS applications.
    - `FileExplorer/`: A fully functional file explorer with support for external mounts (FSA API).
    - `TextEditor/`: Simple text editing app.
    - `Calculator/`: Basic calculator.
    - `DeepSeekHistory/`: History explorer.
    - `DemoApp/`: Samples of OS UI components.
- [**`components/`**](file:///c:/dev/personal/ameros/components): System-wide UI components.
    - `WindowManager/`: Core logic for `Window`, `WindowManager`, `Taskbar`, `StartMenu`, `MenuBar` and `ContextMenu`.
    - `SystemDialogs/`: Standard OS dialogs (e.g., `SaveDialog`, `OpenDialog`, `PropertiesDialog`).
    - `System/`: Base system components like `TaskbarButton`, `Icon`.
    - `FolderView.tsx`: Core engine for rendering file/folder icons (shared by Desktop and FileExplorer).
- [**`lib/`**](file:///c:/dev/personal/ameros/lib): Core OS-level services.
    - `vfs.ts`: **Virtual File System**. Handles IndexedDB storage and external `FileSystemHandle` mounts.
    - `window-store.ts`: State management for window positions, focus, and Z-index (uses Zustand).
    - `clipboard.tsx`: System-wide clipboard for file operations (Copy/Cut/Paste).
- [**`hooks/`**](file:///c:/dev/personal/ameros/hooks): Custom React hooks providing system and UI logic.
    - `useSystemDialogs.tsx`: Manage system dialogs (Open/Save/Properties).
    - `useMessageBox.tsx`: Global message box interface (alert/confirm/error).
    - `useWindowActions.ts`: Hooks to manipulate window state (close, focus, etc.).
    - `useMenuBar.ts`: Support for application-specific menu bars.
    - `useGetWindowState.ts`: Query state for a specific window.
- [**`types/`**](file:///c:/dev/personal/ameros/types): TypeScript definitions for windows, VFS, and application registry.

## Core Concepts

### 1. Window Manager
The `WindowManager` (defined in `components/WindowManager`) is the orchestrator. It uses `applicationRegistry` (in `app/components/WindowManagerDemo.tsx`) to map application keys to their React components. Windows are tracked in `lib/window-store.ts`.

### 2. Virtual File System (VFS)
The VFS (`lib/vfs.ts`) abstraction allows the OS to treat different storage backends (Local IndexedDB, browser-native file system handles) uniformly. It supports `mkdir`, `writeFile`, `readFile`, `delete`, `rename`, and `mount`.

### 3. Application Registry
Apps are registered in `WindowManagerDemo.tsx` with metadata like icons, initial dimensions, resizability, and lifecycle hooks (e.g., `beforeClose`).

### 4. System-Wide Clipboard
`lib/clipboard.tsx` provides a context and hook (`useClipboard`) to manage file operations (cut/copy) across Different windows/instances of File Explorer.

## Extending the OS

### Adding a New Application
1. **Create the Component**: Add your app (e.g., `MyApp.tsx`) in `Applications/MyApp/`.
2. **Register the App**: In [**`app/components/WindowManagerDemo.tsx`**](file:///c:/dev/personal/ameros/app/components/WindowManagerDemo.tsx), add an entry to the `applicationRegistry`:
   ```typescript
   MyApp: {
     component: MyApp,
     icon: '🚀',
     width: 400,
     height: 300,
     resizable: true,
   }
   ```
3. **Add to Start Menu**: Add it to `startMenuItems` in the same file.

### Adding a System Hook
New system-level features should be added as React hooks in `hooks/` and, if they require global state, should use a Context Provider in `app/layout.tsx`.

### VFS Integration
Apps should use the `lib/vfs.ts` exported functions (like `vfs.readFile`) or the higher-level hooks for file operations to ensure persistence and cross-mount compatibility.

---
*This document is intended for AI agents to quickly understand the architecture of AmerOS.*
