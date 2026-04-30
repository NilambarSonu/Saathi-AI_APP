import apiClient from '@/api/axiosConfig';

export interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  email: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  profile_picture?: string;
  provider?: string;
  created_at: string;
}

/**
 * GET /api/user — Fetches the freshly-saved user profile directly.
 * Using /user instead of /dashboard to avoid stale cached data after a profile update.
 * Requires Authorization header.
 */
export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<any>('/user');
  const user = data?.user ?? data;

  return {
    id: user?.id ?? user?._id ?? user?.userId ?? '',
    name: user?.name ?? user?.username ?? undefined,
    username: user?.username ?? user?.name ?? undefined,
    email: user?.email ?? user?.emailAddress ?? '',
    phone: user?.phone ?? user?.mobile ?? undefined,
    location: user?.location ?? user?.address ?? undefined,
    avatar_url: user?.profilePicture ?? user?.profile_picture ?? user?.avatar_url ?? user?.profile_image ?? user?.picture ?? undefined,
    profile_picture: user?.profilePicture ?? user?.profile_picture ?? user?.avatar_url ?? user?.profile_image ?? undefined,
    provider: user?.provider ?? 'local',
    created_at: user?.created_at ?? user?.createdAt ?? new Date().toISOString(),
  };
}

/**
 * GET /api/user — Current user profile.
 * Requires Authorization header.
 */
export async function getUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<any>('/user');
  const user = data?.user ?? data;
  return {
    id: user?.id ?? user?._id ?? '',
    name: user?.name ?? user?.username ?? undefined,
    username: user?.username ?? user?.name ?? undefined,
    email: user?.email ?? '',
    phone: user?.phone ?? undefined,
    location: user?.location ?? undefined,
    avatar_url: user?.profilePicture ?? user?.profile_picture ?? user?.avatar_url ?? undefined,
    profile_picture: user?.profilePicture ?? user?.profile_picture ?? undefined,
    provider: user?.provider ?? 'local',
    created_at: user?.created_at ?? user?.createdAt ?? new Date().toISOString(),
  };
}

/**
 * PUT /api/user — Update username / location.
 * Requires Authorization header.
 */
export async function updateUserProfile(fields: { name?: string; username?: string; location?: string }): Promise<UserProfile> {
  const { data } = await apiClient.put<any>('/user', fields);
  return data?.user ?? data;
}

/**
 * GET /api/user/data?format=json — Download user data.
 * Requires Authorization header.
 */
export async function getUserData(format: 'json' | 'csv' = 'json'): Promise<any> {
  const { data } = await apiClient.get<any>(`/user/data?format=${format}`);
  return data;
}

/**
 * GET /api/settings — Get app settings.
 * Requires Authorization header.
 */
export async function getSettings(): Promise<{ aiPricingEnabled: boolean; [key: string]: any }> {
  const { data } = await apiClient.get<any>('/settings');
  return data;
}

/**
 * PUT /api/settings — Update app settings.
 * Requires Authorization header.
 */
export async function updateSettings(settings: Record<string, any>): Promise<any> {
  const { data } = await apiClient.put<any>('/settings', settings);
  return data;
}

/**
 * GET /api/privacy-settings — Get privacy settings.
 * Requires Authorization header.
 */
export async function getPrivacySettings(): Promise<any> {
  const { data } = await apiClient.get<any>('/privacy-settings');
  return data;
}

/**
 * PUT /api/privacy-settings — Update privacy settings.
 * Requires Authorization header.
 */
export async function updatePrivacySettings(settings: Record<string, any>): Promise<any> {
  const { data } = await apiClient.put<any>('/privacy-settings', settings);
  return data;
}
