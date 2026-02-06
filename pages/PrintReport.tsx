
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DB, AppSettings } from '../services/db';
import { Patient, DermHistory, TrichHistory, Session, LabResult } from '../types';
import { Printer, ChevronLeft, Calendar, User, Phone, MapPin, Activity } from 'lucide-react';

const PrintReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = React.useState<Patient | null>(null);
  const [settings, setSettings] = React.useState<AppSettings | null>(null);

  const [dermHist, setDermHist] = React.useState<DermHistory[]>([]);
  const [trichHist, setTrichHist] = React.useState<TrichHistory[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [labs, setLabs] = React.useState<LabResult[]>([]);

  React.useEffect(() => {
    const loadReportData = async () => {
      try {
        const s = await DB.settings.get();
        setSettings(s);

        if (id) {
          const p = await DB.patients.getById(id);
          if (p) {
            setPatient(p);
            // Parallel fetching
            const [dh, th, sess, l] = await Promise.all([
              DB.derm.getByPatient(id),
              DB.trich.getByPatient(id),
              DB.sessions.getByPatient(id),
              DB.labs.getByPatient(id)
            ]);

            setDermHist(dh);
            setTrichHist(th);
            setSessions(sess);
            setLabs(l);
          }
        }
      } catch (e) {
        console.error("Error loading report data:", e);
      }
    };
    loadReportData();
  }, [id]);

  React.useEffect(() => {
    if (patient && settings) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [patient, settings]);

  if (!patient || !settings) return <div className="p-20 text-center">Cargando expediente...</div>;

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="mt-8 mb-4 border-b-2 border-slate-900 pb-1">
      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{title}</h3>
    </div>
  );

  const DataRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex gap-2 py-1 text-sm border-b border-slate-100 last:border-0">
      <span className="font-bold text-slate-600 min-w-[150px]">{label}:</span>
      <span className="text-slate-900">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="max-w-[800px] mx-auto p-12 bg-white print:p-0 min-h-screen">
      {/* Botón Volver (Solo se ve en pantalla) */}
      <div className="print:hidden mb-8 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all">
          <ChevronLeft className="w-4 h-4" /> Volver al Expediente
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg">
          <Printer className="w-4 h-4" /> Imprimir Ahora
        </button>
      </div>

      {/* HEADER MÉDICO */}
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
        <div className="flex gap-4 items-center">
          <div className="flex items-center justify-center bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
            style={{ width: settings.logoWidth + 10, height: settings.logoHeight + 10 }}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} style={{ width: settings.logoWidth, height: settings.logoHeight, objectFit: 'contain' }} alt="Logo Clinica" />
            ) : (
              <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center font-black text-2xl">
                {settings.appName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">{settings.appName}</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Servicio de Dermatología y Tricología</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          <p>Expediente generado el:</p>
          <p className="text-slate-900 text-sm">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* DATOS DEL PACIENTE */}
      <SectionHeader title="Datos del Paciente" />
      <div className="grid grid-cols-2 gap-x-12 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <DataRow label="Nombre Completo" value={patient.nombre_completo} />
          <DataRow label="ID / Documento" value={patient.documento_identidad} />
          <DataRow label="Nacimiento" value={patient.fecha_nacimiento} />
          <DataRow label="Ocupación" value={patient.ocupacion} />
        </div>
        <div className="space-y-1">
          <DataRow label="Sexo" value={patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Femenino' : 'Otro'} />
          <DataRow label="Teléfono" value={patient.telefono} />
          <DataRow label="Correo" value={patient.correo} />
          <DataRow label="Dirección" value={patient.direccion} />
        </div>
      </div>

      {/* HISTORIA DERMATOLÓGICA */}
      {dermHist.length > 0 && (
        <>
          <SectionHeader title="Historial Clínico Dermatológico" />
          {dermHist.map((h, idx) => (
            <div key={h.id} className={`space-y-4 ${idx > 0 ? 'mt-8 pt-8 border-t border-dashed border-slate-300' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="bg-slate-200 px-3 py-1 rounded text-xs font-black">CONSULTA: {new Date(h.fecha).toLocaleDateString()}</span>
                <span className="font-bold text-xs uppercase text-slate-500">Fitzpatrick: {h.tipo_piel_fitzpatrick}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase">Motivo de Consulta:</h4>
                  <p className="text-sm font-bold text-slate-800 italic">"{h.motivo_consulta}"</p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase">Antecedentes Personales:</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{h.antecedentes_personales_patologicos || 'Negados'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase">Antecedentes Familiares:</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{h.antecedentes_familiares || 'Negados'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase">Evolución y Notas:</h4>
                  <p className="text-xs text-slate-700">{h.evolucion_clinica}</p>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* HISTORIA TRICOLÓGICA */}
      {trichHist.length > 0 && (
        <>
          <SectionHeader title="Estudio Tricológico" />
          {trichHist.map((th) => (
            <div key={th.id} className="space-y-3 mb-6">
              <span className="bg-slate-200 px-3 py-1 rounded text-xs font-black">ANÁLISIS CAPILAR: {new Date(th.fecha).toLocaleDateString()}</span>
              <div className="grid grid-cols-2 gap-4">
                <DataRow label="Inicio de Caída" value={th.inicio_caida} />
                <DataRow label="Duración" value={th.duracion} />
                <DataRow label="Patrón de Caída" value={th.patron_caida} />
                <DataRow label="Cantidad Diaria" value={th.cantidad_diaria} />
                <DataRow label="COVID Previo" value={th.covid ? 'SÍ' : 'NO'} />
                <DataRow label="Déficit Nutricional" value={th.deficits_nutricionales} />
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs italic">
                <span className="font-bold block mb-1 uppercase">Factores Desencadenantes:</span>
                {th.factores_desencadenantes || 'No especificados'}
              </div>
            </div>
          ))}
        </>
      )}

      {/* EVOLUCIÓN DE SESIONES */}
      {sessions.length > 0 && (
        <>
          <SectionHeader title="Seguimiento y Sesiones" />
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-600">
                <th className="p-2 border border-slate-200">Fecha</th>
                <th className="p-2 border border-slate-200">Evolución Clínica</th>
                <th className="p-2 border border-slate-200">Ajuste Terapéutico</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="text-xs">
                  <td className="p-2 border border-slate-200 font-bold whitespace-nowrap">{new Date(s.fecha).toLocaleDateString()}</td>
                  <td className="p-2 border border-slate-200">{s.evolucion_clinica}</td>
                  <td className="p-2 border border-slate-200 font-bold text-blue-800">{s.ajustes_terapeuticos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* PIE DE PÁGINA DE FIRMA */}
      <div className="mt-20 flex justify-between items-end">
        <div className="text-[10px] text-slate-400">
          <p>Documento médico legal.</p>
          <p>Prohibida su reproducción sin consentimiento.</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
          <p className="text-xs font-black text-slate-900">{settings.doctorName}</p>
          <p className="text-[10px] text-slate-500 font-bold">{settings.doctorProfession}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;
