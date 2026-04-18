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
    const items = await registry.get<StartMenuItem[]>(this.START_MENU_KEY, []);
    
    let programsIndex = items.findIndex(i => i.type === 'submenu' && i.label === 'Programs');
    
    if (programsIndex === -1) {
      const newItems: StartMenuItem[] = [
        { type: 'submenu', label: 'Programs', icon: '📂', items: [item] },
        ...items
      ];
      await registry.set(this.START_MENU_KEY, newItems);
    } else {
      const nextItems = [...items];
      const programs = { ...nextItems[programsIndex] } as Extract<StartMenuItem, { type: 'submenu' }>;
      programs.items = [...programs.items, item];
      nextItems[programsIndex] = programs;
      await registry.set(this.START_MENU_KEY, nextItems);
    }
  }

  /**
   * Removes all shortcuts for the specified application from the "Programs" folder.
   */
  async removeFromStartMenu(appId: string) {
    const items = await registry.get<StartMenuItem[]>(this.START_MENU_KEY, []);
    
    const nextItems = items.map(item => {
      if (item.type === 'submenu' && item.label === 'Programs') {
        return {
          ...item,
          items: item.items.filter(sub => {
            if ('launchArgs' in sub && sub.launchArgs?.url === appId) return false;
            if ('component' in sub && sub.component === appId) return false;
            return true;
          })
        };
      }
      return item;
    });
    
    await registry.set(this.START_MENU_KEY, nextItems);
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
