import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ReceivedFile } from './types';

interface LiveDataContextType {
  receivedFiles: ReceivedFile[];
  addFile: (file: ReceivedFile) => void;
  clearFiles: () => void;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);

  const addFile = useCallback((file: ReceivedFile) => {
    setReceivedFiles((prev) => {
      // Avoid duplicates if needed, or just append
      const exists = prev.find(f => f.filename === file.filename);
      if (exists) {
        return prev.map(f => f.filename === file.filename ? file : f);
      }
      return [...prev, file];
    });
  }, []);

  const clearFiles = useCallback(() => {
    setReceivedFiles([]);
  }, []);

  return (
    <LiveDataContext.Provider value={{ receivedFiles, addFile, clearFiles }}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const context = useContext(LiveDataContext);
  if (context === undefined) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return context;
}
