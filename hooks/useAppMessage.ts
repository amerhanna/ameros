import { useEffect } from 'react';
import { appService } from '@/lib/app-service';
import { useGetWindowState } from './useGetWindowState';

/**
 * Hook for applications to receive messages (like file open requests)
 * while they are running, allowing them to act as single-instance applications.
 *
 * @param handler A callback that receives the message payload. Return true if the message was handled.
 */
export function useAppMessage(handler: (message: any) => boolean) {
  const { id } = useGetWindowState(['id']);

  useEffect(() => {
    if (id) {
      appService.registerMessageHandler(id, handler);
      return () => {
        appService.registerMessageHandler(id, undefined);
      };
    }
  }, [id, handler]);
}
