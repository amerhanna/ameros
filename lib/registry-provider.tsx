"use client"

import { createContext, useContext, useEffect } from 'react';
import { registry } from '@/lib/registry';

const RegistryContext = createContext<typeof registry>(registry);

export function RegistryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registry.init();
  }, []);

  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  );
}

export function useRegistry() {
  return useContext(RegistryContext);
}