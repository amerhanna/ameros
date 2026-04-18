'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { dbService } from '@/lib/database';
import { vfs } from '@/lib/vfs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Database, Search, Terminal, RefreshCw, Trash2, FileJson, TableIcon } from 'lucide-react';

interface DBRef {
  appName: string;
  dbName: string;
}

export default function DBExplorer() {
  const [databases, setDatabases] = useState<DBRef[]>([]);
  const [selectedDB, setSelectedDB] = useState<DBRef | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoverDatabases = useCallback(async () => {
    setLoading(true);
    try {
      const appDataPath = 'C:/System/AppData';
      if (!(await vfs.exists(appDataPath))) {
        setDatabases([]);
        return;
      }

      const apps = await vfs.ls(appDataPath);
      const foundDBs: DBRef[] = [];

      for (const appNode of apps) {
        if (appNode.type === 'dir') {
          const files = await vfs.ls(appNode.path);
          for (const file of files) {
            if (file.name.endsWith('.db.json')) {
              foundDBs.push({
                appName: appNode.name,
                dbName: file.name.replace('.db.json', ''),
              });
            }
          }
        }
      }
      setDatabases(foundDBs);
    } catch (err: any) {
      setError(`Discovery failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    discoverDatabases();
  }, [discoverDatabases]);

  const loadTables = useCallback(async (db: DBRef) => {
    try {
      setLoading(true);
      setError(null);
      // Connect first
      await dbService.connect(db.appName, db.dbName);
      
      // Get tables using AlaSQL metadata query
      // @ts-ignore - alasql global might be needed or via service
      const res = await dbService.query(db.appName, 'SHOW TABLES', [], db.dbName);
      setTables(res.map((t: any) => t.tableid));
    } catch (err: any) {
      setError(`Failed to load tables: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectDB = (db: DBRef) => {
    setSelectedDB(db);
    setSelectedTable(null);
    setQueryResults(null);
    setTables([]);
    loadTables(db);
  };

  const executeSQL = async () => {
    if (!selectedDB || !sqlQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await dbService.query(selectedDB.appName, sqlQuery, [], selectedDB.dbName);
      setQueryResults(Array.isArray(res) ? res : [res]);
    } catch (err: any) {
      setError(`SQL Error: ${err.message}`);
      setQueryResults(null);
    } finally {
      setLoading(false);
    }
  };

  const browseTable = async (tableName: string) => {
    if (!selectedDB) return;
    setSelectedTable(tableName);
    setSqlQuery(`SELECT * FROM ${tableName} LIMIT 100`);
    setLoading(true);
    setError(null);
    try {
      const res = await dbService.query(selectedDB.appName, `SELECT * FROM ${tableName} LIMIT 100`, [], selectedDB.dbName);
      setQueryResults(res);
    } catch (err: any) {
      setError(`Browse failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!queryResults || queryResults.length === 0) {
      return <div className="p-8 text-center text-gray-400 italic">No data returned or empty result set.</div>;
    }

    const columns = Object.keys(queryResults[0]);

    return (
      <div className="border rounded-md overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {columns.map(col => (
                <TableHead key={col} className="font-bold text-blue-900">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {queryResults.map((row, i) => (
              <TableRow key={i} className="hover:bg-blue-50/30">
                {columns.map(col => (
                  <TableCell key={col} className="font-mono text-xs">
                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white text-gray-900 font-sans select-none overflow-hidden">
      {/* ToolBar */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50 shadow-sm">
        <Button variant="outline" size="sm" onClick={discoverDatabases} disabled={loading} className="gap-2">
          <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
        <div className="h-4 w-[1px] bg-gray-300 mx-2" />
        {selectedDB && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1 border-blue-200">
            Current: {selectedDB.appName} / {selectedDB.dbName}
          </Badge>
        )}
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-grow">
        {/* Sidebar */}
        <ResizablePanel defaultSize={25} minSize={15}>
          <div className="h-full flex flex-col border-r bg-gray-50/50">
            <div className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Database /> Databases
            </div>
            <ScrollArea className="flex-grow">
              <div className="p-2 space-y-1">
                {databases.map((db, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectDB(db)}
                    className={`p-2 rounded cursor-pointer flex items-center gap-2 text-sm transition-colors ${
                      selectedDB?.appName === db.appName && selectedDB?.dbName === db.dbName
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-blue-100/50 text-gray-700'
                    }`}
                  >
                    <Database size={14} className={selectedDB?.appName === db.appName ? 'text-white' : 'text-blue-500'} />
                    <div className="flex flex-col leading-tight overflow-hidden">
                      <span className="font-semibold truncate">{db.appName}</span>
                      <span className={`text-[10px] opacity-70 ${selectedDB?.appName === db.appName ? 'text-white' : 'text-gray-500'}`}>
                        {db.dbName}.db
                      </span>
                    </div>
                  </div>
                ))}
                {databases.length === 0 && !loading && (
                  <div className="p-4 text-center text-xs text-gray-400">No databases found in VFS.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content */}
        <ResizablePanel defaultSize={75}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60}>
              <div className="h-full flex flex-col p-4 bg-gray-50/30 overflow-hidden">
                <Tabs value={selectedTable || 'console'} onValueChange={setSelectedTable} className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-gray-200/50 p-1">
                      <TabsTrigger value="console" className="gap-2 data-[state=active]:bg-white">
                        <Terminal size={14} /> SQL Console
                      </TabsTrigger>
                      {tables.map(t => (
                        <TabsTrigger 
                          key={t} 
                          value={t} 
                          onClick={() => browseTable(t)}
                          className="gap-2 data-[state=active]:bg-white"
                        >
                          <TableIcon size={14} /> {t}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="flex-grow overflow-hidden relative">
                    <TabsContent value="console" className="h-full mt-0 focus-visible:ring-0">
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex flex-col gap-2 bg-white p-3 border rounded-lg shadow-sm border-blue-100">
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1 flex items-center gap-1">
                            <Search size={10} /> Raw SQL Query
                          </label>
                          <Textarea
                            value={sqlQuery}
                            onChange={(e) => setSqlQuery(e.target.value)}
                            placeholder="SELECT * FROM table_name..."
                            className="font-mono text-sm min-h-[100px] border-none focus-visible:ring-0 resize-none p-0"
                            onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && executeSQL()}
                          />
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                            <span className="text-[10px] text-gray-400">Ctrl + Enter to Execute</span>
                            <Button onClick={executeSQL} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2">
                              <Terminal size={14}/> Execute Query
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex-grow overflow-auto">
                           {renderResults()}
                        </div>
                      </div>
                    </TabsContent>

                    {tables.map(t => (
                      <TabsContent key={t} value={t} className="h-full mt-0">
                         <ScrollArea className="h-full">
                            <div className="pb-4">
                               {renderResults()}
                            </div>
                         </ScrollArea>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Status / Log Panel */}
            <ResizablePanel defaultSize={40} minSize={5}>
              <div className="h-full bg-gray-900 text-blue-400 p-3 font-mono text-xs overflow-auto font-medium leading-relaxed">
                <div className="flex items-center justify-between mb-2 text-gray-500 border-b border-gray-800 pb-2">
                  <span className="flex items-center gap-2"><Search size={12}/> System Output</span>
                  <button onClick={() => setQueryResults(null)} className="hover:text-white transition-colors">Clear</button>
                </div>
                {error && <div className="text-red-400 mb-2">⨯ ERROR: {error}</div>}
                {queryResults && (
                   <div className="text-green-400 mb-2">✓ Success: {queryResults.length} records affected.</div>
                )}
                <div className="text-gray-500 mb-1">$ DB_SCAN --target=C:/System/AppData</div>
                <div className="text-gray-400 mb-2">Scanning... found {databases.length} active databases.</div>
                {selectedDB && (
                   <div className="text-blue-500 mb-1 animate-pulse">
                     CONNECTED_TO: {selectedDB.appName}::{selectedDB.dbName}
                   </div>
                )}
                <div className="opacity-40">Ready for commands.</div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* StatusBar */}
      <footer className="h-6 bg-blue-700 text-white flex items-center justify-between px-3 text-[10px] shrink-0">
         <div className="flex items-center gap-4">
            <span className="flex gap-1 items-center font-bold">ALASQL ENGINE <span className="text-blue-300">v4.17.2</span></span>
            <span className="opacity-60 hidden sm:inline">|</span>
            <span className="hidden sm:inline">VFS PERSISTENCE: <span className="font-bold">ON</span></span>
         </div>
         <div className="font-mono">DB_STATUS: 0x01_READY</div>
      </footer>
    </div>
  );
}
