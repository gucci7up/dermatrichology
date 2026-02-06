
import React from 'react';
import { Users, Calendar, TrendingUp, FlaskConical, Plus, ArrowUpRight, Search, Clock, ExternalLink } from 'lucide-react';
import { DB, AppSettings } from '../services/db';
import { Patient, AppointmentRequest } from '../types';
import { Link, useNavigate } from 'react-router-dom';

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${trend > 0 ? 'text-[#d3b3a8]' : 'text-slate-400'}`}>
        {trend > 0 && <TrendingUp className="w-3 h-3" />}
        <span>{trend > 0 ? `+${trend}% vs mes anterior` : 'Sin cambios'}</span>
      </div>
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([]);
  const [settings, setSettings] = React.useState<AppSettings>({
    appName: 'DermaTrich',
    logoUrl: '',
    logoWidth: 220,
    logoHeight: 100,
    doctorName: 'Cargando...',
    doctorProfession: '...',
    doctorPhoto: ''
  });

  const [totalPatients, setTotalPatients] = React.useState(0);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const allPatients = await DB.patients.getAll();
        setTotalPatients(allPatients.length);
        setPatients(allPatients.slice(0, 5));

        const allAppointments = await DB.appointments.getAll();
        setAppointments(allAppointments.filter(a => a.estado === 'pendiente').slice(0, 5));

        const currentSettings = await DB.settings.get();
        setSettings(currentSettings);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    loadData();

    const handleSettingsChange = async () => {
      const s = await DB.settings.get();
      setSettings(s);
    };
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 truncate">Bienvenido, {settings.doctorName}</h1>
          <p className="text-slate-500">Aquí tienes un resumen de la actividad hoy.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/booking" className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm">
            <ExternalLink className="w-4 h-4" />
            Ver Landing Pública
          </Link>
          <Link to="/patients/new" className="flex items-center gap-2 bg-[#d3b3a8] hover:bg-[#c4a499] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-[#d3b3a8]/20">
            <Plus className="w-4 h-4" />
            Nuevo Paciente
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Pacientes Totales" value={totalPatients} icon={Users} trend={12} color="bg-[#d3b3a8]" />
        <StatCard label="Citas Pendientes" value={appointments.length} icon={Clock} trend={0} color="bg-indigo-600" />
        <StatCard label="Tratamientos Activos" value="42" icon={TrendingUp} trend={8} color="bg-emerald-500" />
        <StatCard label="Labs Pendientes" value="3" icon={FlaskConical} trend={0} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">Pacientes Recientes</h2>
              <Link to="/patients" className="text-sm font-semibold text-[#d3b3a8] hover:text-[#c4a499] flex items-center gap-1">
                Ver todos <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">ID / Documento</th>
                    <th className="px-6 py-4">Última Visita</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {patients.length > 0 ? patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={patient.foto_perfil} className="w-10 h-10 rounded-full object-cover" alt="" />
                          <div>
                            <p className="font-semibold text-slate-800">{patient.nombre_completo}</p>
                            <p className="text-xs text-slate-500 capitalize">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}, {patient.fecha_nacimiento}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{patient.documento_identidad}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">Reciente</td>
                      <td className="px-6 py-4">
                        <Link to={`/patients/${patient.id}`} className="p-2 text-slate-400 hover:text-[#d3b3a8] transition-colors inline-block">
                          <Search className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400">No hay pacientes registrados recientemente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
            <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" /> Solicitudes Web
            </h2>
            <div className="space-y-4">
              {appointments.length > 0 ? appointments.map(app => (
                <div key={app.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-indigo-300 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-black text-slate-900 text-sm">{app.paciente_nombre}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${app.especialidad === 'derm' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {app.especialidad === 'derm' ? 'Derma' : 'Trich'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2 italic">"{app.motivo}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(app.fecha_preferida).toLocaleDateString()}
                    </span>
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
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                    >
                      Gestionar
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-center py-8 text-slate-400 text-sm">No hay solicitudes nuevas.</p>
              )}
            </div>
            <Link to="/booking" className="w-full mt-6 py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              Ver Landing Page <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
