"use client"

import { useEffect, useState, ReactNode } from "react";
import * as LucideIcons from "lucide-react";
import { type VFSNode } from "@/lib/vfs";
import { fileService } from "@/lib/file-service";

interface RegistryFileIconProps {
  item: VFSNode;
  className?: string;
  fallbackIcon?: ReactNode;
}

/**
 * Renders an icon based on the file extension's DefaultIcon in the Registry.
 * Falls back to a provided icon or the default Lucide File icon.
 */
export function RegistryFileIcon({ item, className, fallbackIcon }: RegistryFileIconProps) {
  const [iconName, setIconName] = useState<string | null>(null);

  useEffect(() => {
    if (item.type === 'file') {
      fileService.getFileIcon(item.name).then(setIconName);
    }
  }, [item.name, item.type]);

  if (item.isMountPoint) {
    return <LucideIcons.HardDrive className={className || "w-10 h-10 text-blue-600"} />;
  }

  if (item.type === "dir") {
    return <LucideIcons.Folder className={className || "w-10 h-10 text-amber-400 fill-amber-400/20"} />;
  }

  if (iconName && (LucideIcons as any)[iconName]) {
    const Icon = (LucideIcons as any)[iconName];
    return <Icon className={className || "w-10 h-10 text-blue-400"} />;
  }

  return (fallbackIcon as any) || <LucideIcons.File className={className || "w-10 h-10 text-slate-400"} />;
}

interface RegistryFileTypeLabelProps {
  item: VFSNode;
}

/**
 * Renders a type label based on the Registry association.
 * Falls back to generic "File Folder" or extension-based labels.
 */
export function RegistryFileTypeLabel({ item }: RegistryFileTypeLabelProps) {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (item.type === 'file') {
      fileService.getFileTypeLabel(item.name).then(setLabel);
    } else if (item.type === 'dir') {
       setLabel('File Folder');
    } else if (item.isMountPoint) {
       setLabel('System Drive');
    }
  }, [item.name, item.type, item.isMountPoint]);

  return <span>{label || (item.type === 'dir' ? 'File Folder' : 'File')}</span>;
}
