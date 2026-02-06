
import React from 'react';
import {
  Stethoscope,
  Search,
  Plus,
  Clock,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  History,
  UserPlus,
  ArrowRight,
  Filter
} from 'lucide-react';
import { DB } from '../services/db';
import { Patient, Session, AppointmentRequest } from '../types';
import { useNavigate, Link } from 'react-router-dom';

const Consultations: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [recentSessions, setRecentSessions] = React.useState<any[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const allPatients = await DB.patients.getAll();
        setPatients(allPatients);

        const allSessions: any[] = [];
        // Fetch sessions for each patient concurrently
        await Promise.all(allPatients.map(async p => {
          const pSessions = await DB.sessions.getByPatient(p.id);
          pSessions.forEach(s => {
            allSessions.push({
              ...s,
              patientName: p.nombre_completo,
              patientPhoto: p.foto_perfil,
              patientId: p.id
            });
          });
        }));

        setRecentSessions(allSessions.sort((a, b) => b.fecha.localeCompare(a.fecha)));

        // Load real appointments
        const allAppointmentsRes = await DB.appointments.getAll();
        const filteredAppointments = allAppointmentsRes
          .filter(a => a.estado !== 'cancelada')
          .sort((a, b) => {
            const dateCompare = a.fecha_preferida.localeCompare(b.fecha_preferida);
            if (dateCompare !== 0) return dateCompare;
            return a.hora_preferida.localeCompare(b.hora_preferida);
          });
        setAppointments(filteredAppointments);
      } catch (error) {
        console.error("Error loading consultations data:", error);
      }
    };
    loadData();
  }, []);

  const filteredPatients = patients.filter(p =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.documento_identidad.includes(searchTerm)
  ).slice(0, 5);

  const cardClasses = "bg-white rounded-[2rem] border border-slate-300 shadow-md overflow-hidden";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Consultas y Evolución</h1>
          <p className="text-slate-600 font-semibold">Gestión operativa de sesiones clínicas y seguimiento.</p>
        </div>
        <Link to="/patients/new" className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-xl active:scale-95">
          <UserPlus className="w-4 h-4" /> REGISTRAR PARA CONSULTA
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Principal: Timeline de Actividad */}
        <div className="lg:col-span-2 space-y-6">
          <section className={cardClasses}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl shadow-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-lg text-slate-900">Actividad Clínica Reciente</h3>
              </div>
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver Historial Completo</button>
            </div>

            <div className="divide-y divide-slate-200">
              {recentSessions.length > 0 ? (
                recentSessions.slice(0, 10).map((session, i) => (
                  <div key={session.id} className="p-6 hover:bg-slate-50 transition-all group">
                    <div className="flex items-start gap-4">
                      <img src={session.patientPhoto} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-md" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {session.patientName}
                          </h4>
                          <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full whitespace-nowrap">
                            {new Date(session.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 font-medium line-clamp-2 italic mb-3">
                          "{session.evolucion_clinica}"
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                            <TrendingUp className="w-3 h-3" /> Evolución: {session.cambios_densidad}%
                          </div>
                          <button
                            onClick={() => navigate(`/patients/${session.patientId}`)}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Abrir Expediente <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center">
                  <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No hay consultas registradas hoy.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Columna Lateral: Nueva Consulta y Búsqueda */}
        <div className="space-y-6">
          <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Stethoscope className="w-40 h-40" />
            </div>

            <div className="relative z-10 space-y-6">
              <div>
                <h3 className="text-xl font-black mb-2">Iniciar Consulta</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed">Busca un paciente existente para registrar una nueva sesión o evolución.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nombre o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 font-bold"
                />
              </div>

              {searchTerm && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/consultations/new?patientId=${p.id}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-left group"
                      >
                        <img src={p.foto_perfil} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate">{p.nombre_completo}</p>
                          <p className="text-[9px] text-slate-500 font-bold">{p.documento_identidad}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs font-black text-slate-500 uppercase">Sin resultados</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* AGENDA PRÓXIMA DINÁMICA - Diseño según imagen */}
          <section className={`${cardClasses} p-6 shadow-xl border-2 border-slate-200`}>
            <div className="flex items-center gap-3 mb-6">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <h3 className="font-black text-slate-900 text-base uppercase tracking-widest">Agenda Próxima</h3>
            </div>

            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex gap-4 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all group relative">
                    <div className="font-black text-blue-600 text-sm py-1 border-r border-slate-200 pr-4 flex items-center justify-center min-w-[60px]">
                      {app.hora_preferida}
                    </div>
                    <div className="flex-1 pr-10">
                      <p className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">{app.paciente_nombre}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {app.especialidad === 'derm' ? 'DERMATOLOGÍA' : 'TRICOLOGÍA'} - {new Date(app.fecha_preferida).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Since we don't have patientId directly in AppointmentRequest easily mapped (it stores name string), 
                        we might need to search for it or just go to patient creation if name not found.
                        For now, assume manual search is preferred or we'd need to match strings.
                        Actually, let's keep it simple: "Atender" goes to patients list or search in this page.
                        But wait, the user wants "Logic". Let's assume we can match by name or phone if we really wanted to.
                        However, simplistically, let's just make the item clickable to search/filter in the search bar above?
                        Better: Add a button to "Registrar" if new, or "Atender" if existing.
                        Let's just change the click to navigate to NewConsultation if feasible, but we lack ID.
                        Okay, I'll assume for now these are "Solicitudes" mainly for new patients or existing.
                        Let's adding a generic "Atender" button that populates the SEARCH bar?
                        No, that's clunky.
                        Let's just leave the appointment display as is but allow clicking to copy name to clipboard?
                        Actually, existing code didn't have actions. I will add a small "Atender" button that just alerts for now 
                        OR better, tries to find patient. 
                        Let's stick to the prompt: "Consultations page... logic".
                        I will make the SEARCH bar the primary way to start.
                    */}
                    <button
                      onClick={() => navigate('/patients/new', {
                        state: {
                          prefill: {
                            nombre_completo: app.paciente_nombre,
                            telefono: app.paciente_telefono,
                            correo: app.paciente_correo,
                            motivo: app.motivo,
                            specialty: app.especialidad,
                            fecha_nacimiento: app.fecha_nacimiento
                          }
                        }
                      })}
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-lg translate-x-4 group-hover:translate-x-0"
                    >
                      Registrar y Atender
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay citas agendadas</p>
                </div>
              )}
            </div>

            <button className="w-full mt-8 py-4 border-2 border-slate-900 rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] hover:bg-slate-900 hover:text-white transition-all shadow-md">
              Configurar Agenda Externa
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Consultations;
