import { apiCall } from './api';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

/**
 * Get all chat sessions for the current user
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  return apiCall<ChatSession[]>('/api/chat/sessions');
}

/**
 * Get a specific chat session and its messages
 */
export async function getChatSession(id: string): Promise<ChatSession> {
  return apiCall<ChatSession>(`/api/chat/sessions/${id}`);
}

/**
 * Create a new chat session
 */
export async function createChatSession(
  title: string,
  language: string = 'en'
): Promise<ChatSession> {
  return apiCall<ChatSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, language }),
  });
}

/**
 * Send a message to an existing chat session and get AI response
 */
export async function sendMessage(
  sessionId: string,
  content: string
): Promise<ChatMessage> {
  return apiCall<ChatMessage>(`/api/chat/sessions/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
