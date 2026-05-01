"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { registry } from "@/lib/registry";
import { appService } from "@/lib/app-service";
import { setWindowsState } from "@/lib/window-store";
import type { StartMenuItem, InstalledApp } from "@/types/window";
import Image from "next/image";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchTitleFromUrl(urlString: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await fetch(urlString, { mode: "cors", signal });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const html = await response.text();
    const match = html.match(/<title>([^<]*)<\/title>/i);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  } catch {
    // CORS restrictions are expected; fallback to domain-only title
  }

  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return urlString;
  }
}

function getFaviconUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}`;
  } catch {
    return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(urlString);
  }
}

const FEATURED_APPS = [
  {
    id: "wikipedia",
    label: "Wikipedia",
    url: "https://www.wikipedia.org",
    iconUrl: "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128",
  },
  {
    id: "photopea",
    label: "Photopea",
    url: "https://www.photopea.com/",
    iconUrl: "https://www.google.com/s2/favicons?domain=photopea.com&sz=128",
  },
  {
    id: "vectorpea",
    label: "Vectorpea",
    url: "https://www.vectorpea.com/",
    iconUrl: "https://www.google.com/s2/favicons?domain=vectorpea.com&sz=128",
  },
  {
    id: "jampea",
    label: "Jampea",
    url: "https://jampea.com/",
    iconUrl: "https://www.google.com/s2/favicons?domain=jampea.com&sz=128",
  },
];

export default function InstallerApp() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const apps = await appService.listInstalledApps();
      if (mounted) setInstalledApps(apps);
    }
    load();

    const handleUpdate = (e: CustomEvent) => {
      if (e.detail.path.startsWith('HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/InstalledApps')) {
         load();
      }
    };
    window.addEventListener('reg-update', handleUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('reg-update', handleUpdate as EventListener);
    };
  }, []);

  const validUrl = isValidHttpUrl(url);

  useEffect(() => {
    if (!url || !validUrl) {
      setTitle("");
      setIconUrl("");
      setError("");
      setLoading(false);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      let cancelled = false;
      const controller = new AbortController();

      async function loadMetadata() {
        setLoading(true);
        setError("");
        const normalizedUrl = new URL(url).toString();

        const siteTitle = await fetchTitleFromUrl(normalizedUrl, controller.signal);
        if (cancelled) return;
        setTitle(siteTitle);
        setIconUrl(getFaviconUrl(normalizedUrl));
        setLoading(false);
      }

      loadMetadata().catch((err) => {
        if (!cancelled) {
          setError("Unable to fetch metadata; using defaults.");
          setTitle(url);
          setIconUrl(getFaviconUrl(url));
          setLoading(false);
        }
      });

      return () => {
        cancelled = true;
        controller.abort();
      };
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [url, validUrl]);

  async function installApp() {
    if (!validUrl) {
      setError("Please enter a valid HTTP/HTTPS URL.");
      return;
    }

    const externalLabel = title || new URL(url).hostname || url;
    const appId = new URL(url).hostname; // Use hostname as ID for simplicity

    const appData: Omit<InstalledApp, 'installDate'> = {
      id: appId,
      label: externalLabel,
      type: 'website',
      iconUrl: iconUrl,
      launchArgs: {
        url: new URL(url).toString(),
        title: externalLabel,
        iconUrl,
      },
    };

    await appService.installApp(appData);
    
    // Also add to start menu
    await appService.addToStartMenu(appId, {
      label: externalLabel,
      component: 'WebApp',
      launchArgs: appData.launchArgs,
      icon: iconUrl
    });

    setUrl("");
    setTitle("");
    setIconUrl("");
    setError("");
  }

  async function renameApp(appId: string, newLabel: string) {
    const appPath = `HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/InstalledApps/${appId}`;
    await registry.set(`${appPath}/label`, newLabel);
    
    // Update launch args title too
    const launchArgs = await registry.get<any>(`${appPath}/launchArgs`);
    if (launchArgs) {
      launchArgs.title = newLabel;
      await registry.set(`${appPath}/launchArgs`, launchArgs);
    }

    // Update start menu label
    const startMenuPath = `HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu/Programs/${appId}`;
    if (await registry.hasKey(startMenuPath)) {
      await registry.set(`${startMenuPath}/label`, newLabel);
      if (launchArgs) {
        await registry.set(`${startMenuPath}/launchArgs`, launchArgs);
      }
    }
    
    // Refresh list
    const apps = await appService.listInstalledApps();
    setInstalledApps(apps);
  }

  async function uninstallApp(appId: string, itemUrl: string) {
    await appService.uninstallApp(appId);
    setWindowsState((prev) => prev.filter((w) => !(w.component === 'WebApp' && w.launchArgs?.url === itemUrl)));
  }

  async function installFeaturedApp(app: typeof FEATURED_APPS[0]) {
    const appData: Omit<InstalledApp, 'installDate'> = {
      id: app.id,
      label: app.label,
      type: 'website',
      iconUrl: app.iconUrl,
      launchArgs: {
        url: app.url,
        title: app.label,
        iconUrl: app.iconUrl,
      },
    };

    await appService.installApp(appData);
    await appService.addToStartMenu(app.id, {
      label: app.label,
      component: 'WebApp',
      launchArgs: appData.launchArgs,
      icon: app.iconUrl
    });
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>External App Installer</CardTitle>
          <CardDescription>
            Install a URL-based web application into the AmerOS Start Menu (Category 1).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block text-sm font-medium text-muted-foreground">App URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            aria-label="External application URL"
          />
          {!validUrl && url && (
            <p className="text-sm text-red-500">URL must start with http:// or https://</p>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">App Name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Application Name"
              aria-label="Application name"
            />
          </div>

          <div className="p-3 border rounded-md bg-muted">
            <p className="text-sm font-medium">Discovery Preview</p>
            {loading ? (
              <p className="text-sm">Loading metadata...</p>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <Image
                  src={iconUrl || "https://www.google.com/s2/favicons?domain=google.com"}
                  width={16}
                  height={16}
                  alt="favicon"
                  className="rounded"
                />
                <span className="font-semibold">{title || (validUrl ? new URL(url).hostname : "No site metadata")}</span>
              </div>
            )}
            {validUrl && (
              <div className="mt-3">
                <p className="text-sm font-medium">Iframe Test:</p>
                <iframe
                  src={url}
                  className="w-full h-32 border rounded mt-1"
                  title="Test iframe"
                />
              </div>
            )}
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}
        </CardContent>
        <CardFooter>
          <Button variant="default" onClick={installApp} disabled={!validUrl || loading}>
            Install to Start Menu
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Web Apps</CardTitle>
          <CardDescription>
            Quickly install popular web applications to your AmerOS desktop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURED_APPS.map((app) => {
              const isInstalled = installedApps.some(a => a.id === app.id);
              return (
                <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image
                        src={app.iconUrl}
                        fill
                        alt={app.label}
                        className="rounded object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{app.label}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{app.url}</span>
                    </div>
                  </div>
                  <Button 
                    variant={isInstalled ? "secondary" : "outline"} 
                    size="sm"
                    disabled={isInstalled}
                    onClick={() => installFeaturedApp(app)}
                  >
                    {isInstalled ? "Installed" : "Install"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {installedApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Installed External Apps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {installedApps.map((item) => (
                <li key={item.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Image
                      src={item.iconUrl || "https://www.google.com/s2/favicons?domain=google.com"}
                      width={16}
                      height={16}
                      alt="icon"
                      className="rounded"
                    />
                    <div className="flex flex-col">
                      <Input
                        value={item.label}
                        className="h-7 py-0 px-2 text-sm w-32 sm:w-48"
                        onChange={(e) => renameApp(item.id, e.target.value)}
                      />
                      <span className="text-[10px] text-muted-foreground px-2 truncate max-w-[150px]">
                        {item.launchArgs.url}
                      </span>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => uninstallApp(item.id, item.launchArgs.url)}>
                    Uninstall
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
