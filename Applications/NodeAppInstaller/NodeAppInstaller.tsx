"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { WebContainer } from '@webcontainer/api';
import { vfs } from "@/lib/vfs";
import { ZipReader, BlobReader, BlobWriter } from '@zip.js/zip.js';

async function extractZipToVfs(zipBuffer: ArrayBuffer, targetPath: string) {
  const zipReader = new ZipReader(new BlobReader(new Blob([zipBuffer])));
  const entries = await zipReader.getEntries();

  // Find the root folder (GitHub zips have a folder like "repo-main/")
  const rootEntry = entries.find(entry => entry.directory && entry.filename.split('/').length === 2);
  if (!rootEntry) throw new Error('Could not find root directory in zip');

  const rootFolder = rootEntry.filename;

  for (const entry of entries) {
    if (!entry.directory && entry.filename.startsWith(rootFolder)) {
      const relativePath = entry.filename.replace(rootFolder, '');
      const vfsPath = targetPath + relativePath;

      // Ensure parent directory exists
      const parentDir = vfsPath.substring(0, vfsPath.lastIndexOf('/'));
      if (parentDir && !(await vfs.exists(parentDir))) {
        await vfs.mkdir(parentDir);
      }

      // Write file
      const content = await entry.getData(new BlobWriter());
      const arrayBuffer = await content.arrayBuffer();
      await vfs.writeFile(vfsPath, arrayBuffer);
    }
  }

  await zipReader.close();
}

export default function NodeAppInstaller() {
  const [status, setStatus] = useState<'idle' | 'extracting' | 'installing' | 'running' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLTextAreaElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const installApp = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addLog('Please select a ZIP file first');
      setStatus('error');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      addLog('Please select a valid ZIP file');
      setStatus('error');
      return;
    }

    try {
      setStatus('extracting');
      setProgress(10);
      addLog(`Processing ${file.name}...`);

      const zipBuffer = await file.arrayBuffer();
      setProgress(30);

      addLog('Extracting files...');
      const targetPath = `/home/${file.name.replace('.zip', '')}`;
      await extractZipToVfs(zipBuffer, targetPath);
      setProgress(50);

      setStatus('installing');
      addLog('Setting up WebContainer...');

      // Initialize WebContainer
      const container = await WebContainer.boot();
      setWebContainer(container);

      const fileTree: any = {};

      const buildFileTree = async (basePath: string, tree: any) => {
        const items = await vfs.readDir(basePath);
        for (const item of items) {
          const fullPath = `${basePath}/${item.name}`;
          if (item.type === 'dir') {
            tree[item.name] = { directory: {} };
            await buildFileTree(fullPath, tree[item.name].directory);
          } else {
            const content = await vfs.readFile(fullPath);
            const text = await content.text();
            tree[item.name] = { file: { contents: text } };
          }
        }
      };

      await buildFileTree(targetPath, fileTree);

      await container.mount(fileTree);
      setProgress(70);

      addLog('Installing dependencies...');
      const installProcess = await container.spawn('npm', ['install']);
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          addLog(data);
        }
      }));

      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        throw new Error('npm install failed');
      }

      setProgress(90);
      setStatus('running');
      addLog('Starting application...');

      const runProcess = await container.spawn('npm', ['start']);
      setIsRunning(true);

      runProcess.output.pipeTo(new WritableStream({
        write(data) {
          addLog(data);
        }
      }));

      setProgress(100);
      addLog('Application started successfully!');

    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const stopApp = async () => {
    if (webContainer) {
      await webContainer.teardown();
      setWebContainer(null);
      setIsRunning(false);
      addLog('Application stopped');
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Node.js App Installer</CardTitle>
          <CardDescription>
            Upload and run Node.js applications from ZIP files using WebContainer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept=".zip"
              ref={fileInputRef}
              className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <Button
              onClick={installApp}
              disabled={status !== 'idle' && status !== 'error'}
            >
              {status === 'idle' ? 'Install' : 'Installing...'}
            </Button>
            {isRunning && (
              <Button variant="destructive" onClick={stopApp}>
                Stop
              </Button>
            )}
          </div>

          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Progress:</span>
                <Progress value={progress} className="flex-1" />
                <Badge variant={status === 'error' ? 'destructive' : 'default'}>
                  {status}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terminal Output</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={terminalRef}
            value={logs.join('\n')}
            readOnly
            className="h-96 font-mono text-sm"
            placeholder="Installation logs will appear here..."
          />
        </CardContent>
      </Card>
    </div>
  );
}