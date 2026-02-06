
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) console.warn('Missing VITE_SUPABASE_URL');
if (!supabaseAnonKey) console.warn('Missing VITE_SUPABASE_ANON_KEY');

// Helper to prevent crash on missing creds
// Helper to prevent crash on missing creds
const createSafeClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase credentials missing. App will not function correctly.');
        // Return a dummy client that warns on usage but matches the shape needed to avoid crash
        return {
            auth: {
                onAuthStateChange: () => {
                    console.error('Supabase client not initialized. Check .env.local');
                    return { data: { subscription: { unsubscribe: () => { } } } };
                },
                signOut: async () => { },
                getSession: async () => ({ data: { session: null }, error: null }),
                signInWithPassword: async () => {
                    console.error('Supabase credentials missing.');
                    return { data: null, error: { message: 'Error de configuración: Faltan credenciales de Supabase (VITE_SUPABASE_URL)' } };
                },
                signUp: async () => {
                    console.error('Supabase credentials missing.');
                    return { data: null, error: { message: 'Error de configuración: Faltan credenciales de Supabase' } };
                },
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: null, error: { message: 'Supabase not initialized' } }),
                        maybeSingle: async () => ({ data: null, error: { message: 'Supabase not initialized' } }),
                        order: () => ({ data: null, error: { message: 'Supabase not initialized' } })
                    })
                })
            })
        } as any;
    }
    try {
        return createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        return {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
            }
        } as any;
    }
};

export const supabase = createSafeClient();

if (supabaseUrl) {
    console.log("Supabase Client Initialized with URL:", supabaseUrl.substring(0, 15) + "...");
}
