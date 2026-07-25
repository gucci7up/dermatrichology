import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signIn(email, password);
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-sand-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl border border-sand-200 shadow-xl overflow-hidden">
                <div className="relative bg-gradient-to-br from-terracotta-700 to-terracotta-900 px-8 pt-10 pb-8 md:px-10 overflow-hidden">
                    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-[0.14]" aria-hidden="true">
                        <path d="M0,80 Q100,20 200,80 T400,80" stroke="white" strokeWidth="2" fill="none" />
                        <path d="M0,130 Q100,70 200,130 T400,130" stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="340" cy="40" r="24" stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="40" cy="160" r="14" stroke="white" strokeWidth="1.5" fill="none" />
                    </svg>
                    <div className="relative text-center">
                        <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white/20">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="font-serif text-2xl font-black text-white mb-2">Bienvenido</h1>
                        <p className="text-white/80 font-medium">Ingresa tus credenciales para acceder al sistema.</p>
                    </div>
                </div>

                <div className="p-8 md:p-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-sand-700 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    spellCheck={false}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border-[1.5px] border-sand-300 rounded-xl text-sand-900 font-bold focus:ring-2 focus:ring-terracotta-100 focus:border-terracotta-600 outline-none transition-all"
                                    placeholder="admin@dermatrich.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-sand-700 ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border-[1.5px] border-sand-300 rounded-xl text-sand-900 font-bold focus:ring-2 focus:ring-terracotta-100 focus:border-terracotta-600 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-terracotta-700 hover:bg-terracotta-800 text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-terracotta-700/30 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    INGRESANDO...
                                </>
                            ) : (
                                'INICIAR SESIÓN'
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-sand-50 p-6 text-center border-t border-sand-200">
                    <p className="text-xs text-sand-400 font-semibold">
                        Dermatrichology App &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
