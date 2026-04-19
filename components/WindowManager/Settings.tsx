"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { registry } from "@/lib/registry"
import { vfs } from "@/lib/vfs"
import { toast } from "sonner"
import { Download, Upload, RotateCcw, Trash2, AlertTriangle } from "lucide-react"

const REGISTRY_PATH = "C:/Windows/System32/config/SYSTEM.reg";

/** Triggers a browser file download from a Blob. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Prompt the user to select a file and return it. */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

type ConfirmState = {
  message: string;
  action: () => Promise<void>;
} | null;

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state) return null;

  const handleConfirm = async () => {
    onClose();
    await state.action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100 text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
            <p className="text-sm text-gray-500 mt-1">{state.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  variant = "outline",
  loading,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "outline" | "destructive";
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      className="gap-2 text-sm"
      onClick={onClick}
      disabled={loading}
    >
      <Icon className="w-4 h-4" />
      {loading ? "Working..." : label}
    </Button>
  );
}

export default function Settings() {
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const withLoading = useCallback(async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try {
      await fn();
    } catch (err: any) {
      toast.error(err?.message || "Operation failed.");
      console.error(err);
    } finally {
      setLoading(null);
    }
  }, []);

  // --- Registry actions ---
  const handleExportRegistry = () =>
    withLoading("exportReg", async () => {
      const blob = await registry.exportHive();
      downloadBlob(blob, "ameros_registry.json");
      toast.success("Registry exported successfully.");
    });

  const handleImportRegistry = () =>
    withLoading("importReg", async () => {
      const file = await pickFile(".json");
      if (!file) return;
      await registry.importHive(file);
      toast.success("Registry imported successfully. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    });

  const handleResetRegistry = () =>
    setConfirm({
      message: "This will wipe all registry settings and restore them to factory defaults. The system will reload.",
      action: async () => {
        await registry.factoryReset();
      },
    });

  // --- Storage actions ---
  const handleExportStorage = () =>
    withLoading("exportStorage", async () => {
      const blob = await vfs.exportStorage([REGISTRY_PATH]);
      downloadBlob(blob, "ameros_storage.zip");
      toast.success("Internal storage exported successfully.");
    });

  const handleImportStorage = () =>
    withLoading("importStorage", async () => {
      const file = await pickFile(".zip");
      if (!file) return;
      await vfs.importStorage(file);
      toast.success("Internal storage imported successfully. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    });

  const handleResetStorage = () =>
    setConfirm({
      message: "This will delete all files on the internal storage (C: drive), excluding the registry. The system will reload.",
      action: async () => {
        await vfs.clearStorage([REGISTRY_PATH]);
        toast.success("Internal storage cleared. Reloading...");
        setTimeout(() => window.location.reload(), 1000);
      },
    });

  // --- Reset everything ---
  const handleResetEverything = () =>
    setConfirm({
      message: "This will permanently erase ALL data — registry settings, files, and storage. The system will be completely reset to factory state.",
      action: async () => {
        await vfs.factoryReset();
      },
    });

  return (
    <div className="p-6 flex flex-col h-full bg-gray-50 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>
      
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance" className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Dark Mode</Label>
              <p className="text-sm text-gray-500">Enable dark theme across the system.</p>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Transparency Effects</Label>
              <p className="text-sm text-gray-500">Make taskbar and windows slightly transparent.</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Accent Color</Label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                <button 
                  key={color} 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm" 
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-5">
          {/* Registry Management */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold mb-1">Registry</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export, import, or reset the system registry (settings, preferences, and app configurations).
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={Download}
                label="Export Registry"
                loading={loading === "exportReg"}
                onClick={handleExportRegistry}
              />
              <ActionButton
                icon={Upload}
                label="Import Registry"
                loading={loading === "importReg"}
                onClick={handleImportRegistry}
              />
              <ActionButton
                icon={RotateCcw}
                label="Reset Registry"
                variant="destructive"
                onClick={handleResetRegistry}
              />
            </div>
          </div>

          {/* Internal Storage Management */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold mb-1">Internal Storage</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export, import, or reset files on the C: drive. The registry file is excluded from these operations.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={Download}
                label="Export Storage"
                loading={loading === "exportStorage"}
                onClick={handleExportStorage}
              />
              <ActionButton
                icon={Upload}
                label="Import Storage"
                loading={loading === "importStorage"}
                onClick={handleImportStorage}
              />
              <ActionButton
                icon={RotateCcw}
                label="Reset Storage"
                variant="destructive"
                onClick={handleResetStorage}
              />
            </div>
          </div>

          {/* Reset Everything */}
          <div className="p-4 bg-white rounded-lg border border-red-200 shadow-sm">
            <h3 className="text-base font-semibold mb-1 text-red-700">Factory Reset</h3>
            <p className="text-sm text-gray-500 mb-4">
              Permanently erase all data — registry, files, and storage. This action cannot be undone.
            </p>
            <ActionButton
              icon={Trash2}
              label="Reset Everything"
              variant="destructive"
              onClick={handleResetEverything}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4 text-blue-600 font-bold italic">AmerOS</div>
            <p className="text-gray-600 font-medium">Version 1.0.0 (Build 2026.03)</p>
            <p className="text-sm text-gray-400 mt-2">© 2026 AmerH. All rights reserved.</p>
            <div className="mt-6 pt-6 border-t border-gray-100 italic text-sm text-gray-500">
              "Bringing gravity to the antigravity experiment."
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
