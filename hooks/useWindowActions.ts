'use client';

import { useContext } from 'react';
import { WindowContext } from '@/components/WindowManager/WindowContext';

/**
 * Retrieves the current Window Context allowing isolated child applications to interact
 * directly with their host Window frame (e.g., maximizing, minimizing, closing, resizing).
 * 
 * @throws {Error} If called outside of a `<Window>` or `<WindowContext.Provider>` context.
 * @returns The bounding WindowContext providing exactly:
 * - `id`: Unique GUID for this window instance.
 * - `appId`: The registered Application ID string.
 * - `title`: The current display title of the window.
 * - `isActive`: Boolean indicating if this window currently holds Z-index focus.
 * - `openChildWindow(config)`: Function to spawn modal or attached popup frames.
 * - `close()`: Kills this window instance.
 * - `minimize()`: Docks the window to the taskbar.
 * - `maximize()`: Toggles full-screen bounding.
 * - `getBounds()`: Returns current `{ x, y, width, height }` dimensions.
 */
export function useWindowActions() {
  const context = useContext(WindowContext);

  if (!context) {
    throw new Error('useWindowActions must be used within a Window component');
  }

  return context;
}
