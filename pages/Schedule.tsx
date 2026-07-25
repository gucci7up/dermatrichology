import React from 'react';
import { CalendarClock, Users } from 'lucide-react';
import { DB } from '../services/db';
import { AppointmentForm } from '../components/AppointmentForm';
import { AppointmentCard } from '../components/AppointmentCard';
import { Patient, AppointmentRequest } from '../types';

const Schedule: React.FC = () => {
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  const loadData = React.useCallback(async () => {
    try {
      const allPatients = await DB.patients.getAll();
      setPatients(allPatients);

      const allAppointments = await DB.appointments.getAll();
      const upcoming = allAppointments
        .filter((a) => a.estado !== 'cancelada')
        .sort((a, b) => {
          const dateCompare = a.fecha_preferida.localeCompare(b.fecha_preferida);
          if (dateCompare !== 0) return dateCompare;
          return a.hora_preferida.localeCompare(b.hora_preferida);
        });
      setAppointments(upcoming);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPatients = patients.filter((p) =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cardClasses = 'bg-white rounded-[2rem] border border-sand-300 shadow-md overflow-hidden';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-sand-900">Agendar Citas</h1>
        <p className="text-sand-600 font-semibold">Registra, cancela o reprograma citas de pacientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <AppointmentForm onSaved={loadData} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className={`${cardClasses} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <CalendarClock className="w-6 h-6 text-terracotta-600" />
              <h3 className="font-black text-sand-900 text-base uppercase tracking-widest">Próximas Citas</h3>
            </div>
            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((app) => (
                  <AppointmentCard key={app.id} appointment={app} showConfirm={false} onChanged={loadData} />
                ))
              ) : (
                <div className="py-10 text-center bg-sand-50 rounded-3xl border-2 border-dashed border-sand-200">
                  <p className="text-xs font-black text-sand-400 uppercase tracking-widest">No hay citas agendadas</p>
                </div>
              )}
            </div>
          </section>

          <section className={`${cardClasses} p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-sand-500" />
              <h3 className="font-black text-sand-900 text-base uppercase tracking-widest">Pacientes Registrados</h3>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mb-4 px-4 py-2.5 bg-sand-50 border border-sand-300 rounded-xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none"
            />
            <div className="divide-y divide-sand-100 max-h-96 overflow-y-auto">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-bold text-sand-800">{p.nombre_completo}</span>
                    <span className="text-xs font-bold text-sand-400">{p.telefono}</span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs font-black text-sand-400 uppercase">Sin resultados</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
