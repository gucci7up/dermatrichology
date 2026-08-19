import React from 'react';
import { DB } from '../services/db';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Users as UsersIcon, UserPlus, Mail, Lock, ShieldCheck, Trash2, KeyRound, Loader2 } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  doctor: 'Doctor(a)',
  assistant: 'Asistente',
};

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-[#d3b3a8]/20 text-[#8a6055] border-[#d3b3a8]/40',
  doctor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assistant: 'bg-sky-50 text-sky-700 border-sky-200',
};

const MIN_PASSWORD = 8;

const emptyForm = { full_name: '', email: '', password: '', role: 'doctor' as UserRole };

const Users: React.FC = () => {
  const { profile } = useAuth();
  const { notify } = useToast();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const inputClasses = "w-full px-5 py-3 bg-white border border-slate-400 rounded-xl focus:ring-2 focus:ring-[#d3b3a8] focus:border-[#d3b3a8] outline-none transition-all placeholder-slate-400 text-slate-900 shadow-sm font-medium";
  const labelClasses = "text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-1.5 block";

  const loadUsers = React.useCallback(async () => {
    try {
      setUsers(await DB.profiles.getAll());
    } catch (e: any) {
      console.error('Users: load failed', e);
      notify(e?.message || 'No se pudieron cargar los usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  React.useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < MIN_PASSWORD) {
      notify(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`, 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await DB.profiles.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setUsers(prev => [...prev, created].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setForm(emptyForm);
      notify(`Usuario ${created.full_name} creado correctamente.`, 'success');
    } catch (e: any) {
      notify(e?.message || 'No se pudo crear el usuario.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (user: UserProfile, role: UserRole) => {
    try {
      const updated = await DB.profiles.update(user.id, { role });
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      notify(`Rol de ${updated.full_name} actualizado.`, 'success');
    } catch (e: any) {
      notify(e?.message || 'No se pudo cambiar el rol.', 'error');
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    const password = window.prompt(`Nueva contraseña para ${user.full_name} (mínimo ${MIN_PASSWORD} caracteres):`);
    if (!password) return;
    if (password.length < MIN_PASSWORD) {
      notify(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`, 'error');
      return;
    }
    try {
      await DB.profiles.update(user.id, { password });
      notify(`Contraseña de ${user.full_name} actualizada.`, 'success');
    } catch (e: any) {
      notify(e?.message || 'No se pudo actualizar la contraseña.', 'error');
    }
  };

  const handleDelete = async (user: UserProfile) => {
    if (!window.confirm(`¿Eliminar el usuario ${user.full_name} (${user.email})? Esta acción no se puede deshacer.`)) return;
    try {
      await DB.profiles.delete(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      notify('Usuario eliminado.', 'success');
    } catch (e: any) {
      notify(e?.message || 'No se pudo eliminar el usuario.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-[#d3b3a8]" /> Usuarios
        </h1>
        <p className="text-slate-500 font-medium mt-1">Alta y administración de accesos al sistema.</p>
      </div>

      {/* Alta de usuario */}
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#d3b3a8]" /> Nuevo usuario
        </h2>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}>Nombre completo</label>
            <input
              className={inputClasses}
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="Dra. Ana Gómez"
              required
            />
          </div>

          <div>
            <label className={labelClasses}><Mail className="w-3 h-3 inline mr-1" />Correo electrónico</label>
            <input
              type="email"
              className={inputClasses}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="ana@clinica.com"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className={labelClasses}><Lock className="w-3 h-3 inline mr-1" />Contraseña</label>
            <input
              type="password"
              className={inputClasses}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              required
            />
          </div>

          <div>
            <label className={labelClasses}><ShieldCheck className="w-3 h-3 inline mr-1" />Rol</label>
            <select
              className={inputClasses}
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#d3b3a8] text-white font-black rounded-xl shadow-lg shadow-[#d3b3a8]/30 hover:brightness-105 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          {saving ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>

      {/* Listado */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Usuarios registrados ({users.length})</h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 font-medium">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-medium">Todavía no hay usuarios.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {users.map(user => {
              const isSelf = user.id === profile?.id;
              return (
                <li key={user.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 truncate">
                      {user.full_name}
                      {isSelf && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400">(tú)</span>}
                    </p>
                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>

                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-[#d3b3a8] disabled:opacity-50"
                      value={user.role}
                      disabled={isSelf}
                      title={isSelf ? 'No puede cambiar su propio rol' : 'Cambiar rol'}
                      onChange={e => handleRoleChange(user, e.target.value as UserRole)}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleResetPassword(user)}
                      title="Restablecer contraseña"
                      className="p-2 text-slate-500 hover:text-[#d3b3a8] hover:bg-[#d3b3a8]/10 rounded-lg border border-transparent hover:border-[#d3b3a8]/20 transition-all"
                    >
                      <KeyRound className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDelete(user)}
                      disabled={isSelf}
                      title={isSelf ? 'No puede eliminar su propio usuario' : 'Eliminar usuario'}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Users;
