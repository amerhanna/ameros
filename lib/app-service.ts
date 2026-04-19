"use client"

import { registry } from './registry';
import type { StartMenuItem, InstalledApp } from '@/types/window';

/**
 * AppService - Manage system-wide application installation and registration.
 * Handles persisting app metadata to the Registry and managing Start Menu entries.
 */
class AppService {
  private readonly INSTALLED_APPS_KEY = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/InstalledApps';
  private readonly START_MENU_KEY = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu/Items';

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
}

export const appService = new AppService();
