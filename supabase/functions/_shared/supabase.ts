import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Database } from '@gan-eden/shared';

/**
 * A supabase-js client scoped to the caller's JWT (from the Authorization
 * header) — subject to RLS as that user.
 */
export function userClient(req: Request): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authorization = req.headers.get('Authorization') ?? '';

  return createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolves the authenticated user from the request's JWT, or null. */
export async function getUser(req: Request): Promise<{ user: User } | null> {
  const client = userClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return { user: data.user };
}

/** A service-role supabase-js client — bypasses RLS. Server-side use only. */
export function adminClient(): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
