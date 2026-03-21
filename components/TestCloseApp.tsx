'use client';

import { useEffect, useState } from 'react';
import { useWindowContext } from '@/hooks/useWindowContext';
import { useMessageBox } from '@/hooks/useMessageBox';
import { Button } from '@/components/ui/button';

export default function TestCloseApp() {
  const { setBeforeClose } = useWindowContext();
  const { showMessageBox } = useMessageBox();
  const [shouldPreventClose, setShouldPreventClose] = useState(true);

  useEffect(() => {
    if (shouldPreventClose) {
      setBeforeClose(() =>
        showMessageBox(
          'Close window',
          'Do you really want to close this window?',
          true,
          ['Yes', 'No'],
        ).then((choice) => choice === 'Yes'),
      );
    } else {
      setBeforeClose(undefined);
    }
  }, [shouldPreventClose, setBeforeClose, showMessageBox]);

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
          When enabled, trying to close this window opens a Win95-style confirmation dialog.
        </p>
        <Button onClick={() => void showMessageBox('TestCloseApp', 'Still here!', true)}>
          Interact with App
        </Button>
      </div>
    </div>
  );
}
