"use client";

import { vfs } from "./vfs";
import { registry } from "./registry";
import { dbService } from "./database";
import { appService } from "./app-service";
import type { StartupAppEntry } from "@/types/window";

/**
 * Defines the critical startup phases of AmerOS.
 * Ensure tasks are slotted into the correct phase to maintain dependency resolution
 * (e.g., Storage must boot before the Kernel reads settings).
 */
export enum BootStage {
  HARDWARE = 0, // Low-level storage (IndexedDB)
  KERNEL = 1, // Configuration engine (Registry)
  SERVICES = 2, // Core OS services (Mounts, Window Store, Clipboard)
  ENVIRONMENT = 3, // User-space configs (App Registry, Desktop bg, File Assocs)
  SHELL = 4, // Final handover to UI
}

/**
 * Represents a single atomic operation executed during system boot.
 */
export interface BootTask {
  id: string;
  stage: BootStage;
  description: string;
  execute: (yieldStatus?: (status: string) => void) => Promise<void>;
}

/**
 * Orchestrates the secure startup protocol for AmerOS.
 * Processes `BootTask` items sequentially according to to their `BootStage` priority.
 */
class BootSequencer {
  private tasks: BootTask[] = [];
  public isBooted = false;
  private executePromise: Promise<void> | null = null;

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
      description: "Initializing Virtual File System",
      execute: async (yieldStatus) => {
        await vfs.init(yieldStatus);
      },
    });

    this.registerTask({
      id: "registry-init",
      stage: BootStage.KERNEL,
      description: "Loading System Registry",
      execute: async () => {
        await registry.init();
      },
    });

    this.registerTask({
      id: "bundled-apps-init",
      stage: BootStage.SERVICES,
      description: "Loading Bundled Applications",
      execute: async () => {
        await appService.init();
      },
    });

    this.registerTask({
      id: "database-init",
      stage: BootStage.SERVICES,
      description: "Starting Database Engine",
      execute: async () => {
        await dbService.init();
      },
    });

    this.registerTask({
      id: "user-environment",
      stage: BootStage.ENVIRONMENT,
      description: "Loading User Environment",
      execute: async () => {
        // Placeholder: Load desktop background, Start Menu items, and App associations
        // const theme = await registry.get('HKEY_CURRENT_USER/Control Panel/Desktop/Wallpaper', 'default');
      },
    });

    this.registerTask({
      id: "startup-apps",
      stage: BootStage.SHELL,
      description: "Launching startup applications",
      execute: async () => {
        if (typeof window === "undefined") return;

        const startupApps = await registry.get<StartupAppEntry[]>("HKEY_CURRENT_USER/SOFTWARE/AmerOS/Startup", []);

        if (!Array.isArray(startupApps) || startupApps.length === 0) return;

        // Store startup apps for WindowManager to launch on mount
        await registry.set("HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartupAppsToLaunch", startupApps);
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
    if (this.executePromise) return this.executePromise;

    this.executePromise = (async () => {
      for (const task of this.tasks) {
        onProgress(task.description);
        console.log(`[BootSequencer] Starting task: ${task.description}`);
        try {
          await task.execute((status) => {onProgress(`${task.description} - ${status}`);console.log(`[BootSequencer] ${task.description} - ${status}`)});
        } catch (error) {
          this.executePromise = null;
          console.error(`[BootSequencer] Critical failure in task '${task.id}':`, error);
          throw new Error(`Boot failed at: ${task.description}\n\nTechnical details:\n${error}`);
        }
      }
      this.isBooted = true;
    })();

    return this.executePromise;
  }
}

export const bootSequencer = new BootSequencer();
