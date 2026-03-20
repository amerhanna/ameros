'use client';

import { useEffect, useState } from 'react';
import { useWindow } from '@/hooks/useWindow';
import { Button } from '@/components/ui/button';

export default function TestCloseApp() {
  const { setBeforeClose } = useWindow();
  const [shouldPreventClose, setShouldPreventClose] = useState(true);

  useEffect(() => {
    if (shouldPreventClose) {
      setBeforeClose(() => {
        return confirm('Hook: Do you really want to close this window?');
      });
    } else {
      setBeforeClose(undefined);
    }
  }, [shouldPreventClose, setBeforeClose]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Close Interception Test</h2>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="preventClose" 
            checked={shouldPreventClose} 
            onChange={(e) => setShouldPreventClose(e.target.checked)}
          />
          <label htmlFor="preventClose">Enable beforeClose via Hook</label>
        </div>
        <p className="text-sm text-gray-600">
          When enabled, trying to close this window will trigger a confirmation dialog.
        </p>
        <Button onClick={() => window.alert('Still here!')}>
          Interact with App
        </Button>
      </div>
    </div>
  );
}
