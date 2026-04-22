import { apiCall } from '@/services/api';

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  language: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const data = await apiCall<any>('/chat/sessions');
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.sessions)
      ? data.sessions
      : [];
}

export async function getChatSessionMessages(id: string): Promise<ChatMessage[]> {
  const data = await apiCall<any>(`/chat/sessions/${id}/messages`);
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.messages)
      ? data.messages
      : [];
}

export async function createChatSession(title: string, language: string = 'en'): Promise<ChatSession> {
  const data = await apiCall<any>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, language }),
  });
  return (data?.session ?? data) as ChatSession;
}


