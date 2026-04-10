"use client";

import type React from "react";

import { useState, useMemo } from "react";
import Window from "@/components/WindowManager/Window";
import Taskbar from "@/components/WindowManager/Taskbar";
import StartMenu from "@/components/WindowManager/StartMenu";
import WindowContextMenu from "@/components/WindowManager/WindowContextMenu";
import SplashScreen from "@/components/WindowManager/SplashScreen";
import { SystemActionsContext } from "@/components/WindowManager/WindowContext";
import type { StartMenuItem, ApplicationRegistry } from "@/types/window";
import { useWindowEngine } from "@/hooks/useWindowEngine";
import { useStartMenu } from "@/hooks/useStartMenu";
import { useDesktopContextMenu } from "@/hooks/useDesktopContextMenu";

interface WindowManagerProps {
  children?: React.ReactNode;
  applicationRegistry?: ApplicationRegistry;
  startMenuItems?: StartMenuItem[];
}

export default function WindowManager({ children, applicationRegistry = {}, startMenuItems = [] }: WindowManagerProps) {
  const {
    mounted,
    windows,
    taskbarWindows,
    effectiveActiveWindowId,
    openWindow,
    launchApp,
    openChildWindow,
    closeWindow,
    setWindowBeforeClose,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    handleTaskbarWindowSelect,
    blockedWindowIds,
  } = useWindowEngine(applicationRegistry);

  const { combinedStartMenuItems, isStartMenuOpen, toggleStartMenu, closeStartMenu } = useStartMenu(startMenuItems);

  const { contextMenu, openWindowMenu, closeWindowMenu } = useDesktopContextMenu();

  const [isSplashFinished, setIsSplashFinished] = useState(false);

  const selectedWindow = useMemo(() => windows.find((w) => w.id === contextMenu.windowId), [windows, contextMenu.windowId]);

  return (
    <SystemActionsContext.Provider value={{ launchApp }}>
      <div className="h-screen bg-teal-600 bg-[url('/ameros-bg.png')] bg-cover bg-center bg-no-repeat overflow-hidden relative">
        {/* Render Windows */}
        {windows.map((window) => {
          const WindowComponent = window.component;
          const isBlocked = blockedWindowIds.has(window.id);
          return (
            <Window
              key={window.id}
              id={window.id}
              title={window.title}
              icon={window.icon}
              isActive={effectiveActiveWindowId === window.id}
              resizable={window.resizable}
              minWidth={window.minWidth}
              minHeight={window.minHeight}
              maximizable={window.maximizable}
              minimizable={window.minimizable}
              launchArgs={window.launchArgs}
              isBlocked={isBlocked}
              onMinimize={minimizeWindow}
              onMaximize={maximizeWindow}
              onClose={closeWindow}
              onFocus={focusWindow}
              onMove={moveWindow}
              onResize={resizeWindow}
              onContextMenu={openWindowMenu}
              setBeforeClose={(fn) => setWindowBeforeClose(window.id, fn)}
              openChildWindow={(config) => openChildWindow(window.id, config)}
            >
              <WindowComponent {...(window.launchArgs || {})} />
            </Window>
          );
        })}

        {/* Start Menu */}
        <StartMenu
          isOpen={isStartMenuOpen}
          onClose={closeStartMenu}
          onOpenWindow={openWindow}
          items={combinedStartMenuItems}
          applicationRegistry={applicationRegistry}
        />

        {/* Taskbar */}
        <Taskbar
          windows={taskbarWindows}
          activeWindowId={effectiveActiveWindowId}
          onWindowSelect={handleTaskbarWindowSelect}
          onStartMenuToggle={toggleStartMenu}
          isStartMenuOpen={isStartMenuOpen}
          onContextMenu={openWindowMenu}
        />

        {contextMenu.isOpen && selectedWindow && (
          <WindowContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isMaximized={!!selectedWindow.isMaximized}
            isMinimized={!!selectedWindow.isMinimized}
            maximizable={!!selectedWindow.maximizable}
            onClose={() => closeWindow(selectedWindow.id)}
            onMinimize={() => minimizeWindow(selectedWindow.id)}
            onMaximize={() => !selectedWindow.isMaximized && maximizeWindow(selectedWindow.id)}
            onRestore={() => selectedWindow.isMaximized && maximizeWindow(selectedWindow.id)}
            onMove={() => focusWindow(selectedWindow.id)}
            onResize={() => focusWindow(selectedWindow.id)}
            onDismiss={closeWindowMenu}
          />
        )}

        {/* Custom Content */}
        {children}

        {/* Splash Screen Overlay */}
        {(!mounted || !isSplashFinished) && <SplashScreen onFinish={() => setIsSplashFinished(true)} minDuration={1500} />}
      </div>
    </SystemActionsContext.Provider>
  );
}
