# AmerOS Project Structure

AmerOS is a React-based (Next.js) web application that simulates a desktop operating system. It features a window manager, a virtual file system (VFS), an OS-level database service, a system registry, and a suite of "Applications".

> Doc Version: 2026-04-18.after-02bcc30.merge-pull-request-8-from-amerhanna-database-service
> Baseline Commit: 02bcc30
> Baseline Summary: Merge pull request #8 from amerhanna/database-service
> Generated At (UTC): 2026-04-18T10:18:00Z
> Changes Since Baseline: 0 (up to date at generation time)

## Documentation Versioning

This document is versioned against a git commit summary so future agents can judge recency before relying on architecture details.

- `Baseline Commit` and `Baseline Summary` identify the exact repository snapshot this structure describes.
- `Doc Version` encodes generation date plus that commit summary for quick comparison across updates.
- `Changes Since Baseline` is the staleness signal: if non-zero, commits exist that may not be reflected in this structure yet.
- When `Changes Since Baseline` is non-zero, prefer git history and code over this document, then regenerate docs.

## Directory Overview

- [**`app/`**](file:///c:/dev/personal/ameros/app): Next.js App Router root.
    - `layout.tsx`: Root layout, includes the `ClipboardProvider`, `RegistryProvider`, and global theming.
    - `page.tsx`: Entry point, renders the `WindowManagerDemo`.
- [**`Applications/`**](file:///c:/dev/personal/ameros/Applications): Contains individual OS applications.
    - `FileExplorer/`: A fully functional file explorer with support for external mounts (FSA API).
    - `Regedit/`: Tree-based Registry Editor allowing hierarchical view and modification of system settings.
    - `DBExplorer/`: System database explorer. Discovers `.db.json` files and provides an SQL console and table UI tools.
    - `Notes/`: Simple notes application demonstrating built-in SQL database operations (`useDatabase`).
    - `DemoApp/`: Detailed showcase of all system UI components.
    - `Installer/`: OS/App Installer interface.
    - `TextEditor/`: Simple text editing app.
    - `Calculator/`: Basic calculator.
    - `DeepSeekHistory/`: DeepSeek Chat History explorer.
    - `WebApp/`: Web view frame container.
- [**`components/`**](file:///c:/dev/personal/ameros/components): System-wide UI components.
    - `WindowManager/`: Core logic for `Window`, `WindowManager`, `Taskbar`, `StartMenu`, `MenuBar` and `ContextMenu`. Includes nested submenus support.
    - `SystemDialogs/`: Standard OS dialogs (e.g., `SaveDialog`, `OpenDialog`, `PropertiesDialog`).
    - `layout/`: Layout managers, including `ResizablePanels` for native OS resizable split panes.
    - `ui/`: Comprehensive shadcn-like UI component library (forms, navigation, overlays, data display, charts).
    - `TreeView.tsx` / `FolderTreeView.tsx`: Generic, reusable components for rendering hierarchical OS structures.
    - `ItemView.tsx`: Generic component for rendering content in list or grid form, with extensive context menus, loading, and error boundaries.
    - `FolderView.tsx`: Logic engine built on `ItemView` rendering file/folder icons (shared by Desktop and FileExplorer).
- [**`lib/`**](file:///c:/dev/personal/ameros/lib): Core OS-level services. **Note: ESLint restricts direct userland application logic from importing kernel-level APIs here directly.**
    - `vfs.ts`: **Virtual File System**. Handles IndexedDB storage and external `FileSystemHandle` mounts. Utilizes dedicated `VFSNode` structures (`DriveNode`, `FolderNode`, `FileNode`) and supports complete tree/change propagation across the OS.
    - `database.ts`: **OS Database Layer**. Powered by alaSQL, provides a per-app schema mapped and synced to `C:/System/AppData` via the VFS.
    - `registry.ts`: Windows registry emulation storing hierarchical `RegistryNode` structures to persist OS-level settings. Made available synchronously via `registry-provider.tsx`.
    - `boot-sequencer.ts`: Orchestrates system startup steps (e.g., creating system folders, initializing Registry features, VFS seeding).
    - `window-store.ts`: State management for window positions, focus, and Z-index (uses a custom subscription model).
    - `clipboard.tsx`: System-wide clipboard for file operations (Copy/Cut/Paste).
- [**`hooks/`**](file:///c:/dev/personal/ameros/hooks): Custom React hooks providing system and UI logic.
    - `useSystemDialogs.tsx`: Manage system dialogs (Open/Save/Properties).
    - `useMessageBox.tsx`: Global message box interface (alert/confirm/error/prompt).
    - `useDatabase.ts`: Allows active applications to safely and simply execute SQL queries through `lib/database.ts`, enforcing bounds dynamically using the caller's WindowContext `appId`.
    - `useWindowEngine.ts`, `useWindowActions.ts`, `useGetWindowState.ts`: Core abstractions to operate the Window manager from child contexts or isolated apps.
    - `useMenuBar.ts`, `useStartMenu.ts`, `useDesktopContextMenu.ts`: Support for application-specific menus, start menu management, and global right-click behaviors.
- [**`types/`**](file:///c:/dev/personal/ameros/types): TypeScript definitions for windows, the VFS, UI menus/submenus, and application registry mapping.

## Core Concepts

### 1. Window Manager
The `WindowManager` (defined in `components/WindowManager`) is the orchestrator. It uses `applicationRegistry` (in `app/components/WindowManagerDemo.tsx`) to map application keys to their React components. Windows are tracked and modified dynamically by tools like the `useWindowEngine` hook and `lib/window-store.ts`.

### 2. Virtual File System (VFS)
The VFS (`lib/vfs.ts`) abstraction allows the OS to treat different storage backends (Local IndexedDB, browser-native file system handles) uniformly. It supports real-time change notifications, detailed status propagation to apps, and protects system mount reservations like the `C:` drive.

### 3. Registry & Database System
Located in `lib/registry.ts`, AmerOS utilizes a hierarchical registry structure to safely persist user themes, folder expansion states, and configurations across reloads. 

Additionally, applications can leverage robust relational storage via the OS Database Layer (`lib/database.ts`). It provides an auto-persisting, file-backed SQL execution system. Active applications should utilize the `useDatabase()` hook entirely, which dynamically determines the caller's db namespace scope (`appId`), effectively maintaining isolation and safety.

### 4. Application Registry
Apps are registered in `WindowManagerDemo.tsx` with metadata like icons, initial dimensions, resizability, and lifecycle hooks (e.g., `beforeClose`). Start Menu integrations can also contain deeply nested categorizations (e.g., grouping system utilities inside a submenu item).

### 5. OS Boot & Hardware Lifecycle
A global `boot-sequencer.ts` ensures proper sequential OS initialization. Services such as VFS DB priming, registry synchronization, and theme injection safely run before unleashing the OS desktop, mimicking a native machine’s OS load process.

## Extending the OS

### Adding a New Application
1. **Create the Component**: Add your app (e.g., `MyApp.tsx`) in `Applications/MyApp/`. Focus on using the unified generic layout elements.
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
3. **Add to Start Menu**: Include it inside `startMenuItems` in the same file. You can utilize the nested submenu types if adding an administrative tool.

### Adding System Data
If the data mimics a configuration setting or aesthetic preference, utilize `lib/registry.ts`. For complex relational layouts, local tables, or significant app state—use the SQL Database via `useDatabase()`. For generic non-relational files or assets, interface with `lib/vfs.ts`. All of these engines broadcast events enabling fully reactive system APIs.

---
*This document is intended for AI agents to quickly understand the architecture of AmerOS.*
