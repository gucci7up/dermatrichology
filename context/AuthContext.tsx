
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { DB } from '../services/db';
import { UserProfile } from '../types';

interface AuthContextType {
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    role: 'admin' | 'doctor' | 'assistant' | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    role: null,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("Auth: Setting up auth state listener...");

        // 2. Listen for auth changes (handles initial session too)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth: Event received:", event);
            setSession(session);

            if (session?.user) {
                console.log("Auth: Session found, fetching profile...");
                try {
                    const userProfile = await DB.profiles.get(session.user.id);
                    console.log("Auth: Profile fetched:", userProfile);
                    setProfile(userProfile);
                } catch (pError) {
                    console.error("Auth: Error fetching profile:", pError);

                    // FALLBACK: If DB fails, forcce ADMIN for specific email
                    if (session.user.email === 'gucci7up@gmail.com') {
                        console.warn("Auth: Forcing Admin Role for main user due to DB error.");
                        setProfile({
                            id: session.user.id,
                            role: 'admin',
                            full_name: 'Admin Fallback'
                        } as any);
                    } else {
                        setProfile(null);
                    }
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        // Safety timeout
        const maxWait = setTimeout(() => {
            if (loading) {
                console.warn("Auth: Timeout reached, forcing load completion.");
                setLoading(false);
            }
        }, 3000);

        return () => {
            clearTimeout(maxWait);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            session,
            profile,
            loading,
            role: profile?.role || null,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
