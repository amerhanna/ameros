"use client"

import React from 'react';
import { bundledComponents, bundledHandlers } from './bundled-apps';
import { registry } from './registry';
import { vfs } from './vfs';
import type { StartMenuItem, InstalledApp, StartupAppEntry, ApplicationRegistry, Application, AxpManifest } from '@/types/window';

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
      ...bundledHandlers[appKey],
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
 * Also manages the application registry for bundled and dynamic native applications.
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
    const values = await registry.getValues(appKey);

    if (values.type === 'native') {
      const axpRoot = (values.launchArgs as any)?.axpRoot || `/System/Apps/${appId}`;
      await vfs.delete(axpRoot).catch(() => undefined);
    }

    await this.removeFromStartMenu(appId);
    await registry.deleteKey(appKey);
    delete this.applicationRegistry[appId];
    this.dispatchAppRegistryUpdate();
  }

  /**
   * Links an installed application into the "Programs" folder of the Start Menu.
   */
  async addToStartMenu(appId: string, item: StartMenuItem, category?: string) {
    const parentKey = `${this.START_MENU_KEY}/Programs`;
    const categoryKey = category ? await this.ensureStartMenuCategory(parentKey, category) : parentKey;
    const appKey = `${categoryKey}/${appId}`;

    await registry.createKey(appKey);
    if ('label' in item) await registry.set(`${appKey}/label`, item.label);
    if ('component' in item) await registry.set(`${appKey}/component`, (item as any).component);
    if ('launchArgs' in item) await registry.set(`${appKey}/launchArgs`, item.launchArgs || {});

    const order = await registry.get<string[]>(categoryKey, []);
    if (!order.includes(appId)) {
      await registry.set(categoryKey, [...order, appId]);
    }
  }

  /**
   * Removes all shortcuts for the specified application from the "Programs" folder.
   */
  async removeFromStartMenu(appId: string) {
    const parentKey = `${this.START_MENU_KEY}/Programs`;
    await registry.deleteKey(`${parentKey}/${appId}`);

    const order = await registry.get<string[]>(parentKey, []);
    if (order.includes(appId)) {
      await registry.set(parentKey, order.filter(id => id !== appId));
    }

    const appCategories = await registry.getKeys(parentKey);
    for (const category of appCategories) {
      const categoryPath = `${parentKey}/${category}`;
      const categoryOrder = await registry.get<string[]>(categoryPath, []);
      if (categoryOrder.includes(appId)) {
        await registry.deleteKey(`${categoryPath}/${appId}`);
        await registry.set(categoryPath, categoryOrder.filter(id => id !== appId));
      }
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

  async installAxpPackage(file: File) {
    const { ZipReader, BlobReader, TextWriter, Uint8ArrayWriter } = await import('@zip.js/zip.js');
    const zipReader = new ZipReader(new BlobReader(file));

    try {
      const entries = await zipReader.getEntries();
      const manifestEntry = entries.find((entry) => this.normalizeZipPath(entry.filename) === 'manifest.json');

      if (!manifestEntry) {
        throw new Error('AXP package must include manifest.json at the archive root.');
      }

      const manifestText = await (manifestEntry as any).getData!(new TextWriter());
      const manifest = JSON.parse(manifestText) as AxpManifest;
      this.validateManifest(manifest);

      const appId = this.sanitizeAppId(manifest.id);
      const appRoot = `/System/Apps/${appId}`;
      await vfs.delete(appRoot).catch(() => undefined);
      await vfs.mkdir(appRoot);

      try {
        const fileWrites: Promise<void>[] = [];
        for (const entry of entries) {
          const normalizedName = this.normalizeZipPath(entry.filename);
          if (!normalizedName) continue;

          const destinationPath = `${appRoot}/${normalizedName}`;
          if (entry.directory) {
            fileWrites.push(vfs.mkdir(destinationPath));
            continue;
          }

          const parentFolder = destinationPath.substring(0, destinationPath.lastIndexOf('/')) || '/';
          if (!(await vfs.exists(parentFolder))) {
            await vfs.mkdir(parentFolder);
          }

          const data = await (entry as any).getData!(new Uint8ArrayWriter()) as Uint8Array;
          const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
          fileWrites.push(vfs.writeFile(destinationPath, arrayBuffer));
        }

        await Promise.all(fileWrites);

        const entryPointPath = `${appRoot}/${this.normalizeZipPath(manifest.entryPoint)}`;
        if (!(await vfs.exists(entryPointPath))) {
          throw new Error(`AXP entryPoint not found: ${manifest.entryPoint}`);
        }

        const iconUrl = await this.resolveAxpIconUrl(manifest.icon, appRoot);
        await this.installApp({
          id: appId,
          label: manifest.name,
          type: 'native',
          iconUrl,
          launchArgs: {
            axpRoot: appRoot,
            entryPoint: manifest.entryPoint,
            manifestPath: `${appRoot}/manifest.json`,
          },
        });

        await this.addToStartMenu(appId, {
          label: manifest.name,
          component: appId,
          launchArgs: {
            axpRoot: appRoot,
            entryPoint: manifest.entryPoint,
          },
        }, manifest.category);

        const manifestObject = await this.loadAxpManifest(appRoot);
        if (manifestObject) {
          this.applicationRegistry[appId] = this.createAxpApplication(appId, manifestObject, iconUrl || '📦', manifest.name);
        }

        this.dispatchAppRegistryUpdate();
        return appId;
      } catch (error) {
        await vfs.delete(appRoot).catch(() => undefined);
        throw error;
      }
    } finally {
      await zipReader.close();
    }
  }

  async loadAxpModule(appId: string) {
    const appRoot = `/System/Apps/${this.sanitizeAppId(appId)}`;
    const manifest = await this.loadAxpManifest(appRoot);
    if (!manifest) {
      throw new Error(`AXP manifest not found for ${appId}`);
    }

    const entryPoint = `${appRoot}/${this.normalizeZipPath(manifest.entryPoint)}`;
    const moduleBlob = await vfs.readFile(entryPoint);
    const sourceBlob = new Blob([await moduleBlob.arrayBuffer()], { type: 'application/javascript' });
    const objectUrl = URL.createObjectURL(sourceBlob);

    try {
      const loadedModule = await import(/* @vite-ignore */ objectUrl);
      return loadedModule;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const bundledApps = await loadBundledApps();
      const nativeApps = await this.loadInstalledNativeApps();
      this.applicationRegistry = {
        ...bundledApps,
        ...nativeApps,
      };
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

  private async loadInstalledNativeApps(): Promise<ApplicationRegistry> {
    const installed = await this.listInstalledApps();
    const nativeApps = installed.filter((app) => app.type === 'native');
    const loaded: ApplicationRegistry = {};

    for (const app of nativeApps) {
      try {
        const appRoot = (app.launchArgs as any)?.axpRoot || `/System/Apps/${this.sanitizeAppId(app.id)}`;
        const manifest = await this.loadAxpManifest(appRoot);
        if (!manifest) continue;

        const iconUrl = await this.resolveAxpIconUrl(app.iconUrl || manifest.icon, appRoot);
        loaded[app.id] = this.createAxpApplication(app.id, manifest, iconUrl || '📦', app.label);
      } catch (error) {
        console.warn(`Failed to load native app ${app.id}:`, error);
      }
    }

    return loaded;
  }

  private async loadAxpManifest(appRoot: string): Promise<AxpManifest | null> {
    try {
      const manifestBlob = await vfs.readFile(`${appRoot}/manifest.json`);
      const json = await manifestBlob.text();
      const manifest = JSON.parse(json) as AxpManifest;
      this.validateManifest(manifest);
      return manifest;
    } catch {
      return null;
    }
  }

  private async resolveAxpIconUrl(iconValue: string | undefined, appRoot: string): Promise<string | undefined> {
    if (!iconValue) return undefined;

    const trimmed = iconValue.trim();
    if (trimmed.startsWith('data:')) {
      return trimmed;
    }

    const iconPath = trimmed.startsWith('/') ? trimmed : `${appRoot}/${trimmed}`;
    if (await vfs.exists(iconPath)) {
      const blob = await vfs.readFile(iconPath);
      return await this.blobToDataUrl(blob, trimmed);
    }

    return undefined;
  }

  private createAxpApplication(appId: string, manifest: AxpManifest, icon: string, appName: string): Application {
    const LazyComponent = React.lazy(async () => {
      const module = await this.loadAxpModule(appId);
      const exported = module?.default || module;
      return { default: exported };
    });

    const wrapper = (props: any) => {
      return React.createElement(
        React.Suspense,
        { fallback: React.createElement('div', { className: 'p-4 text-sm text-slate-700' }, `Loading ${appName}...`) },
        React.createElement(LazyComponent, props),
      );
    };

    return {
      component: wrapper,
      icon,
      width: 600,
      height: 400,
      resizable: true,
      maximizable: true,
      minimizable: true,
    };
  }

  private validateManifest(manifest: AxpManifest) {
    const missingFields = ['id', 'name', 'version', 'entryPoint'].filter((field) => !manifest[field as keyof AxpManifest]);
    if (missingFields.length > 0) {
      throw new Error(`AXP manifest is missing required field(s): ${missingFields.join(', ')}`);
    }
  }

  private sanitizeAppId(value: string) {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private normalizeZipPath(path: string) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter(Boolean).filter((segment) => segment !== '..' && segment !== '.').join('/');
  }

  private async blobToDataUrl(blob: Blob, fileName?: string) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }

    const base64 = btoa(binary);
    const mimeType = this.getMimeType(fileName || 'bin');
    return `data:${mimeType};base64,${base64}`;
  }

  private getMimeType(fileName: string) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
  }

  private async ensureStartMenuCategory(parentKey: string, category: string) {
    const categoryKey = `${parentKey}/${category}`;
    const order = await registry.get<string[]>(parentKey, []);

    if (!order.includes(category)) {
      await registry.set(parentKey, [...order, category]);
    }

    const values = await registry.getValues(categoryKey);
    if (!values.type) {
      await registry.createKey(categoryKey);
      await registry.set(`${categoryKey}/label`, category);
      await registry.set(`${categoryKey}/type`, 'submenu');
      await registry.set(`${categoryKey}/icon`, '📁');
      await registry.set(categoryKey, []);
    }

    return categoryKey;
  }

  private dispatchAppRegistryUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ameros-app-registry-update', { detail: { timestamp: Date.now() } }));
    }
  }
}

export const appService = new AppService();
