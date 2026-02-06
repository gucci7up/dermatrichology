
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) console.warn('Missing VITE_SUPABASE_URL');
if (!supabaseAnonKey) console.warn('Missing VITE_SUPABASE_ANON_KEY');

// Helper to prevent crash on missing creds
const createSafeClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase credentials missing. App will not function correctly.');
        // Return a dummy client that warns on usage
        return new Proxy({} as any, {
            get: () => () => {
                console.error('Supabase client not initialized. Check .env.local');
                return { data: null, error: { message: 'Supabase not initialized' } };
            }
        });
    }
    try {
        return createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        return new Proxy({} as any, { get: () => () => ({ error: { message: 'Client Init Error' } }) });
    }
};

export const supabase = createSafeClient();

if (supabaseUrl) {
    console.log("Supabase Client Initialized with URL:", supabaseUrl.substring(0, 15) + "...");
}
