import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, loading, role } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#d3b3a8] animate-spin" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based Route Protection Logic
    // If accessing settings, required role is admin
    if (location.pathname.startsWith('/settings') && role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // If accessing landing public config, also restrict (already did via menu, but hard route check)
    // Note: /booking is public if we wanted it to be truly public, but Layout excludes it.
    // However, if we are in admin layout mode and user is doctor trying to edit it?
    // User request: "doctor(a) - no puede ver pagina config y pagina ver landing publica"
    // Assuming /booking is the "Ver Landing" preview.
    if (location.pathname === '/booking' && role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Assistant restrictions
    // "Asistente - solo puede ver pacientes y consultas y el dashboard"
    if (role === 'assistant') {
        const allowedRoutes = ['/', '/patients', '/consultations'];
        const isAllowed = allowedRoutes.some(route =>
            location.pathname === route || location.pathname.startsWith(route + '/')
        );
        if (!isAllowed) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
