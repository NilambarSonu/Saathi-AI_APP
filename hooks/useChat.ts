import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const LOADING_PHRASES = [
  'Analyzing soil...',
  'Checking nutrients...',
  'Generating recommendations...',
  'Consulting agricultural data...',
  'Preparing your response...'
];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<string>('');
  
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRequestPending = useRef(false);

  // Cleans up the loading interval
  const clearLoadingText = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    setLoadingText('');
  }, []);

  // Sets up the dynamic loading text rotation
  const startLoadingText = useCallback(() => {
    let index = 0;
    setLoadingText(LOADING_PHRASES[0]);
    
    loadingIntervalRef.current = setInterval(() => {
      index = (index + 1) % LOADING_PHRASES.length;
      setLoadingText(LOADING_PHRASES[index]);
    }, 1500); // Rotate every 1.5 seconds
  }, []);

  useEffect(() => {
    return () => clearLoadingText(); // Cleanup on unmount
  }, [clearLoadingText]);

  const sendMessage = useCallback(async (content: string) => {
    // 1. Debounce / Prevent Duplicate API calls
    if (isRequestPending.current || !content.trim()) return;
    isRequestPending.current = true;
    
    // 2. Clear previous errors and set UI State
    setError(null);
    setIsLoading(true);
    startLoadingText();
    
    const userMsg: ChatMessage = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);

    try {
      // 3. API Call via the new core api service
      const { response } = await api.chat(content);
      
      const aiMsg: ChatMessage = {
        id: Date.now().toString() + '-ai',
        role: 'ai',
        content: response || 'Sorry, I could not generate a response.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      // 4. Soft Error Handling
      const errorMessage = err.message || 'Could not reach Saathi AI servers. Please try again.';
      setError(errorMessage);
      
      const errorMsg: ChatMessage = {
        id: Date.now().toString() + '-err',
        role: 'ai',
        content: `❌ ${errorMessage}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      // 5. Restore Idle state
      clearLoadingText();
      setIsLoading(false);
      isRequestPending.current = false;
    }
  }, [startLoadingText, clearLoadingText]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    loadingText,
    error,
    sendMessage,
    clearChat,
  };
}
