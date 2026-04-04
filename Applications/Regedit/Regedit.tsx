"use client"

import React, { useState, useEffect } from 'react';
import { registry, RegistryValue } from '@/lib/registry';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Save, RefreshCw } from "lucide-react";

export default function Regedit() {
  const [entries, setEntries] = useState<Record<string, RegistryValue>>({});
  const [editingPath, setEditingPath] = useState('');
  const [editingValue, setEditingValue] = useState('');

  const loadRegistry = async () => {
    const allEntries = await registry.getAll();
    setEntries(allEntries);
  };

  useEffect(() => { loadRegistry(); }, []);

  const handleSave = async () => {
    try {
        const parsed = JSON.parse(editingValue);
        await registry.set(editingPath, parsed);
        loadRegistry();
    } catch {
        await registry.set(editingPath, editingValue);
        loadRegistry();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-sm">
      <Alert variant="destructive" className="m-2 py-2">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Registry Editor</AlertTitle>
        <AlertDescription>
          Editing the registry can cause AmerOS to become unstable or unbootable.
        </AlertDescription>
      </Alert>

      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="grid grid-cols-2 gap-4 mb-4">
            <Input 
              placeholder="Key Path (e.g. HKEY_LOCAL_MACHINE/...)" 
              value={editingPath} 
              onChange={e => setEditingPath(e.target.value)}
            />
            <div className="flex gap-2">
                <Input 
                  placeholder="Value (JSON or String)" 
                  value={editingValue} 
                  onChange={e => setEditingValue(e.target.value)}
                />
                <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1"/> Set</Button>
            </div>
        </div>

        <ScrollArea className="flex-1 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(entries).map(([path, val]) => (
                <TableRow key={path} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                    setEditingPath(path);
                    setEditingValue(JSON.stringify(val));
                }}>
                  <TableCell className="font-mono text-xs">{path}</TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[200px]">
                    {JSON.stringify(val)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      
      <div className="p-2 border-t bg-gray-50 flex justify-between">
        <span className="text-gray-400 italic">AmerOS Registry Editor v1.0</span>
        <Button variant="ghost" size="icon" onClick={loadRegistry}><RefreshCw className="w-3 h-3"/></Button>
      </div>
    </div>
  );
}