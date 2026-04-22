import { apiCall } from '@/services/api';

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
 * Fetch the current user's profile.
 * Backend contract: GET /api/dashboard
 * Field mapping sourced from dashboard.user payload.
 */
export async function getUserProfile(): Promise<UserProfile> {
  const raw = await apiCall<any>('/dashboard');
  const user = raw?.user ?? raw;

  // Normalize field names from backend to our internal model
  return {
    id: user?.id ?? user?._id ?? user?.userId ?? '',
    name: user?.name ?? user?.username ?? undefined,
    username: user?.username ?? user?.name ?? undefined,
    email: user?.email ?? user?.emailAddress ?? '',
    phone: user?.phone ?? user?.mobile ?? undefined,
    location: user?.location ?? user?.address ?? undefined,
    // profile_picture maps to our avatar field
    avatar_url: user?.profilePicture ?? user?.profile_picture ?? user?.avatar_url ?? user?.profile_image ?? user?.picture ?? undefined,
    profile_picture: user?.profilePicture ?? user?.profile_picture ?? user?.avatar_url ?? user?.profile_image ?? undefined,
    provider: user?.provider ?? 'local',
    created_at: user?.created_at ?? user?.createdAt ?? new Date().toISOString(),
  };
}


