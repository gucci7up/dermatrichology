import React from 'react';
import { Calendar as CalendarIcon, Plus, ShieldCheck } from 'lucide-react';
import { DB } from '../services/db';
import { useToast } from '../context/ToastContext';

const emptyAppointmentForm = {
  paciente_nombre: '',
  paciente_telefono: '',
  paciente_cedula: '',
  especialidad: 'derm' as 'derm' | 'trich',
  fecha_preferida: '',
  hora_preferida: '',
  motivo: '',
  con_seguro: false,
};

export const AppointmentForm: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const { notify } = useToast();
  const [form, setForm] = React.useState(emptyAppointmentForm);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DB.appointments.save({
        id: crypto.randomUUID(),
        estado: 'pendiente',
        created_at: new Date().toISOString(),
        paciente_correo: '',
        ...form,
      });
      setForm(emptyAppointmentForm);
      notify('Cita creada correctamente', 'success');
      onSaved();
    } catch (error) {
      console.error('Error creating appointment:', error);
      notify('No se pudo crear la cita', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-sand-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <CalendarIcon className="w-40 h-40" />
      </div>

      <div className="relative z-10 space-y-5">
        <div>
          <h3 className="font-serif text-xl font-black mb-2">Nueva Cita</h3>
          <p className="text-sand-400 text-xs font-bold leading-relaxed">Completa los datos para agendar una cita.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Nombre del paciente"
            value={form.paciente_nombre}
            onChange={(e) => setForm({ ...form, paciente_nombre: e.target.value })}
            className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder-sand-500 font-bold"
          />
          <input
            type="tel"
            required
            placeholder="Teléfono"
            value={form.paciente_telefono}
            onChange={(e) => setForm({ ...form, paciente_telefono: e.target.value })}
            className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder-sand-500 font-bold"
          />
          <input
            type="text"
            required
            placeholder="Cédula"
            value={form.paciente_cedula}
            onChange={(e) => setForm({ ...form, paciente_cedula: e.target.value })}
            className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder-sand-500 font-bold"
          />
          <select
            value={form.especialidad}
            onChange={(e) => setForm({ ...form, especialidad: e.target.value as 'derm' | 'trich' })}
            className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all font-bold"
          >
            <option value="derm">Dermatología</option>
            <option value="trich">Tricología</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              value={form.fecha_preferida}
              onChange={(e) => setForm({ ...form, fecha_preferida: e.target.value })}
              className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all font-bold"
            />
            <input
              type="time"
              required
              value={form.hora_preferida}
              onChange={(e) => setForm({ ...form, hora_preferida: e.target.value })}
              className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all font-bold"
            />
          </div>
          <textarea
            placeholder="Motivo de la consulta"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder-sand-500 font-bold resize-none"
          />
          <label className="flex items-center gap-3 p-3 bg-sand-800 border border-sand-700 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={form.con_seguro}
              onChange={(e) => setForm({ ...form, con_seguro: e.target.checked })}
              className="w-5 h-5 rounded-md text-terracotta-500 focus:ring-terracotta-500"
            />
            <ShieldCheck className="w-4 h-4 text-terracotta-400" />
            <span className="text-sm font-bold">Paciente con seguro médico</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-terracotta-700 hover:bg-terracotta-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-4 h-4" /> {saving ? 'Guardando...' : 'Crear Cita'}
          </button>
        </form>
      </div>
    </section>
  );
};
