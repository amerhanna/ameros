"use client";

import type React from "react";
import type { Application, ApplicationRegistry } from "@/types/window";
import DemoApp from '@/Applications/DemoApp/DemoApp';
import TextEditor from '@/Applications/TextEditor/TextEditor';
import Calculator from '@/Applications/Calculator/Calculator';
import FileExplorer from '@/Applications/FileExplorer/FileExplorer';
import Settings from '@/components/WindowManager/Settings';
import TestCloseApp from '@/Applications/TestCloseApp/TestCloseApp';
import CommonDialogDemo from '@/Applications/DemoApp/CommonDialogDemo';
import InstallerApp from '@/Applications/Installer/InstallerApp';
import WebApp from '@/Applications/WebApp/WebApp';
import Regedit from '@/Applications/Regedit/Regedit';
import DBExplorer from '@/Applications/DBExplorer/DBExplorer';
import Jampea from '@/Applications/Jampea/Jampea';
import Notes from '@/Applications/Notes/Notes';
import PDFViewer from '@/Applications/PDFViewer/PDFViewer';
import Photopea from '@/Applications/Photopea/Photopea';
import Vectorpea from '@/Applications/Vectorpea/Vectorpea';
import DocsViewer from '@/Applications/DocsViewer/DocsViewer';
import MusicPlayer from '@/Applications/MusicPlayer/MusicPlayer';
import HtmlReader from '@/Applications/HtmlReader/HtmlReader';
import WelcomeApp from '@/Applications/Welcome/WelcomeApp';

/**
 * Map of bundled application component names to their React components.
 * These are the core applications shipped with AmerOS.
 */
export const bundledComponents: Record<string, React.ComponentType<any>> = {
  WelcomeApp,
  TextEditor,
  Calculator,
  FileExplorer,
  DemoApp,
  Settings,
  TestCloseApp,
  CommonDialogDemo,
  WebApp,
  Installer: InstallerApp,
  Regedit,
  Notes,
  DBExplorer,
  PDFViewer,
  Photopea,
  Vectorpea,
  Jampea,
  DocsViewer,
  MusicPlayer,
  HtmlReader,
};

/**
 * Special handlers for bundled applications that can't be stored in registry.
 */
export const bundledHandlers: Record<string, Partial<Pick<Application, 'beforeClose'>>> = {
};
