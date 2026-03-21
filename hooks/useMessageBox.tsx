'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWindowContext } from '@/hooks/useWindowContext';

type Resolver<T> = (value: T) => void;

interface MessageBoxProps {
  title: string;
  message: string;
  buttons: string[];
  onResolve: Resolver<string | null>;
}

function MessageBoxContent({ title, message, buttons, onResolve }: MessageBoxProps) {
  const { close } = useWindowContext();
  const resolvedRef = useRef(false);

  const resolveOnce = useCallback(
    (value: string | null) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      onResolve(value);
      close();
    },
    [onResolve, close],
  );

  useEffect(() => {
    return () => {
      if (!resolvedRef.current) {
        onResolve(null);
      }
    };
  }, [onResolve]);

  return (
    <div className="h-full w-full bg-gray-200 p-4 text-black">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="h-8 w-8 shrink-0 border-2 bg-blue-800 text-center text-xl font-bold text-white"
          style={{ borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080' }}
        >
          i
        </div>
        <div className="pt-1 text-sm leading-5">{message}</div>
      </div>

      <div className="flex justify-end gap-2">
        {buttons.map((button) => (
          <Button
            key={button}
            onClick={() => resolveOnce(button)}
            className="h-8 min-w-20 rounded-none bg-gray-200 px-3 text-black hover:bg-gray-300"
            style={{ border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080' }}
          >
            {button}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface InputBoxProps {
  message: string;
  onResolve: Resolver<string | null>;
}

function InputBoxContent({ message, onResolve }: InputBoxProps) {
  const { close } = useWindowContext();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedRef = useRef(false);

  const resolveOnce = useCallback(
    (nextValue: string | null) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      onResolve(nextValue);
      close();
    },
    [onResolve, close],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (!resolvedRef.current) {
        onResolve(null);
      }
    };
  }, [onResolve]);

  const onSubmit = useCallback(() => resolveOnce(value), [resolveOnce, value]);

  return (
    <div className="h-full w-full bg-gray-200 p-4 text-black">
      <div className="mb-3 text-sm leading-5">{message}</div>

      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') resolveOnce(null);
        }}
        className="mb-4 h-8 rounded-none border-2 border-solid bg-white text-sm text-black focus-visible:ring-0"
        style={{ borderTopColor: '#808080', borderLeftColor: '#808080', borderRightColor: '#ffffff', borderBottomColor: '#ffffff' }}
      />

      <div className="flex justify-end gap-2">
        <Button
          onClick={onSubmit}
          className="h-8 min-w-20 rounded-none bg-gray-200 px-3 text-black hover:bg-gray-300"
          style={{ border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080' }}
        >
          OK
        </Button>
        <Button
          onClick={() => resolveOnce(null)}
          className="h-8 min-w-20 rounded-none bg-gray-200 px-3 text-black hover:bg-gray-300"
          style={{ border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080' }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function useMessageBox() {
  const { openChildWindow, getBounds } = useWindowContext();

  const showMessageBox = useCallback(
    async (title: string, message: string, isModal = true, buttons: string[] = ['OK']) => {
      const safeButtons = buttons.length > 0 ? buttons : ['OK'];
      const boxW = 360;
      const boxH = 170;
      const { x: bx, y: by, width: bw, height: bh } = getBounds();
      const px = Math.round(bx + Math.max(0, (bw - boxW) / 2));
      const py = Math.round(by + Math.max(0, (bh - boxH) / 2));

      return new Promise<string | null>((resolve) => {
        const Content = () => (
          <MessageBoxContent
            title={title}
            message={message}
            buttons={safeButtons}
            onResolve={resolve}
          />
        );

        const id = openChildWindow({
          title,
          component: Content,
          width: boxW,
          height: boxH,
          x: px,
          y: py,
          modal: isModal,
          resizable: false,
          maximizable: false,
          minimizable: false,
        });

        if (!id) {
          resolve(null);
        }
      });
    },
    [openChildWindow, getBounds],
  );

  const showInputBox = useCallback(
    async (title: string, message: string, isModal = true) => {
      const boxW = 420;
      const boxH = 180;
      const { x: bx, y: by, width: bw, height: bh } = getBounds();
      const px = Math.round(bx + Math.max(0, (bw - boxW) / 2));
      const py = Math.round(by + Math.max(0, (bh - boxH) / 2));

      return new Promise<string | null>((resolve) => {
        const Content = () => <InputBoxContent message={message} onResolve={resolve} />;

        const id = openChildWindow({
          title,
          component: Content,
          width: boxW,
          height: boxH,
          x: px,
          y: py,
          modal: isModal,
          resizable: false,
          maximizable: false,
          minimizable: false,
        });

        if (!id) {
          resolve(null);
        }
      });
    },
    [openChildWindow, getBounds],
  );

  return useMemo(
    () => ({
      showMessageBox,
      showInputBox,
    }),
    [showMessageBox, showInputBox],
  );
}
