
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  Activity,
  Settings,
  Menu,
  ChevronRight,
  LogOut,
  Globe,
  Search as SearchIcon
} from 'lucide-react';
import { DB } from '../services/db';
import { AppSettings } from '../types';
import { useAuth } from '../context/AuthContext';

const SidebarItem: React.FC<{ to: string; icon: any; label: string; active: boolean; external?: boolean }> = ({ to, icon: Icon, label, active, external }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
      ? 'bg-[#d3b3a8] text-white shadow-lg shadow-[#d3b3a8]/30'
      : 'text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200'
      } ${external ? 'border-dashed border-slate-300' : ''}`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-[#d3b3a8]'}`} />
    <span className="font-bold">{label}</span>
    {active && !external && <ChevronRight className="ml-auto w-4 h-4" />}
    {external && <Globe className="ml-auto w-3.5 h-3.5 text-slate-300" />}
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { role, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const [settings, setSettings] = React.useState<AppSettings>({
    app_name: 'DermaTrich',
    logo_url: '',
    logo_width: 220,
    logo_height: 100,
    doctor_name: 'Cargando...',
    doctor_profession: '...',
    doctor_photo_url: ''
  });

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await DB.settings.get();
        if (s) setSettings(s);
      } catch (e) {
        console.error("Error loading layout settings", e);
      }
    };
    loadSettings();

    const handleSettingsChange = async () => {
      const s = await DB.settings.get();
      if (s) setSettings(s);
    };
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  // Excluir Layout administrativo si estamos en la landing page
  const isPublicPage = location.pathname === '/booking';
  const isPrintPage = location.pathname.includes('/print') || location.pathname.includes('/prescription');

  if (isPublicPage || isPrintPage) {
    return <div className="bg-white min-h-screen">{children}</div>;
  }

  // Define All Menu Items
  const allMenuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', access: ['admin', 'doctor', 'assistant'] },
    { to: '/patients', icon: Users, label: 'Pacientes', access: ['admin', 'doctor', 'assistant'] },
    { to: '/consultations', icon: Stethoscope, label: 'Consultas', access: ['admin', 'doctor', 'assistant'] },
    { to: '/reports', icon: FileText, label: 'Reportes', access: ['admin', 'doctor'] },
    { to: '/analytics', icon: Activity, label: 'Análisis', access: ['admin', 'doctor'] },
    { to: '/settings', icon: Settings, label: 'Configuración', access: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => !role || item.access.includes(role));
  const showLandingLink = role === 'admin';


  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-300 p-6 pt-4 sticky top-0 h-screen shadow-xl z-20">
        {/* LOGO CONTAINER */}
        <div className="mb-2 pb-2 border-b border-slate-200 flex flex-col items-center justify-center w-full min-h-[80px]">
          {settings.logo_url ? (
            <div className="w-full flex justify-center items-center overflow-hidden">
              <img
                src={settings.logo_url}
                style={{
                  width: settings.logo_width,
                  height: settings.logo_height,
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
                alt="Logo Institucional"
                className="transition-all duration-300"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 w-full">
              <div className="w-10 h-10 bg-[#d3b3a8] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-[#d3b3a8]/10 flex-shrink-0">
                {(settings.app_name || 'D').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-slate-900 leading-tight truncate">{settings.app_name}</h1>
                <p className="text-[10px] text-[#d3b3a8] font-black uppercase tracking-widest">Medical Center</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item, idx) => (
            <SidebarItem
              key={`${item.to}-${idx}`}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}

          {showLandingLink && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <SidebarItem
                to="/booking"
                icon={Globe}
                label="Ver Landing Pública"
                active={location.pathname === '/booking'}
                external={false}
              />
            </div>
          )}
        </nav>

        <div className="pt-4 border-t border-slate-300 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold border border-transparent hover:border-red-200">
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-300 h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-4 lg:hidden min-w-0">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
              <Menu className="w-6 h-6" />
            </button>
            <div className="truncate flex items-center gap-2">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  style={{ width: 'auto', height: '32px', maxWidth: '120px', objectFit: 'contain' }}
                  alt="Logo Mobile"
                />
              ) : (
                <span className="font-black text-[#d3b3a8] truncate">{settings.app_name}</span>
              )}
            </div>
          </div>

          <div className="flex-1 max-w-md mx-auto hidden md:block px-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Buscar paciente por nombre o ID..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-400 rounded-full text-sm focus:ring-2 focus:ring-[#d3b3a8] focus:bg-white focus:border-[#d3b3a8] transition-all outline-none font-medium shadow-inner"
              />
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500 group-focus-within:text-[#d3b3a8]" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900">{settings.doctor_name}</p>
              <p className="text-[10px] text-[#d3b3a8] font-bold uppercase tracking-wider">{settings.doctor_profession}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-400 shadow-md overflow-hidden ring-2 ring-white flex items-center justify-center">
              {settings.doctor_photo_url ? (
                <img src={settings.doctor_photo_url} alt="Doctor" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-slate-400" />
              )}
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 bg-slate-100 min-h-full">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-72 bg-white p-6 shadow-2xl border-r border-slate-300">
            <div className="flex flex-col items-center gap-3 mb-4 border-b border-slate-100 pb-2 justify-center min-h-[70px]">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  style={{ width: 'auto', height: '50px', maxWidth: '100%', objectFit: 'contain' }}
                  alt="Logo"
                />
              ) : (
                <>
                  <div className="w-10 h-10 bg-[#d3b3a8] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {(settings.app_name || 'D').charAt(0)}
                  </div>
                  <h1 className="font-black text-slate-900 truncate">{settings.app_name}</h1>
                </>
              )}
            </div>
            <nav className="space-y-1">
              {menuItems.map((item, idx) => (
                <Link
                  key={`${item.to}-${idx}`}
                  to={item.to}
                  className={`flex items-center gap-3 p-4 font-black rounded-xl border transition-all ${location.pathname === item.to
                    ? 'bg-[#d3b3a8] text-white'
                    : 'text-slate-700 hover:bg-[#d3b3a8]/10 hover:text-[#d3b3a8] border-transparent hover:border-[#d3b3a8]/20'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" /> {item.label}
                </Link>
              ))}
              {showLandingLink && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <Link
                    to="/booking"
                    className="flex items-center gap-3 p-4 font-black rounded-xl border border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Globe className="w-5 h-5 text-slate-500" /> Ver Landing Pública
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};
