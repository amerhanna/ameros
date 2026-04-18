---
name: ameros-docs-regenerator
description: Regenerates the PROJECT_STRUCTURE.md and README.md files to accurately reflect the latest codebase architecture. Intended to be run before merging.
---

# AmerOS Docs Regenerator

This skill is designed to be executed manually before major merges to ensure that `PROJECT_STRUCTURE.md` and `README.md` do not drift from the actual codebase. 

## Objective
Thoroughly scan the AmerOS codebase for new applications, system services, UI components, and hooks. Format these findings into updated documentation files while properly versioning them against the latest git commit.

## Execution Steps

### 1. Information Gathering
- **Read Current Docs**: Start by reading the existing `PROJECT_STRUCTURE.md` and `README.md` to grasp the established document format and structure.
- **Audit Directories**: Execute directory listings on `Applications/`, `components/`, `lib/`, and `hooks/`. 
- **Identify Changes**: If you spot an Application or service flag that isn't currently documented, read the respective files to understand its purpose.
- **Audit Dependencies**: Review `package.json`. Cross-check the dependencies against the `Built With` section of the `README.md` to catch newly added libraries (e.g., AlaSQL, Shadcn UI) or remove phantom ones (e.g., Zustand) that are no longer used.

### 2. Grab Git Versioning
- Execute `git log -1 --format="%h|%s"` using your terminal tool and grab the latest Git status.
- Determine the current UTC Date/Time.

### 3. Regenerate `PROJECT_STRUCTURE.md`
Re-write the file natively, ensuring:
- **Versioning Block**: 
  - Update `Doc Version` using the format: `<date>.after-<commit-hash>.<kebab-case-commit-summary>`
  - Update `Baseline Commit` to the extracted hash.
  - Update `Baseline Summary` to the extracted summary string.
  - Set `Changes Since Baseline` to `0 (up to date at generation time)`.
  - Update the `Generated At (UTC)` timestamp.
- **Directory Overview**:
  - **Applications**: Iterate over every folder in `Applications/`. Create a concise one-sentence description of the application's intent and technologies (e.g., if it uses OS hooks like `useDatabase`).
  - **Core OS Services (lib)**: Detail all files in `lib/` (e.g., `vfs.ts`, `database.ts`, `registry.ts`, `boot-sequencer.ts`). Clarify their role in system booting or execution. *Be sure to mention ESLint boundaries preventing userland apps from importing these core APIs (if applicable layer boundaries exist).*
  - **System UI (components)**: Document layout shells (`components/layout`), primitive shadcn/radix libraries (`components/ui`), overarching window manager tools (`WindowManager/`), and generic recursive list architectures (`TreeView`, `ItemView`).
  - **Hooks**: Highlight system-level exposed React Hooks (`useDatabase`, `useWindowEngine`, `useMessageBox`, etc.) and what apps use them for.

### 4. Regenerate `README.md`
- Copy the exact new Versioning Block produced for `PROJECT_STRUCTURE.md` into the header of `README.md`.
- Carefully adjust the `## Built With` section to reflect the absolute reality of `package.json`.
- Do not lose or delete any existing setup or installation instructions unless fundamentally changed.

### 5. Finalize
Provide the user with a summary array of what exact Applications, Services, or Dependencies were newly added/removed in the docs compared to when you started.
