
import React from 'react';
import {
  TrendingUp,
  Beaker,
  Sparkles,
  BrainCircuit,
  Activity,
  Users,
  ClipboardCheck,
  Zap,
  CheckCircle2,
  Save,
  FileText,
  Upload,
  X,
  BarChart3,
  Edit3,
  Dna,
  Calendar as CalendarIcon,
  Eye,
  FileSearch
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { DB } from '../services/db';
import { aiService, FileData } from '../services/gemini';
import { Patient, LabResult } from '../types';

const Analytics: React.FC = () => {
  const [labInput, setLabInput] = React.useState('');
  const [pdfFile, setPdfFile] = React.useState<FileData | null>(null);
  const [fileName, setFileName] = React.useState<string>('');
  const [aiResponse, setAiResponse] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [sessionData, setSessionData] = React.useState<any[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>('');
  const [labHistoryData, setLabHistoryData] = React.useState<any[]>([]);
  const [patientLabs, setPatientLabs] = React.useState<LabResult[]>([]);
  const [expandedLabId, setExpandedLabId] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState({
    totalPatients: 0,
    activeTreatments: 0,
    successRate: 0,
    pendingLabs: 0
  });

  const markers = [
    "Ferritina", "Vitamina D", "Zinc", "TSH", "Hemoglobina",
    "Hierro", "B12", "Testosterona", "Cortisol", "PCR", "ANA"
  ];

  React.useEffect(() => {
    const loadData = async () => {
      const allPatients = await DB.patients.getAll();
      setPatients(allPatients);

      const allSessions: any[] = [];
      const patientsWithSessions = new Set();

      await Promise.all(allPatients.map(async p => {
        const pSessions = await DB.sessions.getByPatient(p.id);
        if (pSessions.length > 0) {
          patientsWithSessions.add(p.id);
          allSessions.push(...pSessions);
        }
      }));

      const chartData = allSessions
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(-10)
        .map(s => ({
          fecha: new Date(s.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          densidad: s.cambios_densidad
        }));

      setSessionData(chartData);
      setStats({
        totalPatients: allPatients.length,
        activeTreatments: patientsWithSessions.size,
        successRate: 85,
        pendingLabs: allPatients.length > 0 ? 3 : 0
      });
    };
    loadData();
  }, []);

  React.useEffect(() => {
    const loadPatientLabs = async () => {
      if (selectedPatientId) {
        const labs = await DB.labs.getByPatient(selectedPatientId);
        const sortedLabs = labs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setPatientLabs(sortedLabs);

        const parsedLabs = [...sortedLabs]
          .reverse()
          .map(lab => {
            const data: any = {
              fecha: new Date(lab.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
            };

            markers.forEach(marker => {
              const regex = new RegExp(`${marker}:?\\s*(\\d+\\.?\\d*)`, 'i');
              const match = lab.interpretacion.match(regex) || lab.resultados.match(regex);
              if (match) {
                data[marker] = parseFloat(match[1]);
              }
            });

            return data;
          })
          .filter(d => Object.keys(d).length > 1);

        setLabHistoryData(parsedLabs);
      } else {
        setLabHistoryData([]);
        setPatientLabs([]);
      }
    };
    loadPatientLabs();
  }, [selectedPatientId, saveSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setPdfFile({ data: base64Data, mimeType: file.type });
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setPdfFile(null);
    setFileName('');
  };

  const [extractedValues, setExtractedValues] = React.useState('');

  const handleAiInterpret = async () => {
    if (!selectedPatientId || (!labInput.trim() && !pdfFile)) return;
    setIsAnalyzing(true);
    setAiResponse('');
    setExtractedValues('');
    setSaveSuccess(false);

    try {
      const resultRaw = await aiService.interpretLabs(labInput, pdfFile || undefined);

      // Intentar limpiar y parsear JSON
      const cleanJson = resultRaw.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJson);
        setAiResponse(parsed.interpretacion_medica || "No se pudo interpretar el análisis médico.");
        setExtractedValues(parsed.valores_detectados || "Valores no extraídos específicamente.");
      } catch (jsonError) {
        console.warn("La IA no devolvió JSON válido, usando texto plano.", jsonError);
        setAiResponse(resultRaw);
        setExtractedValues(labInput || (pdfFile ? `Archivo: ${fileName}` : "Datos manuales"));
      }

    } catch (error) {
      setAiResponse("Error al procesar con IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToPatient = async () => {
    if (!selectedPatientId || !aiResponse) return;

    setIsSaving(true);
    const newLab: LabResult = {
      id: crypto.randomUUID(),
      paciente_id: selectedPatientId,
      fecha: new Date().toISOString(),
      analisis: pdfFile ? `Análisis PDF: ${fileName}` : "Interpretación de analítica",
      resultados: extractedValues || labInput || `Archivo: ${fileName}`, // Ahora guardamos los valores extraídos aquí
      interpretacion: aiResponse
    };

    try {
      await DB.labs.save(newLab);
      setSaveSuccess(true);
      setLabInput('');
      setPdfFile(null);
      setFileName('');
      setAiResponse('');
      setExtractedValues('');
    } catch (e) {
      console.error(e);
      alert("Error saving lab result");
    } finally {
      setIsSaving(false);
    }
  };

  const cardClasses = "bg-white rounded-3xl border border-slate-300 shadow-md p-6 overflow-hidden";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Análisis e Inteligencia Dual</h1>
          <p className="text-slate-600 font-semibold">Integración experta para Dermatología y Tricología.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Pacientes en Seguimiento', value: stats.totalPatients, icon: Users, color: 'text-[#d3b3a8]', bg: 'bg-[#d3b3a8]/5' },
          { label: 'Tratamientos Activos', value: stats.activeTreatments, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Tasa de Respuesta Positiva', value: `${stats.successRate}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Laboratorios Pendientes', value: stats.pendingLabs, icon: Beaker, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className={cardClasses}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} shadow-sm border border-slate-200/50`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2 space-y-8">
          <section className={`${cardClasses}`}>
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#d3b3a8] rounded-xl shadow-lg">
                  <Dna className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-xl text-slate-900">Monitorización de Biomarcadores</h3>
              </div>
            </div>

            {selectedPatientId && labHistoryData.length > 0 ? (
              <div className="h-[400px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={labHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Line name="Ferritina" type="monotone" dataKey="Ferritina" stroke="#d3b3a8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                    <Line name="Vitamina D" type="monotone" dataKey="Vitamina D" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                    <Line name="TSH" type="monotone" dataKey="TSH" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                    <Line name="Zinc" type="monotone" dataKey="Zinc" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Selecciona un paciente con laboratorios para ver evolución.</p>
              </div>
            )}
          </section>

          {/* TABLA DE RESULTADOS HISTÓRICOS POR PACIENTE */}
          {selectedPatientId && (
            <section className={`${cardClasses} animate-in fade-in duration-500`}>
              <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-xl shadow-lg">
                    <FileSearch className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Historial de Analíticas</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Resultados y Archivos del Paciente</p>
                  </div>
                </div>
              </div>

              {patientLabs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Análisis Realizado</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultados / Archivo</th>
                        <th className="px-4 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {patientLabs.map(lab => (
                        <React.Fragment key={lab.id}>
                          <tr className={`hover:bg-slate-50/80 transition-colors group ${expandedLabId === lab.id ? 'bg-[#d3b3a8]/5' : ''}`}>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-black text-slate-800">{new Date(lab.fecha).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs font-black text-slate-900 line-clamp-1">{lab.analisis}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-[#d3b3a8]" />
                                <span className="text-[11px] font-bold text-slate-600 line-clamp-1 italic">{lab.resultados}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => setExpandedLabId(expandedLabId === lab.id ? null : lab.id)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${expandedLabId === lab.id
                                  ? 'bg-[#d3b3a8] text-white shadow-md'
                                  : 'bg-white border border-slate-300 text-slate-600 hover:border-[#d3b3a8] hover:text-[#d3b3a8]'
                                  }`}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 inline" />
                                {expandedLabId === lab.id ? 'Cerrar' : 'Detalles'}
                              </button>
                            </td>
                          </tr>
                          {expandedLabId === lab.id && (
                            <tr className="bg-[#d3b3a8]/5 border-l-4 border-l-[#d3b3a8] animate-in slide-in-from-top-1 duration-300">
                              <td colSpan={4} className="px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Datos del Paciente</h4>
                                    <div className="p-4 bg-white rounded-2xl border border-[#d3b3a8]/20 shadow-sm text-xs font-bold text-slate-700 italic">
                                      {lab.resultados}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-[9px] font-black text-[#d3b3a8] uppercase tracking-widest flex items-center gap-2">
                                      <Activity className="w-3.5 h-3.5" /> Interpretación IA Almacenada
                                    </h4>
                                    <div className="p-5 bg-white rounded-2xl border border-[#d3b3a8]/20 shadow-md text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-line border-t-2 border-t-[#d3b3a8]">
                                      {lab.interpretacion}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-black text-slate-400 uppercase">Sin historial de laboratorios para este paciente</p>
                </div>
              )}
            </section>
          )}

          <section className={cardClasses}>
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#d3b3a8] rounded-xl shadow-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-xl text-slate-900">Respuesta Clínica de Densidad</h3>
              </div>
            </div>

            <div className="h-[250px] w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionData}>
                  <defs>
                    <linearGradient id="colorDens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d3b3a8" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#d3b3a8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
                  <Area type="monotone" dataKey="densidad" stroke="#d3b3a8" strokeWidth={4} fillOpacity={1} fill="url(#colorDens)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <section className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group border border-slate-800 h-fit sticky top-24">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <BrainCircuit className="w-32 h-32 text-white" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#d3b3a8] rounded-xl shadow-lg shadow-[#d3b3a8]/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-xl text-white">Interpretador IA</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#d3b3a8] uppercase tracking-widest ml-1">Seleccionar Paciente</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setAiResponse('');
                      setSaveSuccess(false);
                    }}
                    className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-[#d3b3a8] outline-none transition-all appearance-none font-medium"
                  >
                    <option value="">-- Buscar Paciente --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#d3b3a8] uppercase tracking-widest ml-1">Subir Archivo de Lab (PDF)</label>
                  {!fileName ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-800 hover:border-[#d3b3a8] transition-all group">
                      <Upload className="w-8 h-8 text-slate-500 group-hover:text-[#d3b3a8] mb-2" />
                      <p className="text-xs text-slate-400 font-bold uppercase">Cargar PDF</p>
                      <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-[#d3b3a8]/10 border border-[#d3b3a8]/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#d3b3a8]" />
                        <span className="text-xs text-blue-100 font-bold truncate max-w-[150px]">{fileName}</span>
                      </div>
                      <button onClick={removeFile} className="p-1 hover:bg-red-500/20 rounded-lg transition-all text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#d3b3a8] uppercase tracking-widest ml-1">O Texto de Resultados</label>
                  <textarea
                    value={labInput}
                    onChange={(e) => setLabInput(e.target.value)}
                    placeholder="Ingrese valores manualmente..."
                    className="w-full h-24 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-[#d3b3a8] outline-none transition-all placeholder-slate-500 font-medium resize-none"
                  />
                </div>

                <button
                  onClick={handleAiInterpret}
                  disabled={isAnalyzing || (!labInput && !pdfFile) || !selectedPatientId}
                  className="w-full bg-[#d3b3a8] hover:bg-[#c4a499] disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-[#d3b3a8]/10 flex items-center justify-center gap-3 active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ANALIZANDO...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-5 h-5" />
                      PROCESAR CON IA
                    </>
                  )}
                </button>
              </div>

              {aiResponse && (
                <div className="mt-6 p-6 bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border-2 border-[#d3b3a8]/20">
                  <div className="flex items-center justify-between mb-4 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#d3b3a8]" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revisión del Informe</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valores Extraídos (Se guardarán en Historial)</label>
                      <textarea
                        value={extractedValues}
                        onChange={(e) => setExtractedValues(e.target.value)}
                        className="w-full h-32 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-blue-900 text-xs font-bold focus:ring-2 focus:ring-[#d3b3a8] outline-none resize-none custom-scrollbar"
                        placeholder="Aquí aparecerán los valores extraídos..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interpretación Médica</label>
                      <textarea
                        value={aiResponse}
                        onChange={(e) => setAiResponse(e.target.value)}
                        className="w-full h-80 md:h-[22rem] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 text-sm font-bold leading-relaxed focus:ring-2 focus:ring-[#d3b3a8] outline-none resize-none custom-scrollbar"
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={handleSaveToPatient}
                      disabled={isSaving}
                      className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      CONFIRMAR Y GUARDAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
