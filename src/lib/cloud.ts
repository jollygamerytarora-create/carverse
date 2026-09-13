import { supabase, type CvUser } from './auth';

/**
 * Cloud data layer for CARVERSE:
 *  - feature_requests: one shared, universal wall — every signed-in user's
 *    requests are visible to everyone.
 *  - favorites: strictly per-user garages (RLS isolates rows by auth.uid()).
 * When Supabase isn't configured every call degrades to a local no-op.
 */

export interface FeatureRequest {
  id: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export async function fetchFeatureRequests(): Promise<FeatureRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('feature_requests')
    .select('id,user_id,author_name,body,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.warn('[CARVERSE] feature_requests fetch failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    authorName: (r.author_name as string) || 'Driver',
    body: r.body as string,
    createdAt: r.created_at as string,
  }));
}

export async function createFeatureRequest(user: CvUser, body: string): Promise<string | null> {
  if (!supabase) return 'Sign in to post feature requests.';
  const trimmed = body.trim();
  if (!trimmed) return 'Write your idea first.';
  const { error } = await supabase.from('feature_requests').insert({
    user_id: user.id,
    author_name: user.name || user.email?.split('@')[0] || 'Driver',
    body: trimmed.slice(0, 500),
  });
  return error ? error.message : null;
}

export async function deleteFeatureRequest(user: CvUser, id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('feature_requests').delete().eq('id', id).eq('user_id', user.id);
}

/* ---------------- favorites (per-user garage) ---------------- */

export async function fetchFavorites(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('favorites').select('vehicle_id').eq('user_id', userId);
  if (error) {
    console.warn('[CARVERSE] favorites fetch failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.vehicle_id as string);
}

export async function pushFavorite(userId: string, vehicleId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('favorites').insert({ user_id: userId, vehicle_id: vehicleId });
}

export async function removeFavorite(userId: string, vehicleId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('favorites').delete().eq('user_id', userId).eq('vehicle_id', vehicleId);
}
