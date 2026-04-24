"use client"

import { bundledComponents, bundledHandlers } from './bundled-apps';
import { registry } from './registry';
import type { StartMenuItem, InstalledApp, StartupAppEntry, ApplicationRegistry } from '@/types/window';

/**
 * Global registry for bundled applications, populated during boot.
 */
let globalBundledApps: ApplicationRegistry = {};

/**
 * Load bundled applications from registry and populate global registry.
 */
export async function loadBundledApps(): Promise<ApplicationRegistry> {
  if (Object.keys(globalBundledApps).length > 0) {
    return globalBundledApps;
  }

  const { registry } = await import('./registry');
  const appsPath = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/Applications';
  const appKeys = await registry.getKeys(appsPath);
  const loaded: ApplicationRegistry = {};

  for (const appKey of appKeys) {
    const appPath = `${appsPath}/${appKey}`;
    const values = await registry.getValues(appPath);
    
    loaded[appKey] = {
      component: bundledComponents[appKey],
      icon: values.icon as string || '❓',
      width: values.width as number || 400,
      height: values.height as number || 300,
      resizable: values.resizable as boolean ?? true,
      maximizable: values.maximizable as boolean ?? true,
      minimizable: values.minimizable as boolean ?? true,
      minWidth: values.minWidth as number,
      minHeight: values.minHeight as number,
      ...bundledHandlers[appKey], // Merge special handlers
    };
  }

  globalBundledApps = loaded;
  return loaded;
}

/**
 * Get the global bundled applications registry.
 */
export function getBundledApps(): ApplicationRegistry {
  return globalBundledApps;
}

/**
 * AppService - Manage system-wide application installation and registration.
 * Handles persisting app metadata to the Registry and managing Start Menu entries.
 * Also manages the application registry for bundled applications.
 */
class AppService {
  private readonly BUNDLED_APPS_KEY = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/Applications';
  private readonly INSTALLED_APPS_KEY = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/InstalledApps';
  private readonly START_MENU_KEY = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu/Items';
  private readonly STARTUP_KEY = 'HKEY_CURRENT_USER/SOFTWARE/AmerOS/Startup';

  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private applicationRegistry: ApplicationRegistry = {};

  /**
   * Registers a new application in the system registry.
   */
  async installApp(app: Omit<InstalledApp, 'installDate'>) {
    const installDate = new Date().toISOString();
    const appKey = `${this.INSTALLED_APPS_KEY}/${app.id}`;
    
    await registry.createKey(appKey);
    await registry.set(`${appKey}/label`, app.label);
    await registry.set(`${appKey}/type`, app.type);
    await registry.set(`${appKey}/iconUrl`, app.iconUrl || null);
    await registry.set(`${appKey}/installDate`, installDate);
    await registry.set(`${appKey}/launchArgs`, app.launchArgs);
  }

  /**
   * Removes application registration and its Start Menu shortcuts.
   */
  async uninstallApp(appId: string) {
    const appKey = `${this.INSTALLED_APPS_KEY}/${appId}`;
    await registry.deleteKey(appKey);
    await this.removeFromStartMenu(appId);
  }

  /**
   * Links an installed application into the "Programs" folder of the Start Menu.
   */
  async addToStartMenu(appId: string, item: StartMenuItem) {
    const parentKey = `${this.START_MENU_KEY}/Programs`;
    const appKey = `${parentKey}/${appId}`;
    
    // 1. Create the entry key with metadata
    await registry.createKey(appKey);
    if ('label' in item) await registry.set(`${appKey}/label`, item.label);
    if ('component' in item) await registry.set(`${appKey}/component`, (item as any).component);
    if ('launchArgs' in item) await registry.set(`${appKey}/launchArgs`, item.launchArgs || {});
    
    // 2. Update the hierarchy map (Default value of the Programs key)
    const order = await registry.get<string[]>(parentKey, []);
    if (!order.includes(appId)) {
      await registry.set(parentKey, [...order, appId]);
    }
  }

  /**
   * Removes all shortcuts for the specified application from the "Programs" folder.
   */
  async removeFromStartMenu(appId: string) {
    const parentKey = `${this.START_MENU_KEY}/Programs`;
    const appKey = `${parentKey}/${appId}`;
    
    // 1. Delete the entry key record
    await registry.deleteKey(appKey);
    
    // 2. Remove from the hierarchy map
    const order = await registry.get<string[]>(parentKey, []);
    if (order.includes(appId)) {
      await registry.set(parentKey, order.filter(id => id !== appId));
    }
  }

  /**
   * Returns a list of all user-installed applications by enumerating registry records.
   */
  async listInstalledApps(): Promise<InstalledApp[]> {
    const keys = await registry.getKeys(this.INSTALLED_APPS_KEY);
    const apps: InstalledApp[] = [];
    
    for (const key of keys) {
      const appPath = `${this.INSTALLED_APPS_KEY}/${key}`;
      const values = await registry.getValues(appPath);
      
      apps.push({
        id: key,
        label: (values.label as string) || key,
        type: (values.type as any) || 'website',
        iconUrl: values.iconUrl as string | undefined,
        installDate: values.installDate as string,
        launchArgs: (values.launchArgs as any) || {}
      });
    }
    
    return apps;
  }

  async listStartupApps(): Promise<StartupAppEntry[]> {
    return await registry.get<StartupAppEntry[]>(this.STARTUP_KEY, []);
  }

  async setStartupApps(entries: StartupAppEntry[]) {
    await registry.set(this.STARTUP_KEY, entries);
  }

  async addStartupApp(entry: StartupAppEntry) {
    const entries = await this.listStartupApps();
    await this.setStartupApps([...entries, entry]);
  }

  async clearStartupApps() {
    await this.setStartupApps([]);
  }

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

export const appService = new AppService();
