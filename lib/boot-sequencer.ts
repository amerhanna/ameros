"use client";

import { vfs } from "./vfs";
import { registry } from "./registry";

/**
 * Defines the critical startup phases of AmerOS.
 * Ensure tasks are slotted into the correct phase to maintain dependency resolution
 * (e.g., Storage must boot before the Kernel reads settings).
 */
export enum BootStage {
  HARDWARE = 0,     // Low-level storage (IndexedDB)
  KERNEL = 1,       // Configuration engine (Registry)
  SERVICES = 2,     // Core OS services (Mounts, Window Store, Clipboard)
  ENVIRONMENT = 3,  // User-space configs (App Registry, Desktop bg, File Assocs)
  SHELL = 4         // Final handover to UI
}

/**
 * Represents a single atomic operation executed during system boot.
 */
export interface BootTask {
  id: string;
  stage: BootStage;
  description: string;
  execute: () => Promise<void>;
}

/**
 * Orchestrates the secure startup protocol for AmerOS.
 * Processes `BootTask` items sequentially according to to their `BootStage` priority.
 */
class BootSequencer {
  private tasks: BootTask[] = [];
  public isBooted = false;

  constructor() {
    this.registerCoreTasks();
  }

  /**
   * Inject new boot tasks from anywhere in the system.
   * Tasks are sorted by stage before execution.
   */
  registerTask(task: BootTask) {
    if (this.tasks.find((t) => t.id === task.id)) return;
    this.tasks.push(task);
    this.tasks.sort((a, b) => a.stage - b.stage);
  }

  private registerCoreTasks() {
    this.registerTask({
      id: "vfs-init",
      stage: BootStage.HARDWARE,
      description: "Initializing Virtual File System...",
      execute: async () => {
        await vfs.init();
      },
    });

    this.registerTask({
      id: "registry-init",
      stage: BootStage.KERNEL,
      description: "Loading System Registry...",
      execute: async () => {
        await registry.init();
      },
    });

    this.registerTask({
      id: "virtual-mounts",
      stage: BootStage.SERVICES,
      description: "Restoring Volume Mounts...",
      execute: async () => {
        // Placeholder: Fetch saved FSA handles from registry and re-mount to VFS
        // const savedMounts = await registry.get('HKEY_LOCAL_MACHINE/System/Mounts', {});
      },
    });

    this.registerTask({
      id: "user-environment",
      stage: BootStage.ENVIRONMENT,
      description: "Loading User Environment...",
      execute: async () => {
        // Placeholder: Load desktop background, Start Menu items, and App associations
        // const theme = await registry.get('HKEY_CURRENT_USER/Control Panel/Desktop/Wallpaper', 'default');
      },
    });
  }

  /**
   * Executes the full boot pipeline sequentially in priority order.
   * Will throw safely if a critical component fails to boot, allowing UI layers
   * to catch and trigger safe mode or recovery actions.
   * 
   * @param onProgress - Callback fired as the Sequencer begins executing each stage.
   * @throws {Error} If any executed BootTask fails to resolve.
   */
  async executeBootSequence(onProgress: (desc: string) => void): Promise<void> {
    if (this.isBooted) return;

    for (const task of this.tasks) {
      onProgress(task.description);
      try {
        await task.execute();
      } catch (error) {
        console.error(`[BootSequencer] Critical failure in task '${task.id}':`, error);
        throw new Error(`Boot failed at: ${task.description}\n\nTechnical details:\n${error}`);
      }
    }

    this.isBooted = true;
  }
}

export const bootSequencer = new BootSequencer();
