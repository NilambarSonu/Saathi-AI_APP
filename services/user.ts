import { apiCall } from './api';

export interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  email: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  provider?: string;
  created_at: string;
}

/**
 * Fetch the current user's profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiCall<UserProfile>('/api/users/profile');
}
