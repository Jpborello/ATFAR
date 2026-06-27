import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback to a valid URL format for build-time static pre-rendering
const activeUrl = supabaseUrl.startsWith('http')
  ? supabaseUrl
  : 'https://placeholder-project.supabase.co';

const activeKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createBrowserClient(activeUrl, activeKey);
