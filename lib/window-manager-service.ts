"use client";

import type { ApplicationRegistry } from "@/types/window";
import { getBundledApps, loadBundledApps } from "./bundled-apps";

/**
 * Service for managing the Window Manager's application registry.
 * Initializes bundled applications during boot sequence.
 */
class WindowManagerService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private applicationRegistry: ApplicationRegistry = {};

  /**
   * Initialize the service by loading bundled applications.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.applicationRegistry = await loadBundledApps();
      this.initialized = true;
    })();

    return this.initPromise;
  }

  /**
   * Await service readiness.
   */
  async waitUntilReady(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      await this.init();
      return;
    }
    await this.initPromise;
  }

  /**
   * Get the current application registry.
   */
  getApplicationRegistry(): ApplicationRegistry {
    return this.applicationRegistry;
  }

  /**
   * Merge additional applications into the registry.
   */
  mergeApplications(additional: ApplicationRegistry): ApplicationRegistry {
    return {
      ...this.applicationRegistry,
      ...additional,
    };
  }
}

export const windowManagerService = new WindowManagerService();