# AmerOS Project Structure

AmerOS is a React-based (Next.js) web application that simulates a desktop operating system. It features a window manager, a virtual file system (VFS), an OS-level database service, a system registry, and a suite of "Applications".

> Doc Version: 2026-07-29.after-095b20b.add-welcome-app
> Baseline Commit: 095b20b
> Baseline Summary: add welcome app
> Generated At (UTC): 2026-07-29T21:42:00Z
> Changes Since Baseline: 0 (up to date at generation time)

## Documentation Versioning

This document is versioned against a git commit summary so future agents can judge recency before relying on architecture details.

- `Baseline Commit` and `Baseline Summary` identify the exact repository snapshot this structure describes.
- `Doc Version` encodes generation date plus that commit summary for quick comparison across updates.
- `Changes Since Baseline` is the staleness signal: if non-zero, commits exist that may not be reflected in this structure yet.
- When `Changes Since Baseline` is non-zero, prefer git history and code over this document, then regenerate docs.

## Directory Overview

- [**`app/`**](file:///c:/dev/personal/ameros/app): Next.js App Router root.
    - `layout.tsx`: Root layout, includes the `ClipboardProvider` and global theming.
    - `page.tsx`: Entry point, renders the `WindowManagerDemo`.
- [**`Applications/`**](file:///c:/dev/personal/ameros/Applications): Contains individual OS applications.
    - `Calculator/`: Basic calculator application.
    - `DBExplorer/`: System database explorer. Discovers `.db.json` files and provides an SQL console and table UI tools.
    - `DeepSeekHistory/`: DeepSeek Chat History explorer.
    - `DemoApp/`: Detailed showcase of all system UI components.
    - `DocsViewer/`: Word Document (`.docx`) viewer using docx-preview to render documents directly from the VFS.
    - `FileExplorer/`: A fully functional file explorer with support for external mounts (FSA API).
    - `HtmlReader/`: HTML file reader that securely renders HTML contents within a sandboxed iframe.
    - `Installer/`: OS/App Installer interface.
    - `Jampea/`: Audio and MIDI file editor leveraging Jampea via an iframe with bidirectional VFS integration.
    - `MusicPlayer/`: Music and playlist player with VFS support, featuring standard media controls and `.m3u` parsing.
    - `Notes/`: Simple notes application demonstrating built-in SQL database operations (`useDatabase`).
    - `PDFViewer/`: PDF document viewer supporting VFS files and web URLs.
    - `Photopea/`: Advanced image and PSD editor leveraging Photopea via an iframe with bidirectional VFS integration.
    - `Regedit/`: Tree-based Registry Editor allowing hierarchical view and modification of system settings.
    - `TestCloseApp/`: Test application for close functionality.
    - `TextEditor/`: Simple text editing app.
    - `Vectorpea/`: Vector graphics editor leveraging Vectorpea via an iframe with bidirectional VFS integration.
    - `WebApp/`: Web view frame container.
    - `Welcome/`: Interactive welcome guide explaining AmerOS core systems (Window Manager, VFS, Database, Registry, Boot Sequencer, IPC) and providing shortcuts to OS utilities and system demos.
- [**`components/`**](file:///c:/dev/personal/ameros/components): System-wide UI components.
    - `WindowManager/`: Core logic for `Window`, `WindowManager`, `Taskbar`, `StartMenu`, `MenuBar` and `ContextMenu`. Includes nested submenus support.
    - `SystemDialogs/`: Standard OS dialogs (e.g., `SaveDialog`, `OpenDialog`, `PropertiesDialog`).
    - `layout/`: Layout managers, including `ResizablePanels` for native OS resizable split panes.
    - `ui/`: Comprehensive shadcn-like UI component library (forms, navigation, overlays, data display, charts).
    - `TreeView.tsx` / `FolderTreeView.tsx`: Generic, reusable components for rendering hierarchical OS structures.
    - `ItemView.tsx`: Generic component for rendering content in list or grid form, with extensive context menus, loading, and error boundaries.
    - `FolderView.tsx`: Logic engine built on `ItemView` rendering file/folder icons (shared by Desktop and FileExplorer).
    - `MyButton.tsx`: Button component.
    - `RegistryFileDetails.tsx`: Component to display registry file details.
    - `theme-provider.tsx`: Theme provider for system-wide light/dark modes.
- [**`lib/`**](file:///c:/dev/personal/ameros/lib): Core OS-level services. **Note: ESLint restricts direct userland application logic from importing kernel-level APIs here directly.**
    - `vfs.ts`: **Virtual File System**. Handles IndexedDB storage and external `FileSystemHandle` mounts. Utilizes dedicated `VFSNode` structures (`DriveNode`, `FolderNode`, `FileNode`) and supports complete tree/change propagation across the OS.
    - `database.ts`: **OS Database Layer**. Powered by alaSQL, provides a per-app schema mapped and synced to `C:/System/AppData` via the VFS.
    - `registry.ts`: Windows registry emulation storing hierarchical `RegistryNode` structures to persist OS-level settings.
    - `boot-sequencer.ts`: Orchestrates system startup steps (e.g., creating system folders, initializing Registry features, VFS seeding).
    - `window-store.ts`: State management for window positions, focus, and Z-index (uses a custom subscription model).
    - `clipboard.tsx`: System-wide clipboard for file operations (Copy/Cut/Paste).
    - `app-service.ts`: Manages system-wide application installation, registration, and Start Menu entries via the Registry.
    - `file-service.ts`: Handles file-to-application associations and icon resolution using the system Registry.
    - `bundled-apps.ts`: Defines system bundled applications registry.
    - `default-registry.json`: The default system registry state used during initialization.
    - `utils.ts`: Utility functions for the OS.
    - `vfs-defaults/`: Default VFS tree structure data to seed the system upon initialization.
- [**`hooks/`**](file:///c:/dev/personal/ameros/hooks): Custom React hooks providing system and UI logic.
    - `useSystemDialogs.tsx`: Manage system dialogs (Open/Save/Properties).
    - `useMessageBox.tsx`: Global message box interface (alert/confirm/error/prompt).
    - `useDatabase.ts`: Allows active applications to safely and simply execute SQL queries through `lib/database.ts`, enforcing bounds dynamically using the caller's WindowContext `appId`.
    - `useRegistry.ts`: Enables active applications to securely read/write config settings to their own isolated registry hive (`HKEY_CURRENT_USER/SOFTWARE/AmerOS/Applications/${appId}`), enforcing boundaries dynamically using the caller's `appId` via `WindowContext`.
    - `useWindowEngine.ts`, `useWindowActions.ts`, `useGetWindowState.ts`: Core abstractions to operate the Window manager from child contexts or isolated apps.
    - `useStartMenu.ts`, `useDesktopContextMenu.ts`: Support for start menu management, and global right-click behaviors.
    - `useAppMessage.ts`: Hook for applications to receive IPC messages (like file open requests) to support single-instance behavior.
    - `useLocalStorage.ts`: Hook for local storage management.
    - `useSystemActions.ts`: Hook for system actions.
    - `use-toast.ts`: Hook for managing toast notifications.
    - `use-mobile.ts`: Hook for detecting mobile viewports.
- [**`types/`**](file:///c:/dev/personal/ameros/types): TypeScript definitions for windows, the VFS, UI menus/submenus, and application registry mapping.

## Core Concepts

### 1. Window Manager
The `WindowManager` (defined in `components/WindowManager`) is the orchestrator. It uses `applicationRegistry` (in `app/components/WindowManagerDemo.tsx`) to map application keys to their React components. Windows are tracked and modified dynamically by tools like the `useWindowEngine` hook and `lib/window-store.ts`.

### 2. Virtual File System (VFS)
The VFS (`lib/vfs.ts`) abstraction allows the OS to treat different storage backends (Local IndexedDB, browser-native file system handles) uniformly. It supports real-time change notifications, detailed status propagation to apps, and protects system mount reservations like the `C:` drive.

### 3. Registry & Database System
Located in `lib/registry.ts`, AmerOS utilizes a hierarchical registry structure to safely persist user themes, folder expansion states, and configurations across reloads. 

Additionally, applications can leverage robust relational storage via the OS Database Layer (`lib/database.ts`). It provides an auto-persisting, file-backed SQL execution system. Active applications should utilize the `useDatabase()` hook entirely, which dynamically determines the caller's db namespace scope (`appId`), effectively maintaining isolation and safety.

Similarly, applications can interact with the Registry via `useRegistry()` hook which limits their reading/writing capabilities to their application namespace scope (`HKEY_CURRENT_USER/SOFTWARE/AmerOS/Applications/${appId}`), guaranteeing isolation.

### 4. Application Registry
Apps are registered in `WindowManagerDemo.tsx` or using the Start Menu / registry services with metadata like icons, initial dimensions, resizability, and lifecycle hooks (e.g., `beforeClose`). Start Menu integrations can also contain deeply nested categorizations (e.g., grouping system utilities inside a submenu item). Single-instance messaging is also supported via `useAppMessage.ts`.

### 5. OS Boot & Hardware Lifecycle
A global `boot-sequencer.ts` ensures proper sequential OS initialization. Services such as VFS DB priming, registry synchronization, and theme injection safely run before unleashing the OS desktop, mimicking a native machine’s OS load process.

## Extending the OS

### Adding a New Application
1. **Create the Component**: Add your app (e.g., `MyApp.tsx`) in `Applications/MyApp/`. Focus on using the unified generic layout elements.
2. **Register the App**: Add it to `bundled-apps.ts` or dynamically register it.
3. **Add to Start Menu**: Include it inside the Registry's start menu entries.

### Adding System Data
If the data mimics a configuration setting or aesthetic preference, utilize `lib/registry.ts` (or `useRegistry` inside application components). For complex relational layouts, local tables, or significant app state—use the SQL Database via `useDatabase()`. For generic non-relational files or assets, interface with `lib/vfs.ts`. All of these engines broadcast events enabling fully reactive system APIs.

---
*This document is intended for AI agents to quickly understand the architecture of AmerOS.*
