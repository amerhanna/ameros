"use client";

import type React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
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
import { useMessageBox } from "@/hooks/useMessageBox";

/** Core props configuring the base desktop shell environment. */
interface WindowManagerProps {
  children?: React.ReactNode;
  applicationRegistry?: ApplicationRegistry;
}

/**
 * DesktopContent contains the actual UI logic and consumes the window engine.
 * It's nested inside WindowManager to ensure access to the SystemActionsContext.
 */
function DesktopContent({ 
  children, 
  applicationRegistry, 
  engine,
  mounted,
  isSplashFinished,
  setIsSplashFinished
}: WindowManagerProps & { 
  engine: ReturnType<typeof useWindowEngine>,
  mounted: boolean,
  isSplashFinished: boolean,
  setIsSplashFinished: (v: boolean) => void
}) {
  const {
    windows,
    taskbarWindows,
    effectiveActiveWindowId,
    openWindow,
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
    setOnLaunchError,
  } = engine;

  const { showMessageBox } = useMessageBox();

  useEffect(() => {
    setOnLaunchError((appName, launchArgs) => {
      const filePath = launchArgs?.filePath;
      const fileName = filePath ? filePath.split('/').pop() : null;
      
      const message = fileName 
        ? `This file is associated with application "${appName}" which is not found, please reinstall the application.`
        : `Application "${appName}" was not found in the registry, please reinstall the application.`;
      
      showMessageBox("Application Not Found", message);
    });
  }, [setOnLaunchError, showMessageBox]);

  const { combinedStartMenuItems, isStartMenuOpen, toggleStartMenu, closeStartMenu } = useStartMenu();
  const { contextMenu, openWindowMenu, closeWindowMenu } = useDesktopContextMenu();

  const selectedWindow = useMemo(() => windows.find((w) => w.id === contextMenu.windowId), [windows, contextMenu.windowId]);

  return (
    <div className="h-screen bg-teal-600 bg-[url('/ameros-bg.png')] bg-cover bg-center bg-no-repeat overflow-hidden relative">
      {/* Render Windows */}
      {windows.map((window) => {
        const WindowComponent = window.component;
        const isBlocked = blockedWindowIds.has(window.id);
        return (
          <Window
            key={window.id}
            id={window.id}
            appId={window.appId}
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
  );
}

/**
 * The core graphical Shell for AmerOS.
 * This component acts as the desktop background and manages rendering all floating application
 * Windows, the global transparent Context menus, the Taskbar, and the Start Menu.
 * Handles the splash screen mounting logic sequence globally.
 */
export default function WindowManager({ children, applicationRegistry = {} }: WindowManagerProps) {
  const engine = useWindowEngine(applicationRegistry);
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  return (
    <SystemActionsContext.Provider value={{ launchApp: engine.launchApp }}>
      <DesktopContent 
        applicationRegistry={applicationRegistry} 
        engine={engine}
        mounted={engine.mounted}
        isSplashFinished={isSplashFinished}
        setIsSplashFinished={setIsSplashFinished}
      >
        {children}
      </DesktopContent>
    </SystemActionsContext.Provider>
  );
}
