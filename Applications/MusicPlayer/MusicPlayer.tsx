"use client";

import { useState, useEffect, useRef } from "react";
import { useWindowActions } from "@/hooks/useWindowActions";
import { vfs } from "@/lib/vfs";
import { toast } from "sonner";
import { useSystemDialogs } from "@/hooks/useSystemDialogs";
import { useGetWindowState } from "@/hooks/useGetWindowState";
import { useAppMessage } from "@/hooks/useAppMessage";

interface MusicPlayerProps {
  filePath?: string;
}

interface PlaylistItem {
  path: string;
  name: string;
  url: string;
}

export default function MusicPlayer({ filePath: initialFilePath }: MusicPlayerProps) {
  const { setMenuBar, close } = useWindowActions();
  const { title } = useGetWindowState(["title"]);
  const { showOpenFileDialog } = useSystemDialogs();
  
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadFileOrPlaylist = async (path: string) => {
    try {
      setPlaylist(prev => {
        prev.forEach(item => URL.revokeObjectURL(item.url));
        return [];
      });

      if (path.toLowerCase().endsWith('.m3u') || path.toLowerCase().endsWith('.pls')) {
        const blob = await vfs.readFile(path);
        const text = await blob.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        
        const dir = path.substring(0, path.lastIndexOf('/'));
        const newPlaylist: PlaylistItem[] = [];
        
        for (const line of lines) {
          const fullPath = line.startsWith('/') ? line : `${dir}/${line}`;
          try {
            const fileBlob = await vfs.readFile(fullPath);
            newPlaylist.push({
              path: fullPath,
              name: fullPath.split('/').pop() || "Unknown",
              url: URL.createObjectURL(fileBlob)
            });
          } catch (e) {
            console.warn("Failed to load playlist item:", fullPath);
          }
        }
        
        if (newPlaylist.length > 0) {
          setPlaylist(newPlaylist);
          setCurrentIndex(0);
          toast.success(`Loaded ${newPlaylist.length} tracks from playlist.`);
        } else {
          toast.error("Playlist is empty or tracks could not be loaded.");
        }
      } else {
        const blob = await vfs.readFile(path);
        setPlaylist([{
          path,
          name: path.split('/').pop() || "Unknown",
          url: URL.createObjectURL(blob)
        }]);
        setCurrentIndex(0);
      }
    } catch (err) {
      toast.error(`Failed to open: ${path}`);
      console.error(err);
    }
  };

  useEffect(() => {
    if (initialFilePath) {
      loadFileOrPlaylist(initialFilePath);
    }
    
    return () => {
      setPlaylist(prev => {
        prev.forEach(item => URL.revokeObjectURL(item.url));
        return prev;
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilePath]);

  useAppMessage((message) => {
    if (message?.type === 'LAUNCH_ARGS' && message.payload?.filePath) {
      loadFileOrPlaylist(message.payload.filePath);
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (audioRef.current && playlist.length > 0) {
      audioRef.current.load();
      audioRef.current.play().catch(e => console.warn("Autoplay prevented", e));
      setIsPlaying(true);
    }
  }, [currentIndex, playlist]);

  const handleOpenFile = async () => {
    try {
      const selectedFile = await showOpenFileDialog();
      if (selectedFile) {
        await loadFileOrPlaylist(selectedFile);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNext = () => {
    setPlaylist(prev => {
      if (prev.length === 0) return prev;
      setCurrentIndex((curr) => (curr + 1) % prev.length);
      return prev;
    });
  };

  const handlePrev = () => {
    setPlaylist(prev => {
      if (prev.length === 0) return prev;
      setCurrentIndex((curr) => (curr - 1 + prev.length) % prev.length);
      return prev;
    });
  };

  useEffect(() => {
    setMenuBar([
      {
        type: "submenu",
        label: "File",
        items: [
          { type: "item", label: "Open File/Playlist...", action: handleOpenFile },
          { type: "separator" },
          { type: "item", label: "Exit", action: close },
        ],
      },
      {
        type: "submenu",
        label: "Playback",
        items: [
          { type: "item", label: "Play", action: () => audioRef.current?.play() },
          { type: "item", label: "Pause", action: () => audioRef.current?.pause() },
          { type: "separator" },
          { type: "item", label: "Next", action: handleNext },
          { type: "item", label: "Previous", action: handlePrev },
        ],
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, currentIndex]);

  const currentTrack = playlist[currentIndex];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white font-sans p-4">
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Visualizer / Current Track Info */}
        <div className="bg-slate-950 border border-slate-700 p-4 rounded mb-4 shadow-inner flex flex-col items-center justify-center min-h-[100px]">
          {currentTrack ? (
            <>
              <h2 className="text-xl font-bold text-green-400 mb-2 text-center break-all">{currentTrack.name}</h2>
              <div className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {isPlaying ? (
                  <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> PLAYING</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-yellow-500"></span> PAUSED</>
                )}
              </div>
            </>
          ) : (
            <h2 className="text-slate-500 italic">No media loaded</h2>
          )}
        </div>

        {/* Audio Controls */}
        <div className="mb-4">
          <audio
            ref={audioRef}
            src={currentTrack?.url}
            controls
            className="w-full h-10"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleNext}
          />
        </div>

        {/* Playlist */}
        <div className="flex-1 bg-slate-800 border border-slate-700 rounded overflow-y-auto">
          {playlist.length > 0 ? (
            <ul className="divide-y divide-slate-700/50">
              {playlist.map((track, idx) => (
                <li
                  key={`${track.path}-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-700 transition-colors ${
                    idx === currentIndex ? "bg-slate-700 text-green-400 font-medium" : "text-slate-300"
                  }`}
                >
                  <span className="opacity-50 mr-2 w-4 inline-block text-right">{idx + 1}.</span>
                  {track.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
              Playlist is empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
