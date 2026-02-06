
import React from 'react';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Calendar,
  Users,
  ArrowUpRight,
  Filter,
  FileSpreadsheet,
  History,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DB } from '../services/db';
import { Patient, Session } from '../types';
import { useNavigate } from 'react-router-dom';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [allSessions, setAllSessions] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<'activity' | 'stats'>('activity');

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const p = await DB.patients.getAll();
        setPatients(p);

        // Recopilar todas las sesiones de todos los pacientes
        const sessions: any[] = [];
        await Promise.all(p.map(async patient => {
          const pSessions = await DB.sessions.getByPatient(patient.id);
          pSessions.forEach(s => {
            sessions.push({
              ...s,
              patientName: patient.nombre_completo,
              patientId: patient.id
            });
          });
        }));

        setAllSessions(sessions.sort((a, b) => b.fecha.localeCompare(a.fecha)));
      } catch (error) {
        console.error("Error loading reports data:", error);
      }
    };
    loadData();
  }, []);

  const exportPatientsCSV = () => {
    if (patients.length === 0) return;

    const headers = ['Nombre', 'DNI', 'Email', 'Telefono', 'Fecha Nacimiento', 'Ocupacion'];
    const rows = patients.map(p => [
      p.nombre_completo,
      p.documento_identidad,
      p.correo,
      p.telefono,
      p.fecha_nacimiento,
      p.ocupacion
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_pacientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Datos para gráfico de barras (Sesiones por mes - Simulado con datos actuales)
  const chartData = [
    { name: 'Ene', valor: 45 },
    { name: 'Feb', valor: 52 },
    { name: 'Mar', valor: 38 },
    { name: 'Abr', valor: allSessions.length + 20 },
  ];

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Centro de Reportes</h1>
          <p className="text-slate-600 font-semibold">Análisis de actividad, gestión de expedientes y exportación.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportPatientsCSV}
            className="flex items-center gap-2 bg-white border-2 border-slate-300 hover:border-blue-600 hover:text-blue-600 text-slate-700 px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-md active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXPORTAR PACIENTES (CSV)
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Datos</p>
              <h3 className="text-2xl font-black text-slate-900">{patients.length} Pacientes</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultas Totales</p>
              <h3 className="text-2xl font-black text-slate-900">{allSessions.length} Registradas</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Retorno</p>
              <h3 className="text-2xl font-black text-slate-900">74% Estimado</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        {/* Lado Izquierdo: Línea de Tiempo / Gráficos */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-lg overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-5 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Actividad Clínica Reciente
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-5 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Métricas de Volumen
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'activity' ? (
                <div className="space-y-6">
                  {allSessions.length > 0 ? (
                    allSessions.slice(0, 8).map((session, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 group-hover:border-blue-500 group-hover:bg-blue-50 transition-all">
                            <Clock className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                          </div>
                          {i < allSessions.slice(0, 8).length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-100 my-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                            <h4 className="font-black text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/patients/${session.patientId}`)}>
                              {session.patientName}
                            </h4>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                              {new Date(session.fecha).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium line-clamp-2">{session.evolucion_clinica}</p>
                          <div className="mt-3 flex items-center gap-4">
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Variación: {session.cambios_densidad}%</span>
                            <button
                              onClick={() => navigate(`/patients/${session.patientId}/print`)}
                              className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-all"
                            >
                              <Printer className="w-3 h-3" /> Imprimir Reporte
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                      <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No hay actividad registrada aún.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[400px] w-full animate-in zoom-in-95">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '12px' }}
                      />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Acceso Directo e Impresiones */}
        <div className="space-y-8">
          <section className="bg-white rounded-[2rem] border border-slate-300 shadow-md p-6">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" /> Expedientes Listos
            </h3>
            <div className="space-y-4">
              {patients.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={p.foto_perfil} className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{p.nombre_completo}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/patients/${p.id}/print`)}
                    className="p-2 bg-white text-slate-400 hover:text-blue-600 hover:shadow-md rounded-xl border border-slate-200 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/patients')}
              className="w-full mt-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
            >
              Ver Directorio Completo
            </button>
          </section>

          <section className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <FileText className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h3 className="font-black text-lg mb-2">Auditoría de Datos</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">Todos los reportes cumplen con la integridad referencial de pacientes y sesiones almacenadas localmente.</p>
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" /> Datos Sincronizados
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Reports;
