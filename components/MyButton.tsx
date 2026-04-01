import React, { useState, useEffect, useCallback } from 'react';

interface MyButtonProps {
  onClick?: (state: boolean) => void;
  onRightClick?: (e: React.MouseEvent) => void;
  label: string;
  accessButton?: string;
  isDefault?: boolean;
  toggle?: boolean;
  pressed?: boolean;
}

export default function MyButton({
  onClick,
  onRightClick,
  label,
  accessButton,
  isDefault,
  toggle,
  pressed = false,
  ...props
}: MyButtonProps) {
  const [isToggled, setIsToggled] = useState(pressed);
  const [isDepressed, setIsDepressed] = useState(false);
  const [isCapture, setIsCapture] = useState(false);

  useEffect(() => {
    setIsToggled(pressed);
  }, [pressed]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsCapture(false);
    setIsDepressed(false);
  }, []);

  useEffect(() => {
    if (isCapture) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isCapture, handleGlobalMouseUp]);

  const triggerClick = () => {
    const newState = toggle ? !isToggled : false;
    if (toggle) setIsToggled(newState);
    if (onClick) onClick(newState);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsCapture(true);
    setIsDepressed(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      setIsDepressed(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      triggerClick();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      if (isDepressed) {
        triggerClick();
        setIsDepressed(false);
      }
    }
  };

  const visualActive = toggle ? isToggled || isDepressed : isDepressed;

  const renderLabel = () => {
    if (!accessButton) return label;
    const char = accessButton[0];
    const occurrence = parseInt(accessButton.slice(1)) || 1;
    const parts = label.split(new RegExp(`(${char})`, 'gi'));
    let count = 0;

    return parts.map((part, index) => {
      if (part.toLowerCase() === char.toLowerCase()) {
        count++;
        if (count === occurrence)
          return (
            <u key={index} className="no-underline border-b border-black">
              {part}
            </u>
          );
      }
      return part;
    });
  };

  return (
    <div
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => isCapture && setIsDepressed(true)}
      onMouseLeave={() => setIsDepressed(false)}
      onMouseUp={() => isCapture && isDepressed && triggerClick()}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick?.(e);
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      className={`
        group relative inline-block cursor-default select-none bg-[#c0c0c0] outline-none
        border
        ${
          visualActive
            ? 'border-t-[#808080] border-l-[#808080] border-b-white border-r-white'
            : 'border-t-white border-l-white border-b-black border-r-black'
        }
        ${isDefault && !visualActive ? 'outline outline-1 outline-black -outline-offset-[1px]' : ''}
      `}
      {...props}
    >
      <div
        className={`
          flex items-center justify-center font-['Tahoma','Microsoft_Sans_Serif',sans-serif] text-[12px]
          border
          relative overflow-clip
          ${
            visualActive
              ? 'border-t-black border-l-black border-b-[#c0c0c0] border-r-[#c0c0c0]'
              : 'border-t-[#c0c0c0] border-l-[#c0c0c0] border-b-[#808080] border-r-[#808080]'
          }
        `}
      >
        {/* The Dotted Focus Ring Wrapper */}
        <div
          className={` flex gap-1 items-center justify-center
          px-[2px] py-[1px] border border-dotted border-transparent
          group-focus:border-black
          ${visualActive ? 'translate-x-[1px] translate-y-[1px]' : ''}
        `}
        >
          <span>{renderLabel()}</span>
        </div>
      </div>
    </div>
  );
}
