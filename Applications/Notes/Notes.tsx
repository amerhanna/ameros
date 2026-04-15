'use client';

import React, { useState, useEffect } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { Trash2, Plus, RefreshCcw } from 'lucide-react';

export default function Notes() {
  const { query, isReady, error } = useDatabase();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  const loadNotes = async () => {
    if (!isReady) return;
    try {
      await query('CREATE TABLE IF NOT EXISTS notes (id INT AUTOINCREMENT PRIMARY KEY, content STRING, createdAt STRING)');
      const res = await query('SELECT * FROM notes ORDER BY id DESC');
      setNotes(res || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const resetDatabase = async () => {
    if (!confirm('This will delete all notes. Are you sure?')) return;
    try {
      await query('DROP TABLE notes');
      await loadNotes();
    } catch (err) {
      console.error('Failed to reset notes:', err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [isReady]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await query('INSERT INTO notes (content, createdAt) VALUES (?, ?)', [newNote, new Date().toLocaleString()]);
      setNewNote('');
      await loadNotes();
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const deleteNote = async (id: number) => {
    try {
      await query('DELETE FROM notes WHERE id = ?', [id]);
      await loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  if (error) return <div className="p-4 text-red-500">Database Error: {error}</div>;
  if (!isReady) return <div className="p-4">Loading Database...</div>;

  return (
    <div className="p-4 h-full flex flex-col bg-gray-100 font-sans">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          className="flex-grow p-2 border border-blue-900 bg-white shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none"
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
        />
        <button
          onClick={addNote}
          className="px-4 py-2 bg-blue-900 text-white border-b-2 border-blue-950 active:translate-y-0.5 flex items-center gap-2"
        >
          <Plus size={16} /> Add
        </button>
        <button
          onClick={resetDatabase}
          title="Reset Database"
          className="px-4 py-2 bg-red-800 text-white border-b-2 border-red-950 active:translate-y-0.5 flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex-grow overflow-auto bg-white border border-gray-400 p-2 shadow-inner">
        {notes.length === 0 ? (
          <p className="text-gray-500 italic text-center mt-4">No notes found.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="p-2 border-b border-gray-200 flex justify-between items-center group">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-mono">ID: {note.id || 'N/A'}</span>
                  <span>{note.content}</span>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
