import { useCallback, useEffect, useRef, useState } from 'react';
import {
  sendChatMessage,
  createChatSession,
  getChatSessionMessages,
  type ChatMessage as ServiceChatMessage,
} from '@/features/ai_assistant/services/chat';
import { api, ChatSessionMessage } from '@/services/api';

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
  'Preparing your response...',
];

function normalizeSessionMessage(message: ChatSessionMessage, index: number): ChatMessage {
  const sender = String(message?.sender || '').toLowerCase();
  return {
    id: String(message?.id || `${message?.sessionId || 'session'}-${index}`),
    role: sender === 'user' || sender === 'farmer' ? 'user' : 'ai',
    content: message?.text || '',
    timestamp: message?.timestamp || new Date().toISOString(),
  };
}

export function useChat(sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<string>('');

  // Active session ID — either passed from parent or auto-created on first send
  const activeSessionIdRef = useRef<string | undefined>(sessionId);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRequestPending = useRef(false);

  // Keep activeSessionIdRef in sync if parent provides one
  useEffect(() => {
    activeSessionIdRef.current = sessionId;
  }, [sessionId]);

  const clearLoadingText = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    setLoadingText('');
  }, []);

  const startLoadingText = useCallback(() => {
    let index = 0;
    setLoadingText(LOADING_PHRASES[0]);
    loadingIntervalRef.current = setInterval(() => {
      index = (index + 1) % LOADING_PHRASES.length;
      setLoadingText(LOADING_PHRASES[index]);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => clearLoadingText();
  }, [clearLoadingText]);

  // Load history when a sessionId is provided
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingHistory(true);
    setError(null);

    api
      .getChatSessionMessages(sessionId)
      .then((response) => {
        if (cancelled) return;
        setMessages((Array.isArray(response) ? response : []).map(normalizeSessionMessage));
      })
      .catch((err: any) => {
        if (cancelled) return;
        setMessages([]);
        setError(err?.message || 'Could not load this chat session.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isRequestPending.current || !content.trim()) return;
      isRequestPending.current = true;

      setError(null);
      setIsLoading(true);
      startLoadingText();

      const userMsg: ChatMessage = {
        id: Date.now().toString() + '-user',
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        // Auto-create a session if we don't have one yet
        if (!activeSessionIdRef.current) {
          const newSession = await createChatSession('New Chat', 'en');
          activeSessionIdRef.current = newSession.id;
        }

        const data = await sendChatMessage(activeSessionIdRef.current!, content.trim(), 'en');

        // Support multiple response shapes: { response }, { reply }, { message }, { text }
        const aiText: string =
          data?.response ||
          data?.reply ||
          data?.message ||
          data?.text ||
          data?.answer ||
          (typeof data === 'string' ? data : null) ||
          'Sorry, I could not generate a response.';

        const aiMsg: ChatMessage = {
          id: Date.now().toString() + '-ai',
          role: 'ai',
          content: aiText,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not reach Saathi AI servers. Please try again.';

        setError(errorMessage);
        const errorMsg: ChatMessage = {
          id: Date.now().toString() + '-err',
          role: 'ai',
          content: `⚠️ ${errorMessage}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        clearLoadingText();
        setIsLoading(false);
        isRequestPending.current = false;
      }
    },
    [clearLoadingText, startLoadingText]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    activeSessionIdRef.current = sessionId;
  }, [sessionId]);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    loadingText,
    error,
    sendMessage,
    clearChat,
    activeSessionId: activeSessionIdRef.current,
  };
}
