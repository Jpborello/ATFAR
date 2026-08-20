import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Fallback to a valid URL format so the build (and module import) doesn't
// crash before the service role key is configured — same pattern as
// src/lib/supabase.ts. Routes that actually use this client fail on their
// own terms (e.g. plusPagos.isConfigured()) when the real key is missing.
const activeUrl = supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder-project.supabase.co';
const activeKey = serviceRoleKey || 'placeholder-service-role-key';

// Server-only client that bypasses RLS with the service role key.
// Never import this from a 'use client' component — service-role key must
// stay off the browser bundle. Used by server routes (e.g. payment webhooks)
// that need to update rows without a logged-in user session.
export const supabaseAdmin = createClient(activeUrl, activeKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
