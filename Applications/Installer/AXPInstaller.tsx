"use client";

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { appService } from '@/lib/app-service';
import type { InstalledApp, AxpManifest } from '@/types/window';

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter(Boolean).filter((segment) => segment !== '..' && segment !== '.').join('/');
}

function getMimeType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

async function blobToDataUrl(blob: Blob, fileName?: string) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = getMimeType(fileName || 'bin');
  return `data:${mimeType};base64,${base64}`;
}

export default function AXPInstaller() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<AxpManifest | null>(null);
  const [iconPreview, setIconPreview] = useState<string | undefined>();
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const activeReaderRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    const loadInstalled = async () => {
      const apps = await appService.listInstalledApps();
      if (mounted) setInstalledApps(apps.filter((app) => app.type === 'native'));
    };

    loadInstalled();

    const handleUpdate = (e: CustomEvent) => {
      if (e.detail.path.startsWith('HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/InstalledApps')) {
        loadInstalled();
      }
    };

    window.addEventListener('reg-update', handleUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('reg-update', handleUpdate as EventListener);
      if (activeReaderRef.current) {
        activeReaderRef.current.close?.();
      }
    };
  }, []);

  const parseManifestFromFile = async (file: File) => {
    const { ZipReader, BlobReader, TextWriter, Uint8ArrayWriter } = await import('@zip.js/zip.js');
    const zipReader = new ZipReader(new BlobReader(file));
    activeReaderRef.current = zipReader;

    try {
      const entries = await zipReader.getEntries();
      const manifestEntry = entries.find((entry) => normalizeZipPath(entry.filename) === 'manifest.json');
      if (!manifestEntry) {
        throw new Error('The selected file does not contain a manifest.json at its root.');
      }

      const manifestText = await (manifestEntry as any).getData!(new TextWriter());
      const manifest = JSON.parse(manifestText) as AxpManifest;
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.entryPoint) {
        throw new Error('AXP manifest is missing a required field.');
      }

      let iconUrl: string | undefined;
      if (manifest.icon) {
        const rawIcon = manifest.icon.trim();
        if (rawIcon.startsWith('data:')) {
          iconUrl = rawIcon;
        } else {
          const iconPath = normalizeZipPath(rawIcon);
          const iconEntry = entries.find((entry) => normalizeZipPath(entry.filename) === iconPath);
          if (iconEntry) {
            const iconBlob = await (iconEntry as any).getData!(new Uint8ArrayWriter());
            iconUrl = await blobToDataUrl(new Blob([iconBlob]), iconPath);
          }
        }
      }

      setManifest(manifest);
      setIconPreview(iconUrl);
      setError('');
      setStatus('');
    } finally {
      await zipReader.close();
      activeReaderRef.current = null;
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setManifest(null);
    setIconPreview(undefined);
    setError('');
    setStatus('');

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.axp')) {
      setError('Only .axp files are supported.');
      return;
    }

    try {
      await parseManifestFromFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read AXP package.');
    }
  };

  const installPackage = async () => {
    if (!selectedFile || !manifest) return;
    setLoading(true);
    setError('');
    setStatus('');

    try {
      await appService.installAxpPackage(selectedFile);
      setStatus(`Installed ${manifest.name} successfully.`);
      setSelectedFile(null);
      setManifest(null);
      setIconPreview(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AXP Installer</CardTitle>
          <CardDescription>
            Install a portable .axp application package into AmerOS. The package must include a
            manifest.json and a pre-bundled React entry point.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm font-medium text-muted-foreground">AXP Package File</label>
          <Input type="file" accept=".axp" onChange={handleFileChange} />

          {manifest && (
            <div className="p-3 border rounded-md bg-muted">
              <div className="flex items-center gap-3">
                {iconPreview ? (
                  <img src={iconPreview} alt="AXP Icon" className="w-10 h-10 rounded" />
                ) : (
                  <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center text-lg">📦</div>
                )}
                <div>
                  <p className="font-semibold">{manifest.name}</p>
                  <p className="text-sm text-muted-foreground">{manifest.id} • v{manifest.version}</p>
                  <p className="text-sm text-muted-foreground">Entry: {manifest.entryPoint}</p>
                  {manifest.category && <p className="text-sm text-muted-foreground">Category: {manifest.category}</p>}
                </div>
              </div>
            </div>
          )}

          {(error || status) && (
            <div className="rounded-md p-3 text-sm" style={{ backgroundColor: error ? '#fde2e2' : '#e6f7ff', color: error ? '#9b1c1c' : '#0c5460' }}>
              {error || status}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={installPackage} disabled={!selectedFile || !manifest || loading}>
            {loading ? 'Installing...' : 'Install AXP'}
          </Button>
        </CardFooter>
      </Card>

      {installedApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Installed Native Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {installedApps.map((app) => (
                <li key={app.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-slate-100">
                      {app.iconUrl ? <img src={app.iconUrl} alt={app.label} className="w-6 h-6" /> : '📦'}
                    </div>
                    <div>
                      <p className="font-medium">{app.label}</p>
                      <p className="text-xs text-muted-foreground">{app.id}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(app.installDate).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
