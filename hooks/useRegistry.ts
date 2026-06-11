"use client";

import { useContext, useCallback } from "react";
import { registry, RegistryValue } from "@/lib/registry";
import { WindowContext } from "@/components/WindowManager/WindowContext";

/**
 * Resolves the OS registry context isolated to the calling application.
 * Ensures strict security by rejecting non-window callers (prevents cross-app spoofing or global leakages).
 * 
 * @param subPath Optional extra sub-path namespace for organizing application registry settings.
 * @returns Object providing scoped registry methods:
 * - `get(path, defaultValue)`: Get a registry value under application scope.
 * - `set(path, value)`: Set a registry value under application scope.
 * - `createKey(path, defaultValue)`: Create a key path under application scope.
 * - `deleteKey(path)`: Delete a key path under application scope.
 * - `getKeys(path)`: List sub-keys under application scope.
 * - `getValues(path)`: Get all named values under application scope.
 * - `basePath`: The fully qualified base registry path for the application.
 */
export function useRegistry(subPath?: string) {
  const windowContext = useContext(WindowContext);

  // Enforce zero-trust spoofing
  if (!windowContext || !windowContext.appId) {
    throw new Error("SECURITY VIOLATION: useRegistry must be called within an OS Window.");
  }

  const appId = windowContext.appId;
  const basePath = `HKEY_CURRENT_USER/SOFTWARE/AmerOS/Applications/${appId}${subPath ? `/${subPath}` : ""}`;

  const get = useCallback(
    async <T>(path: string, defaultValue: T): Promise<T> => {
      const fullPath = path ? `${basePath}/${path}` : basePath;
      return registry.get<T>(fullPath, defaultValue);
    },
    [basePath]
  );

  const set = useCallback(
    async (path: string, value: RegistryValue): Promise<void> => {
      const fullPath = path ? `${basePath}/${path}` : basePath;
      return registry.set(fullPath, value);
    },
    [basePath]
  );

  const createKey = useCallback(
    async (path: string, defaultValue?: RegistryValue): Promise<void> => {
      const fullPath = path ? `${basePath}/${path}` : basePath;
      return registry.createKey(fullPath, defaultValue);
    },
    [basePath]
  );

  const deleteKey = useCallback(
    async (path: string): Promise<void> => {
      const fullPath = path ? `${basePath}/${path}` : basePath;
      return registry.deleteKey(fullPath);
    },
    [basePath]
  );

  const getKeys = useCallback(
    async (path: string = ""): Promise<string[]> => {
      const fullPath = path ? `${basePath}/${path}` : basePath;
      return registry.getKeys(fullPath);
    },
    [basePath]
  );

  const getValues = useCallback(
    async (path: string = ""): Promise<Record<string, RegistryValue>> => {
      const fullPath = path ? `${basePath}/${path}` : basePath;
      return registry.getValues(fullPath);
    },
    [basePath]
  );

  return {
    get,
    set,
    createKey,
    deleteKey,
    getKeys,
    getValues,
    basePath,
  };
}
