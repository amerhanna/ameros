"use client"

import { registry } from './registry';

/**
 * FileService - Handles file-to-application associations and icon resolution
 * via the system Registry (HKEY_CLASSES_ROOT).
 */
class FileService {
  private readonly HKCR = 'HKEY_CLASSES_ROOT';

  /**
   * Resolves the "Class" for a given filename based on its extension.
   * Example: "document.txt" -> "txtfile"
   */
  async getFileClass(filename: string): Promise<string | null> {
    const ext = this.getExtension(filename);
    if (!ext) return null;
    return await registry.get<string | null>(`${this.HKCR}/${ext}`, null);
  }

  /**
   * Retrieves the Lucide icon name associated with a file's class.
   */
  async getFileIcon(filename: string): Promise<string | null> {
    const className = await this.getFileClass(filename);
    if (!className) return null;
    return await registry.get<string | null>(`${this.HKCR}/${className}/DefaultIcon`, null);
  }

  /**
   * Retrieves the application ID associated with a file class for opening.
   */
  async getOpenFileCommand(filename: string): Promise<string | null> {
    const className = await this.getFileClass(filename);
    if (!className) return null;
    const path = `${this.HKCR}/${className}/shell/open/command`;
    return await registry.get<string | null>(path, null);
  }

  /**
   * Retrieves a human-readable label for the file type.
   */
  async getFileTypeLabel(filename: string): Promise<string> {
    const className = await this.getFileClass(filename);
    if (!className) {
      const ext = this.getExtension(filename);
      return ext ? `${ext.toUpperCase().replace('.', '')} File` : 'File';
    }
    return await registry.get<string>(`${this.HKCR}/${className}`, 'File');
  }

  private getExtension(filename: string): string | null {
    const parts = filename.split('.');
    if (parts.length <= 1) return null;
    return `.${parts.pop()?.toLowerCase()}`;
  }
}

export const fileService = new FileService();
