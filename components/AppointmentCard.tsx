import React from 'react';
import { ShieldCheck, ShieldOff, Pencil } from 'lucide-react';
import { DB } from '../services/db';
import { AppointmentRequest } from '../types';
import { useToast } from '../context/ToastContext';

const estadoBadgeClasses: Record<AppointmentRequest['estado'], string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
};

export const AppointmentCard: React.FC<{
  appointment: AppointmentRequest;
  showConfirm: boolean;
  onChanged: () => void;
}> = ({ appointment, showConfirm, onChanged }) => {
  const { notify } = useToast();
  const [rescheduling, setRescheduling] = React.useState(false);
  const [fecha, setFecha] = React.useState(appointment.fecha_preferida);
  const [hora, setHora] = React.useState(appointment.hora_preferida);
  const [saving, setSaving] = React.useState(false);

  const handleUpdateStatus = async (estado: 'confirmada' | 'cancelada') => {
    try {
      await DB.appointments.updateStatus(appointment.id, estado);
      notify(estado === 'confirmada' ? 'Cita confirmada' : 'Cita cancelada', 'success');
      onChanged();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      notify('No se pudo actualizar la cita', 'error');
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DB.appointments.update(appointment.id, { fecha_preferida: fecha, hora_preferida: hora });
      notify('Cita reprogramada', 'success');
      setRescheduling(false);
      onChanged();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      notify('No se pudo reprogramar la cita', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all group">
      <div className="flex gap-4">
        <div className="font-black text-blue-600 text-sm py-1 border-r border-slate-200 pr-4 flex items-center justify-center min-w-[60px]">
          {appointment.hora_preferida}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">{appointment.paciente_nombre}</p>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${estadoBadgeClasses[appointment.estado]}`}>
              {appointment.estado}
            </span>
            {appointment.con_seguro ? (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                <ShieldCheck className="w-3 h-3" /> Con Seguro
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                <ShieldOff className="w-3 h-3" /> Sin Seguro
              </span>
            )}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            CI: {appointment.paciente_cedula || 'N/A'} · {appointment.especialidad === 'derm' ? 'DERMATOLOGÍA' : 'TRICOLOGÍA'} · {new Date(appointment.fecha_preferida + 'T00:00:00').toLocaleDateString()}
          </p>
        </div>
      </div>

      {rescheduling ? (
        <form onSubmit={handleReschedule} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
          />
          <input
            type="time"
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
          />
          <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setRescheduling(false)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all">
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {showConfirm && (
            <button
              onClick={() => handleUpdateStatus('confirmada')}
              disabled={appointment.estado === 'confirmada'}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Confirmar
            </button>
          )}
          <button
            onClick={() => handleUpdateStatus('cancelada')}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => setRescheduling(true)}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Reprogramar
          </button>
        </div>
      )}
    </div>
  );
};
