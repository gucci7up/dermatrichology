import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { api, getToken, setToken, clearToken } from '../services/api';

interface AuthContextType {
    session: { token: string } | null;
    profile: UserProfile | null;
    loading: boolean;
    role: 'admin' | 'doctor' | 'assistant' | null;
    signOut: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    role: null,
    signOut: async () => { },
    signIn: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<{ token: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const token = getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const { profile } = await api<{ profile: UserProfile }>('/auth/me');
                setSession({ token });
                setProfile(profile);
            } catch (e) {
                console.error('Auth: session restore failed', e);
                clearToken();
            } finally {
                setLoading(false);
            }
        };
        restoreSession();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { token, profile } = await api<{ token: string; profile: UserProfile }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(token);
        setSession({ token });
        setProfile(profile);
    };

    const signOut = async () => {
        clearToken();
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            session,
            profile,
            loading,
            role: profile?.role || null,
            signOut,
            signIn,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
