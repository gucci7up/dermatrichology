
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { Patient, DermHistory, TrichHistory, Session, LabResult, Treatment, Prescription } from '../types';
import {
  User, Clipboard, Scissors, History, Beaker,
  Plus, ChevronLeft, Printer,
  Sun, AlertCircle, MapPin, FileText, ExternalLink,
  ChevronRight,
  Activity,
  Calendar as CalendarIcon,
  ChevronDown,
  Eye,
  Save,
  Camera
} from 'lucide-react';

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-black text-sm transition-all ${active
      ? 'border-blue-600 text-blue-600 bg-blue-50/50 shadow-[inset_0_-2px_0_0_rgba(37,99,235,1)]'
      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
      }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = React.useState<Patient | null>(null);
  const [activeTab, setActiveTab] = React.useState('info');
  const [expandedLabId, setExpandedLabId] = React.useState<string | null>(null);

  const [dermHist, setDermHist] = React.useState<DermHistory[]>([]);
  const [trichHist, setTrichHist] = React.useState<TrichHistory[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [labs, setLabs] = React.useState<LabResult[]>([]);
  const [treatments, setTreatments] = React.useState<Treatment[]>([]);
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (patient && id) {
          try {
            await DB.patients.update(id, { foto_perfil: base64 });
            setPatient({ ...patient, foto_perfil: base64 });
          } catch (error) {
            console.error("Error updating photo:", error);
            alert("Error al actualizar la foto.");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Derm Form State
  const [dermForm, setDermForm] = React.useState<Partial<DermHistory>>({
    motivo_consulta: '',
    antecedentes_personales_patologicos: '',
    antecedentes_familiares: '',
    alergias: '',
    medicamentos_actuales: '',
    habitos: { tabaco: false, alcohol: false, cosmeticos: '', exposicion_solar: '', otros: '' },
    tipo_piel_fitzpatrick: 1,
    historia_enfermedad: '',
    diagnosticos: '',
    evolucion_clinica: '',
    observaciones: ''
  });

  React.useEffect(() => {
    if (dermHist.length > 0) {
      // Load latest history into form
      setDermForm(dermHist[0]);
    }
  }, [dermHist]);

  const handleDermSave = async () => {
    try {
      if (dermForm.id) {
        await DB.derm.update(dermForm.id, dermForm);
        alert("Historia dermatológica actualizada correctamete.");
      } else {
        const newHistory = { ...dermForm, id: crypto.randomUUID(), paciente_id: id!, fecha: new Date().toISOString() } as DermHistory;
        await DB.derm.save(newHistory);
        alert("Nueva historia dermatológica creada.");
        // Reload
        const updated = await DB.derm.getByPatient(id!);
        setDermHist(updated);
      }
    } catch (e) {
      console.error("Error saving derm history", e);
      alert("Error al guardar.");
    }
  };

  // Trich Form State
  const [trichForm, setTrichForm] = React.useState<Partial<TrichHistory>>({
    motivo_consulta: '',
    antecedentes_familiares: '',
    enfermedades_hormonales: '',
    deficits_nutricionales: '',
    estres: '',
    cirugias: '',
    infecciones: '',
    covid: false,
    medicamentos: '',
    inicio_caida: '',
    duracion: '',
    patron_caida: '',
    cantidad_diaria: '',
    factores_desencadenantes: '',
    progresion: '',
    examen_fisico: { cuero_cabelludo: [], cabello: [], fototipo: 0, patron_alopecia: '' },
    tricoscopia: { zona_evaluada: '', miniaturizacion_pct: 0, vellosos: false, terminales: false, puntos_amarillos: false, puntos_negros: false, signos_inflamacion: false, notas: '' },
    escalas: { ludwig: '', sinclair: '', hamilton: '', savin: '', pull_test: '', wash_test: '' },
    diagnostico_estructurado: { principal: '', secundarios: '', tipo_alopecia: '', fase: '', actividad_inflamatoria: false },
    plan_tratamiento: { topico: '', oral: '', procedimientos: '' }
  });

  React.useEffect(() => {
    if (trichHist.length > 0) {
      setTrichForm(trichHist[0]);
    }
  }, [trichHist]);

  const handleTrichSave = async () => {
    try {
      if (trichForm.id) {
        await DB.trich.update(trichForm.id, trichForm);
        alert("Historia tricológica actualizada.");
      } else {
        const newHistory = { ...trichForm, id: crypto.randomUUID(), paciente_id: id!, fecha: new Date().toISOString() } as TrichHistory;
        await DB.trich.save(newHistory);
        alert("Nueva historia tricológica creada.");
        const updated = await DB.trich.getByPatient(id!);
        setTrichHist(updated);
      }
    } catch (e) {
      console.error("Error saving trich history", e);
      alert("Error al guardar.");
    }
  };

  React.useEffect(() => {
    const fetchPatientData = async () => {
      if (id) {
        try {
          const p = await DB.patients.getById(id);
          if (p) {
            setPatient(p);

            // Parallel fetch for sub-resources
            const [dh, th, sess, lb, tx, pres] = await Promise.all([
              DB.derm.getByPatient(id),
              DB.trich.getByPatient(id),
              DB.sessions.getByPatient(id),
              DB.labs.getByPatient(id),
              DB.treatments.getByPatient(id),
              DB.prescriptions.getByPatient(id)
            ]);

            setDermHist(dh);
            setTrichHist(th);
            setSessions(sess);
            setLabs(lb.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
            setTreatments(tx);
            setPrescriptions(pres);
          }
        } catch (error) {
          console.error("Error fetching patient details:", error);
        }
      }
    };
    fetchPatientData();
  }, [id]);

  if (!patient) return <div className="p-10 text-center font-bold text-slate-500">Paciente no encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/patients" className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-300">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900 leading-tight">{patient.nombre_completo}</h1>
          <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">Expediente ID: {patient.documento_identidad}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/consultations/new?patientId=${id}`)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#d3b3a8] border-2 border-[#d3b3a8] rounded-2xl text-white font-black text-sm hover:bg-[#c4a499] hover:border-[#c4a499] shadow-md transition-all active:scale-95"
          >
            <History className="w-4 h-4" /> NUEVA EVOLUCIÓN
          </button>
          <button
            onClick={() => navigate(`/patients/${id}/prescription`)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-400 rounded-2xl text-slate-700 font-black text-sm hover:bg-slate-50 shadow-md transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" /> RECETA
          </button>
          <button
            onClick={() => navigate(`/patients/${id}/print`)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-400 rounded-2xl text-slate-700 font-black text-sm hover:bg-slate-50 shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> IMPRIMIR
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handlePhotoChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-10">
        {/* Perfil Lateral */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-300 p-8 shadow-md">
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className="relative group mb-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Cambiar foto de perfil"
              >
                <img src={patient.foto_perfil} className="w-32 h-32 rounded-3xl object-cover ring-4 ring-slate-200 shadow-xl group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-3xl">
                  <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              <h2 className="font-black text-xl text-slate-900 leading-tight">{patient.nombre_completo}</h2>
              <p className="text-blue-600 text-[10px] font-black uppercase mt-1 tracking-widest">{patient.ocupacion}</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Nacimiento</p>
                <p className="text-sm font-bold text-slate-800">{patient.fecha_nacimiento}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Teléfono</p>
                <p className="text-sm font-bold text-slate-800">{patient.telefono}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Email</p>
                <p className="text-sm font-bold text-slate-800 truncate">{patient.correo}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de Contenido */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-300 shadow-md overflow-hidden min-h-[600px]">
            <div className="flex border-b border-slate-300 overflow-x-auto scrollbar-hide bg-slate-50/50">
              <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={User} label="Perfil" />
              <TabButton active={activeTab === 'derm'} onClick={() => setActiveTab('derm')} icon={Clipboard} label="Dermatología" />
              <TabButton active={activeTab === 'trich'} onClick={() => setActiveTab('trich')} icon={Scissors} label="Tricología" />
              <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={History} label="Evolución" />
              <TabButton active={activeTab === 'labs'} onClick={() => setActiveTab('labs')} icon={Beaker} label="Laboratorios" />
              <TabButton active={activeTab === 'recetas'} onClick={() => setActiveTab('recetas')} icon={FileText} label="Recetas" />
            </div>

            <div className="p-8">
              {activeTab === 'info' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-300 shadow-inner">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" /> Residencia
                      </h4>
                      <p className="text-slate-900 font-bold text-lg">{patient.direccion}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-300 shadow-inner">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" /> Emergencia
                      </h4>
                      <p className="text-slate-900 font-bold text-lg">{patient.contacto_emergencia}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'derm' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black text-slate-900">Ficha Dermatológica</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDermSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> GUARDAR FICHA
                      </button>
                    </div>
                  </div>

                  {/* Patient Data Header (Read-Only as requested context) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Datos del Paciente</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Nombre</p>
                        <p className="font-bold text-slate-800">{patient.nombre_completo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Edad / Nacimiento</p>
                        <p className="font-bold text-slate-800">{patient.fecha_nacimiento}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Sexo</p>
                        <p className="font-bold text-slate-800">{patient.sexo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p>
                        <p className="font-bold text-slate-800">{patient.telefono}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Dirección</p>
                        <p className="font-bold text-slate-800">{patient.direccion}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                        <p className="font-bold text-slate-800 truncate" title={patient.correo}>{patient.correo}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Form */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">

                    {/* Section 1: Anamnesis */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clipboard className="w-5 h-5" /></div>
                        <h4 className="font-black text-lg text-slate-800">Anamnesis General</h4>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Motivo de Consulta</label>
                          <textarea
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none h-24"
                            placeholder="Describe el motivo principal..."
                            value={dermForm.motivo_consulta || ''}
                            onChange={e => setDermForm({ ...dermForm, motivo_consulta: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Historia de la Enfermedad Actual</label>
                          <textarea
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none h-32"
                            placeholder="Detalle cronológico y sintomatología..."
                            value={dermForm.historia_enfermedad || ''}
                            onChange={e => setDermForm({ ...dermForm, historia_enfermedad: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Antecedentes Patológicos Personales</label>
                          <textarea
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none h-24"
                            value={dermForm.antecedentes_personales_patologicos || ''}
                            onChange={e => setDermForm({ ...dermForm, antecedentes_personales_patologicos: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Antecedentes Familiares</label>
                          <textarea
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none h-24"
                            value={dermForm.antecedentes_familiares || ''}
                            onChange={e => setDermForm({ ...dermForm, antecedentes_familiares: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-red-500" /> Alergias
                          </label>
                          <input
                            type="text"
                            className="w-full p-4 bg-red-50/50 border-0 rounded-2xl font-medium text-red-800 placeholder-red-300 focus:ring-2 focus:ring-red-200"
                            placeholder="Nod, Penicilina..."
                            value={dermForm.alergias || ''}
                            onChange={e => setDermForm({ ...dermForm, alergias: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Medicamentos Actuales</label>
                          <input
                            type="text"
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                            value={dermForm.medicamentos_actuales || ''}
                            onChange={e => setDermForm({ ...dermForm, medicamentos_actuales: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 2: Habits & Type */}
                    <div className="space-y-6">
                      <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <Sun className="w-5 h-5 text-orange-500" /> Perfil y Hábitos
                      </h4>

                      <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
                        <label className="block text-[11px] font-black text-orange-800 uppercase tracking-widest mb-4">Fototipo de Fitzpatrick</label>
                        <div className="flex gap-4 flex-wrap">
                          {[1, 2, 3, 4, 5, 6].map(num => (
                            <button
                              key={num}
                              onClick={() => setDermForm({ ...dermForm, tipo_piel_fitzpatrick: num })}
                              className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center transition-all ${dermForm.tipo_piel_fitzpatrick === num
                                ? 'bg-orange-500 text-white shadow-lg scale-110'
                                : 'bg-white text-orange-300 border border-orange-200 hover:border-orange-500'
                                }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={dermForm.habitos?.tabaco || false}
                              onChange={e => setDermForm({ ...dermForm, habitos: { ...dermForm.habitos!, tabaco: e.target.checked } })}
                              className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700">Consumo de Tabaco</span>
                          </label>
                          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={dermForm.habitos?.alcohol || false}
                              onChange={e => setDermForm({ ...dermForm, habitos: { ...dermForm.habitos!, alcohol: e.target.checked } })}
                              className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700">Consumo de Alcohol</span>
                          </label>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exposición Solar</label>
                            <input
                              type="text"
                              className="w-full mt-1 p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 border border-transparent"
                              placeholder="Ej: Diaria, Ocasional..."
                              value={dermForm.habitos?.exposicion_solar || ''}
                              onChange={e => setDermForm({ ...dermForm, habitos: { ...dermForm.habitos!, exposicion_solar: e.target.value } })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Uso de Cosméticos</label>
                            <input
                              type="text"
                              className="w-full mt-1 p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 border border-transparent"
                              placeholder="Ej: Cremas, Maquillaje..."
                              value={dermForm.habitos?.cosmeticos || ''}
                              onChange={e => setDermForm({ ...dermForm, habitos: { ...dermForm.habitos!, cosmeticos: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 3: Diagnosis & Evolution */}
                    <div className="space-y-6">
                      <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" /> Diagnóstico y Evolución
                      </h4>

                      <div>
                        <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-2">Diagnósticos Dermatológicos</label>
                        <textarea
                          className="w-full p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 resize-none h-24"
                          placeholder="Diagnósticos principales..."
                          value={dermForm.diagnosticos || ''}
                          onChange={e => setDermForm({ ...dermForm, diagnosticos: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Evolución Clínica</label>
                        <textarea
                          className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none h-32"
                          placeholder="Evolución del cuadro clínico..."
                          value={dermForm.evolucion_clinica || ''}
                          onChange={e => setDermForm({ ...dermForm, evolucion_clinica: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Observaciones Médicas</label>
                        <textarea
                          className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none h-24"
                          placeholder="Notas adicionales..."
                          value={dermForm.observaciones || ''}
                          onChange={e => setDermForm({ ...dermForm, observaciones: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trich' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black text-slate-900">Consulta de Tricología</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleTrichSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> GUARDAR FICHA
                      </button>
                    </div>
                  </div>

                  {/* Patient Data Header (Same as Derm) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Datos del Paciente</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Nombre</p><p className="font-bold text-slate-800">{patient.nombre_completo}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Ocupación</p><p className="font-bold text-slate-800">{patient.ocupacion}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Edad</p><p className="font-bold text-slate-800">{patient.fecha_nacimiento}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p><p className="font-bold text-slate-800">{patient.telefono}</p></div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-10">

                    {/* 1. Motivo de Consulta & Historia Capilar */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Scissors className="w-5 h-5" /></div>
                        <h4 className="font-black text-lg text-slate-800">Historia Capilar</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Motivo de Consulta (Caída, Picazón, Dolor...)</label>
                          <textarea
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 resize-none h-20"
                            value={trichForm.motivo_consulta || ''}
                            onChange={e => setTrichForm({ ...trichForm, motivo_consulta: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Inicio de la Caída</label>
                          <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={trichForm.inicio_caida || ''} onChange={e => setTrichForm({ ...trichForm, inicio_caida: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Cantidad Diaria Aprox.</label>
                          <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={trichForm.cantidad_diaria || ''} onChange={e => setTrichForm({ ...trichForm, cantidad_diaria: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Patrón de Caída</label>
                          <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={trichForm.patron_caida || ''} onChange={e => setTrichForm({ ...trichForm, patron_caida: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Factores Desencadenantes</label>
                          <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={trichForm.factores_desencadenantes || ''} onChange={e => setTrichForm({ ...trichForm, factores_desencadenantes: e.target.value })} />
                        </div>
                      </div>
                    </section>

                    <hr className="border-slate-100" />

                    {/* 2. Antecedentes Específicos */}
                    <section className="space-y-6">
                      <h4 className="font-black text-lg text-slate-800">Antecedentes Tricológicos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Hormonales / Nutricionales</label>
                          <textarea className="w-full p-3 bg-slate-50 rounded-xl font-medium h-24 resize-none" placeholder="SOP, Tiroides, Anemia..." value={trichForm.enfermedades_hormonales || ''} onChange={e => setTrichForm({ ...trichForm, enfermedades_hormonales: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Estrés / Cirugías / COVID</label>
                          <textarea className="w-full p-3 bg-slate-50 rounded-xl font-medium h-24 resize-none" value={trichForm.estres || ''} onChange={e => setTrichForm({ ...trichForm, estres: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Medicamentos Actuales</label>
                          <textarea className="w-full p-3 bg-slate-50 rounded-xl font-medium h-24 resize-none" value={trichForm.medicamentos || ''} onChange={e => setTrichForm({ ...trichForm, medicamentos: e.target.value })} />
                        </div>
                      </div>
                    </section>

                    <hr className="border-slate-100" />

                    {/* 3. Examen Físico & Escalas */}
                    <section className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200 space-y-6">
                      <h4 className="font-black text-lg text-slate-800 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" /> Examen Físico y Escalas</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Cuero Cabelludo (Signos)</label>
                          <div className="flex flex-wrap gap-2">
                            {['Eritema', 'Descamación', 'Seborrea', 'Pústulas', 'Costras', 'Cicatrices'].map(sign => (
                              <button
                                key={sign}
                                onClick={() => {
                                  const current = trichForm.examen_fisico?.cuero_cabelludo || [];
                                  const updated = current.includes(sign) ? current.filter(x => x !== sign) : [...current, sign];
                                  setTrichForm({ ...trichForm, examen_fisico: { ...trichForm.examen_fisico!, cuero_cabelludo: updated } });
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${trichForm.examen_fisico?.cuero_cabelludo?.includes(sign)
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white border border-slate-300 text-slate-500 hover:border-blue-400'
                                  }`}
                              >
                                {sign}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Escalas Clínicas</label>
                          <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Norwood/Ludwig" className="p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold" value={trichForm.escalas?.ludwig || ''} onChange={e => setTrichForm({ ...trichForm, escalas: { ...trichForm.escalas!, ludwig: e.target.value } })} />
                            <input placeholder="Pull Test (+/-)" className="p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold" value={trichForm.escalas?.pull_test || ''} onChange={e => setTrichForm({ ...trichForm, escalas: { ...trichForm.escalas!, pull_test: e.target.value } })} />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 4. Tricoscopía */}
                    <section className="bg-slate-900 text-slate-300 p-8 rounded-[2rem] shadow-xl space-y-6">
                      <h4 className="font-black text-xl text-white flex items-center gap-2"><Activity className="w-6 h-6 text-purple-400" /> Tricoscopía Digital</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Hallazgos y Notas</label>
                          <textarea
                            className="w-full mt-2 p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-medium focus:border-purple-500 outline-none h-24"
                            placeholder="Puntos amarillos, miniaturización, vasos..."
                            value={trichForm.tricoscopia?.notas || ''}
                            onChange={e => setTrichForm({ ...trichForm, tricoscopia: { ...trichForm.tricoscopia!, notas: e.target.value } })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">% Miniaturización</label>
                          <input type="number" className="w-full mt-2 p-3 bg-slate-800 border_slate-700 rounded-xl text-white font-bold" value={trichForm.tricoscopia?.miniaturizacion_pct || 0} onChange={e => setTrichForm({ ...trichForm, tricoscopia: { ...trichForm.tricoscopia!, miniaturizacion_pct: parseInt(e.target.value) } })} />
                        </div>
                        <div className="flex flex-col gap-2 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={trichForm.tricoscopia?.signos_inflamacion || false} onChange={e => setTrichForm({ ...trichForm, tricoscopia: { ...trichForm.tricoscopia!, signos_inflamacion: e.target.checked } })} className="w-4 h-4 accent-purple-500" /> Signos Inflamatorios
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={trichForm.tricoscopia?.puntos_amarillos || false} onChange={e => setTrichForm({ ...trichForm, tricoscopia: { ...trichForm.tricoscopia!, puntos_amarillos: e.target.checked } })} className="w-4 h-4 accent-purple-500" /> Puntos Amarillos
                          </label>
                        </div>
                      </div>
                    </section>

                    {/* 5. Diagnóstico y Plan */}
                    <section className="space-y-8">
                      <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                        <h4 className="font-black text-lg text-emerald-800 mb-4">Diagnóstico Estructurado</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <input placeholder="Diagnóstico Principal" className="w-full p-4 bg-white border border-emerald-200 rounded-xl font-black text-slate-800" value={trichForm.diagnostico_estructurado?.principal || ''} onChange={e => setTrichForm({ ...trichForm, diagnostico_estructurado: { ...trichForm.diagnostico_estructurado!, principal: e.target.value } })} />
                          <input placeholder="Tipo de Alopecia (Androgenética, Areata...)" className="w-full p-4 bg-white border border-emerald-200 rounded-xl font-bold text-slate-700" value={trichForm.diagnostico_estructurado?.tipo_alopecia || ''} onChange={e => setTrichForm({ ...trichForm, diagnostico_estructurado: { ...trichForm.diagnostico_estructurado!, tipo_alopecia: e.target.value } })} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-black text-lg text-slate-800">Plan Terapéutico</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <textarea className="p-4 bg-slate-50 rounded-2xl h-32 resize-none font-medium" placeholder="Tratamiento Tópico (Minoxidil...)" value={trichForm.plan_tratamiento?.topico || ''} onChange={e => setTrichForm({ ...trichForm, plan_tratamiento: { ...trichForm.plan_tratamiento!, topico: e.target.value } })} />
                          <textarea className="p-4 bg-slate-50 rounded-2xl h-32 resize-none font-medium" placeholder="Tratamiento Oral (Suplementos...)" value={trichForm.plan_tratamiento?.oral || ''} onChange={e => setTrichForm({ ...trichForm, plan_tratamiento: { ...trichForm.plan_tratamiento!, oral: e.target.value } })} />
                          <textarea className="p-4 bg-slate-50 rounded-2xl h-32 resize-none font-medium" placeholder="Procedimientos (PRP, Mesoterapia...)" value={trichForm.plan_tratamiento?.procedimientos || ''} onChange={e => setTrichForm({ ...trichForm, plan_tratamiento: { ...trichForm.plan_tratamiento!, procedimientos: e.target.value } })} />
                        </div>
                      </div>
                    </section>

                  </div>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div className="space-y-8 animate-in fade-in">
                  <h3 className="text-2xl font-black text-slate-900">Seguimiento Evolutivo</h3>
                  {sessions.length > 0 ? (
                    <div className="space-y-8">
                      {sessions.map(s => (
                        <div key={s.id} className="relative pl-8 border-l-2 border-blue-200 pb-10 last:pb-0">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-50 shadow-md"></div>
                          <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-6 shadow-md hover:border-blue-400 transition-all">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-black text-slate-900">{new Date(s.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.cambios_densidad >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                Variación: {s.cambios_densidad}%
                              </span>
                            </div>
                            <p className="text-slate-700 font-bold mb-4">{s.evolucion_clinica}</p>

                            {/* Evolution Photos */}
                            {s.fotos_comparativas && s.fotos_comparativas.length > 0 && (
                              <div className="mb-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Evidencia Fotográfica</p>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                  {s.fotos_comparativas.map((foto, idx) => (
                                    <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm group cursor-pointer hover:scale-105 transition-transform">
                                      <img src={foto} alt={`Evolución ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                              <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Ajuste Terapéutico</p>
                              <p className="text-sm font-black text-slate-800">{s.ajustes_terapeuticos}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="font-black text-slate-400 uppercase tracking-widest">Sin sesiones de seguimiento.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'labs' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">Historial Analítico Integral</h3>
                      <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Dermatología y Tricología</p>
                    </div>
                    <Link to="/analytics" className="text-xs font-black text-blue-600 bg-white px-6 py-3 rounded-2xl border-2 border-blue-100 flex items-center gap-2 hover:border-blue-600 hover:shadow-lg transition-all active:scale-95 group">
                      <Beaker className="w-4 h-4 group-hover:scale-110 transition-transform" /> CARGAR ANALÍTICA IA
                    </Link>
                  </div>

                  {labs.length > 0 ? (
                    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 animate-in slide-in-from-bottom-2">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b border-slate-200">
                          <tr>
                            <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center w-32 ml-4">Fecha</th>
                            <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Análisis</th>
                            <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Resultados / Archivo</th>
                            <th className="px-8 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {labs.map(lab => (
                            <React.Fragment key={lab.id}>
                              <tr className={`hover:bg-slate-50 transition-all duration-300 group ${expandedLabId === lab.id ? 'bg-slate-50' : ''}`}>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 w-fit">
                                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-black text-slate-700">{new Date(lab.fecha).toLocaleDateString()}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-sm font-bold text-slate-900">{lab.analisis}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                      <FileText className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 italic max-w-[200px] truncate">{lab.resultados}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <button
                                    onClick={() => setExpandedLabId(expandedLabId === lab.id ? null : lab.id)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 ${expandedLabId === lab.id
                                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                                      : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600'
                                      }`}
                                  >
                                    {expandedLabId === lab.id ? (
                                      <>
                                        <Eye className="w-3.5 h-3.5" /> Ocultar
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-3.5 h-3.5" /> Ver Detalles
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                              {expandedLabId === lab.id && (
                                <tr className="animate-in fade-in slide-in-from-top-2 duration-300">
                                  <td colSpan={4} className="p-0">
                                    <div className="mx-4 mb-4 rounded-[2rem] bg-white border-2 border-slate-100 p-8 shadow-inner grid grid-cols-1 lg:grid-cols-2 gap-12 relative overflow-hidden">
                                      {/* Decorative Background */}
                                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -z-0 translate-x-1/3 -translate-y-1/3"></div>

                                      <div className="space-y-4 relative z-10">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenido del Análisis</h4>
                                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-sm min-h-[150px]">
                                          <p className="text-sm font-bold text-slate-700 italic leading-relaxed">
                                            "{lab.resultados}"
                                          </p>
                                        </div>
                                      </div>

                                      <div className="space-y-4 relative z-10">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 ml-1">
                                          <Activity className="w-4 h-4" /> Informe Médico (Inteligencia Artificial)
                                        </h4>
                                        <div className="p-8 bg-white rounded-[2rem] border-2 border-blue-100 shadow-xl shadow-blue-100/50 relative group hover:border-blue-200 transition-colors">
                                          <div className="absolute left-0 top-8 w-1 h-12 bg-blue-600 rounded-r-full"></div>
                                          <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                                            {lab.interpretacion}
                                          </p>
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
                    <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 group hover:border-blue-200 transition-colors">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                        <Beaker className="w-10 h-10 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Sin Historial Analítico</h3>
                      <p className="text-sm text-slate-400 font-bold max-w-md mx-auto">
                        Carga y analiza resultados de laboratorio con IA en el módulo de Análisis para visualizar la interpretación clínica aquí.
                      </p>
                      <Link to="/analytics" className="inline-flex items-center gap-3 mt-8 bg-[#d3b3a8] text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-[#c4a499] transition-all shadow-xl shadow-[#d3b3a8]/20 active:scale-95">
                        <Plus className="w-4 h-4" /> NUEVA ANALÍTICA CON IA
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recetas' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-900">Historial de Recetas</h3>
                  </div>
                  {prescriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {prescriptions.map(p => (
                        <div key={p.id} className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText className="w-24 h-24 -rotate-12" />
                          </div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Emisión</p>
                                <p className="text-lg font-bold text-slate-800">{new Date(p.fecha).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 h-32 overflow-y-auto">
                              <p className="text-sm font-medium text-slate-600 font-['Caveat'] text-xl leading-relaxed whitespace-pre-line">"{p.contenido}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="font-black text-slate-400 uppercase tracking-widest">No hay recetas guardadas.</p>
                      <p className="text-xs text-slate-400 mt-2">Crea una nueva receta desde el botón superior.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
