import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Session persistence (localStorage) and automatic background token refresh
// are both on by default -- this is the entire mechanism behind "session
// survives a reload" and "an active session doesn't expire mid-use".
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
