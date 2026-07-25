import React from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { DB } from '../services/db';
import { AppointmentForm } from '../components/AppointmentForm';
import { AppointmentCard } from '../components/AppointmentCard';
import { AppointmentRequest } from '../types';

const toDateInputValue = (d: Date) => d.toISOString().split('T')[0];

const Agenda: React.FC = () => {
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([]);
  const [selectedDate, setSelectedDate] = React.useState(toDateInputValue(new Date()));
  const [showForm, setShowForm] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const all = await DB.appointments.getAll();
      setAppointments(all);
    } catch (error) {
      console.error('Error loading agenda:', error);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateInputValue(d));
  };

  const dayAppointments = appointments
    .filter((a) => a.fecha_preferida === selectedDate && a.estado !== 'cancelada')
    .sort((a, b) => a.hora_preferida.localeCompare(b.hora_preferida));

  const cardClasses = 'bg-white rounded-[2rem] border border-slate-300 shadow-md overflow-hidden';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Agenda</h1>
          <p className="text-slate-600 font-semibold">Citas del día, por especialidad y estado.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cerrar' : 'Nueva Cita'}
        </button>
      </div>

      {showForm && (
        <AppointmentForm onSaved={() => { loadData(); setShowForm(false); }} />
      )}

      <section className={`${cardClasses} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => shiftDay(-1)} aria-label="Día anterior" className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-800"
          />
          <button onClick={() => shiftDay(1)} aria-label="Día siguiente" className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition-all">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-4">
          {dayAppointments.length > 0 ? (
            dayAppointments.map((app) => (
              <AppointmentCard key={app.id} appointment={app} showConfirm={true} onChanged={loadData} />
            ))
          ) : (
            <div className="py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin citas para este día</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Agenda;
