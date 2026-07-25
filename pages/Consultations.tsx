
import React from 'react';
import {
  Stethoscope,
  Search,
  Clock,
  ChevronRight,
  TrendingUp,
  History,
  UserPlus,
  ArrowRight,
  Filter
} from 'lucide-react';
import { DB } from '../services/db';
import { Patient, Session } from '../types';
import { useNavigate, Link } from 'react-router-dom';

const Consultations: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [recentSessions, setRecentSessions] = React.useState<any[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);

  const loadData = React.useCallback(async () => {
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
    } catch (error) {
      console.error("Error loading consultations data:", error);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPatients = patients.filter(p =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.documento_identidad.includes(searchTerm)
  ).slice(0, 5);

  const cardClasses = "bg-white rounded-[2rem] border border-sand-300 shadow-md overflow-hidden";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-sand-900">Consultas y Evolución</h1>
          <p className="text-sand-600 font-semibold">Gestión operativa de sesiones clínicas y seguimiento.</p>
        </div>
        <Link to="/patients/new" className="flex items-center gap-2 bg-sand-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-xl active:scale-95">
          <UserPlus className="w-4 h-4" /> REGISTRAR PARA CONSULTA
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Principal: Timeline de Actividad */}
        <div className="lg:col-span-2 space-y-6">
          <section className={cardClasses}>
            <div className="p-6 border-b border-sand-200 flex items-center justify-between bg-sand-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-terracotta-600 rounded-xl shadow-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-lg text-sand-900">Actividad Clínica Reciente</h3>
              </div>
            </div>

            <div className="divide-y divide-sand-200">
              {recentSessions.length > 0 ? (
                recentSessions.slice(0, 10).map((session, i) => (
                  <div key={session.id} className="p-6 hover:bg-sand-50 transition-all group">
                    <div className="flex items-start gap-4">
                      <img src={session.patientPhoto} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-md" alt={`Foto de ${session.patientName}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="font-black text-sand-900 group-hover:text-terracotta-600 transition-colors truncate">
                            {session.patientName}
                          </h4>
                          <span className="text-[10px] font-black text-sand-400 bg-white border border-sand-200 px-3 py-1 rounded-full whitespace-nowrap">
                            {new Date(session.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-sand-600 font-medium line-clamp-2 italic mb-3">
                          "{session.evolucion_clinica}"
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                            <TrendingUp className="w-3 h-3" /> Evolución: {session.cambios_densidad}%
                          </div>
                          <button
                            onClick={() => navigate(`/patients/${session.patientId}`)}
                            className="text-[10px] font-black text-terracotta-600 hover:text-terracotta-800 flex items-center gap-1"
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
                  <Clock className="w-12 h-12 text-sand-200 mx-auto mb-4" />
                  <p className="font-black text-sand-400 uppercase tracking-widest text-sm">No hay consultas registradas hoy.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Columna Lateral: Nueva Consulta y Búsqueda */}
        <div className="space-y-6">
          <section className="bg-sand-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Stethoscope className="w-40 h-40" />
            </div>

            <div className="relative z-10 space-y-6">
              <div>
                <h3 className="text-xl font-black mb-2">Iniciar Consulta</h3>
                <p className="text-sand-400 text-xs font-bold leading-relaxed">Busca un paciente existente para registrar una nueva sesión o evolución.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-500" />
                <input
                  type="text"
                  placeholder="Nombre o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-sand-800 border border-sand-700 rounded-2xl text-sm focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder-sand-500 font-bold"
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
                        <img src={p.foto_perfil} className="w-8 h-8 rounded-full object-cover" alt={`Foto de ${p.nombre_completo}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate">{p.nombre_completo}</p>
                          <p className="text-[9px] text-sand-500 font-bold">{p.documento_identidad}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-sand-600 group-hover:text-terracotta-500 transition-colors" />
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs font-black text-sand-500 uppercase">Sin resultados</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Consultations;
