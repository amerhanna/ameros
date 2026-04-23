# AmerOS

AmerOS is a React-based (Next.js) web application that simulates a desktop operating system. It features a window manager, a virtual file system (VFS), an OS-level database service, a system registry, and a suite of "Applications".

> Doc Version: 2026-04-23.after-6c9d71f.support-user-startup-apps-on-boot
> Baseline Commit: 6c9d71f
> Baseline Summary: Support user startup apps on boot
> Generated At (UTC): 2026-04-23T00:00:00Z
> Changes Since Baseline: 0 (up to date at generation time)

## Documentation
- [**Project Structure**](file:///c:/dev/personal/ameros/PROJECT_STRUCTURE.md): A detailed guide for developers and AI agents to understand the architecture.

## Getting Started

1.  Clone the repository.
2.  Install dependencies: `pnpm install`
3.  Run the development server: `pnpm dev`
4.  Open `http://localhost:3000` in your browser.

## Built With
- **Next.js**: Framework for building the OS.
- **Tailwind CSS**: Styling and layout.
- **Radix UI** / **Shadcn UI**: Accessible components primitives.
- **Lucide React**: Icons.
- **AlaSQL**: Application-bound relational database layer.
- **IndexedDB**: Persistent storage for the Virtual File System.
- **@zenfs/core & @zenfs/dom**: File system abstraction for VFS.
- **@zip.js/zip.js**: ZIP file handling.
