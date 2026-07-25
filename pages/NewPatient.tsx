
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DB } from '../services/db';
import { Patient, DermHistory, TrichHistory } from '../types';
import { Save, X, Camera, User, Phone, MapPin, Briefcase, Mail, CreditCard, Calendar, Stethoscope, Scissors, ClipboardList, AlertCircle, Sun } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const NewPatient: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [specialty, setSpecialty] = React.useState<'derm' | 'trich'>('derm');
  const [formData, setFormData] = React.useState<Partial<Patient>>({
    nombre_completo: '',
    fecha_nacimiento: '',
    sexo: 'M',
    telefono: '',
    correo: '',
    direccion: '',
    documento_identidad: '',
    contacto_emergencia: '',
    foto_perfil: `https://picsum.photos/seed/${Math.random()}/200`,
    ocupacion: '',
  });

  const [dermData, setDermData] = React.useState({
    motivo_consulta: '',
    antecedentes_personales_patologicos: '',
    antecedentes_familiares: '',
    alergias: '',
    medicamentos_actuales: '',
    historia_enfermedad: '',
    tipo_piel_fitzpatrick: 3,
    habitos: {
      tabaco: false,
      alcohol: false,
      drogas: false,
      cosmeticos: '',
      exposicion_solar: '',
      otros: ''
    }
  });

  const [trichData, setTrichData] = React.useState({
    motivo_consulta: '',
    inicio_caida: '',
    cantidad_diaria: '',
    patron_caida: '',
    factores_desencadenantes: '',
    enfermedades_hormonales: '',
    estres: '',
    medicamentos: '',
  });

  const handleTrichChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTrichData(prev => ({ ...prev, [name]: value }));
  };

  // Handle prefill from Dashboard
  const location = useLocation();

  React.useEffect(() => {
    // We need to cast location to any or import Location type, but for simplicity let's rely on runtime check
    const state = (location as any).state;
    if (state?.prefill) {
      const { nombre_completo, telefono, correo, motivo, specialty, fecha_nacimiento } = state.prefill;
      setFormData(prev => ({
        ...prev,
        nombre_completo: nombre_completo || '',
        telefono: telefono || '',
        correo: correo || '',
        fecha_nacimiento: fecha_nacimiento || ''
      }));

      if (specialty) {
        setSpecialty(specialty);
      }

      if (specialty === 'derm') {
        setDermData(prev => ({ ...prev, motivo_consulta: motivo || '' }));
      } else {
        setTrichData(prev => ({ ...prev, motivo_consulta: motivo || '' }));
      }
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const patientId = crypto.randomUUID();

    const newPatient: Patient = {
      ...formData as Patient,
      id: patientId,
      created_at: new Date().toISOString()
    };

    try {
      await DB.patients.save(newPatient);

      if (specialty === 'derm') {
        const dermHist: DermHistory = {
          id: crypto.randomUUID(),
          paciente_id: patientId,
          ...dermData,
          diagnosticos: '',
          evolucion_clinica: 'Paciente ingresado con historial dermatológico completo.',
          observaciones: '',
          fecha: new Date().toISOString()
        };
        await DB.derm.save(dermHist);
      } else {
        const trichHist: TrichHistory = {
          id: crypto.randomUUID(),
          paciente_id: patientId,
          motivo_consulta: trichData.motivo_consulta || 'Consulta inicial de tricología',
          antecedentes_familiares: '',
          enfermedades_hormonales: trichData.enfermedades_hormonales,
          deficits_nutricionales: '',
          estres: trichData.estres,
          cirugias: '',
          infecciones: '',
          covid: false,
          medicamentos: trichData.medicamentos,
          inicio_caida: trichData.inicio_caida,
          duracion: '',
          patron_caida: trichData.patron_caida,
          cantidad_diaria: trichData.cantidad_diaria,
          factores_desencadenantes: trichData.factores_desencadenantes,
          progresion: '',
          fecha: new Date().toISOString()
        };
        await DB.trich.save(trichHist);
      }

      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error("Error saving patient:", error);
      notify("Error al guardar el paciente. Por favor intente nuevamente.", 'error');
    }
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDermChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('habitos.')) {
      const habitKey = name.split('.')[1];
      setDermData(prev => ({
        ...prev,
        habitos: { ...prev.habitos, [habitKey]: value }
      }));
    } else {
      setDermData(prev => ({ ...prev, [name]: value }));
    }
  };

  const SpecialtyCard = ({ type, icon: Icon, title, desc }: any) => {
    const isActive = specialty === type;
    return (
      <div
        onClick={() => setSpecialty(type)}
        className={`cursor-pointer flex-1 p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-3 ${isActive
          ? 'border-[#C15F3C] bg-[#C15F3C]/5 ring-4 ring-[#C15F3C]/10 shadow-lg'
          : 'border-sand-300 bg-white hover:border-[#C15F3C]/40 hover:bg-sand-50'
          }`}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-[#C15F3C] text-white shadow-lg' : 'bg-sand-200 text-sand-500'
          }`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h4 className={`font-bold text-lg ${isActive ? 'text-sand-900' : 'text-sand-800'}`}>{title}</h4>
          <p className="text-xs text-sand-500 mt-1 font-medium">{desc}</p>
        </div>
      </div>
    );
  };

  const inputClasses = "w-full px-5 py-3 bg-white border border-sand-400 rounded-xl focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none transition-all placeholder-sand-400 text-sand-900 shadow-sm";
  const labelClasses = "text-[11px] font-black text-sand-600 uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-sand-900">Registrar Nuevo Paciente</h1>
          <p className="text-sand-600 font-semibold">Inicia un expediente clínico detallado y estructurado.</p>
        </div>
        <button onClick={() => navigate(-1)} aria-label="Cerrar" className="p-3 bg-white hover:bg-sand-100 rounded-full transition-all border border-sand-300 shadow-md">
          <X className="w-6 h-6 text-sand-600" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Paso 1: Especialidad */}
        <section className="bg-white rounded-3xl border border-sand-300 shadow-md p-8">
          <div className="flex items-center gap-2 mb-8 bg-sand-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-sand-200">
            <ClipboardList className="w-6 h-6 text-[#C15F3C]" />
            <h3 className="font-black text-xl text-sand-900">Tipo de Consulta</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            <SpecialtyCard type="derm" icon={Stethoscope} title="Dermatología" desc="Enfermedades de la piel, uñas y estética." />
            <SpecialtyCard type="trich" icon={Scissors} title="Tricología" desc="Diagnóstico capilar y caída del cabello." />
          </div>
        </section>

        {/* Paso 2: Datos del Paciente */}
        <section className="bg-white rounded-3xl border border-sand-300 shadow-md p-8 space-y-8">
          <div className="flex items-center gap-2 mb-2 bg-sand-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-sand-200">
            <User className="w-6 h-6 text-[#C15F3C]" />
            <h3 className="font-black text-xl text-sand-900">Información Personal</h3>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <img src={formData.foto_perfil} alt={`Foto de ${formData.nombre_completo || 'nuevo paciente'}`} className="w-32 h-32 rounded-3xl object-cover ring-4 ring-white shadow-xl transition-transform group-hover:scale-105 duration-300 border border-sand-200" />
              <button type="button" aria-label="Cambiar foto" className="absolute -bottom-3 -right-3 p-3 bg-[#C15F3C] text-white rounded-xl shadow-lg hover:bg-[#8C4429] transition-colors ring-4 ring-white">
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className={labelClasses}>Nombre Completo</label>
              <input name="nombre_completo" value={formData.nombre_completo} required onChange={handlePatientChange} className={inputClasses} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Documento ID</label>
              <input name="documento_identidad" value={formData.documento_identidad} required onChange={handlePatientChange} className={inputClasses} placeholder="DNI, Cédula o Pasaporte" />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Fecha de Nacimiento</label>
              <input name="fecha_nacimiento" value={formData.fecha_nacimiento} type="date" required onChange={handlePatientChange} className={inputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Sexo</label>
              <select name="sexo" value={formData.sexo} onChange={handlePatientChange} className={inputClasses}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Teléfono Móvil</label>
              <input name="telefono" value={formData.telefono} required onChange={handlePatientChange} className={inputClasses} />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Correo Electrónico</label>
              <input name="correo" value={formData.correo} type="email" required onChange={handlePatientChange} className={inputClasses} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className={labelClasses}>Dirección de Residencia</label>
              <input name="direccion" value={formData.direccion} required onChange={handlePatientChange} className={inputClasses} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className={labelClasses}>Contacto de Emergencia</label>
              <input name="contacto_emergencia" value={formData.contacto_emergencia} required onChange={handlePatientChange} className={inputClasses} placeholder="Nombre y teléfono del familiar" />
            </div>
          </div>
        </section>

        {/* Paso 3: Historia Clínica */}
        {specialty === 'derm' && (
          <section className="bg-white rounded-3xl border border-sand-300 shadow-md p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-2 bg-sand-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-sand-200">
              <AlertCircle className="w-6 h-6 text-[#C15F3C]" />
              <h3 className="font-black text-xl text-sand-900">Historia Clínica Dermatológica</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className={labelClasses}>Motivo de Consulta</label>
                <textarea name="motivo_consulta" value={dermData.motivo_consulta} required onChange={handleDermChange} className={`${inputClasses} min-h-[120px] py-4`} placeholder="Explique el motivo de la visita..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className={labelClasses}>Antecedentes Personales</label>
                  <textarea name="antecedentes_personales_patologicos" value={dermData.antecedentes_personales_patologicos} onChange={handleDermChange} className={`${inputClasses} min-h-[120px] py-4`} placeholder="Enfermedades previas, cirugías..." />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Antecedentes Familiares</label>
                  <textarea name="antecedentes_familiares" value={dermData.antecedentes_familiares} onChange={handleDermChange} className={`${inputClasses} min-h-[120px] py-4`} placeholder="Enfermedades en la familia..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className={labelClasses}>Alergias</label>
                  <input type="text" name="alergias" value={dermData.alergias} onChange={handleDermChange} className={`${inputClasses} bg-red-50/50 border-red-200 text-red-800 placeholder-red-300`} placeholder="Ej: Penicilina, Níquel..." />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Medicamentos Actuales</label>
                  <input type="text" name="medicamentos_actuales" value={dermData.medicamentos_actuales} onChange={handleDermChange} className={inputClasses} placeholder="Medicamentos que toma actualmente" />
                </div>
              </div>

              <div className="pt-8 border-t border-sand-300">
                <h4 className="text-md font-black text-sand-800 mb-6 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-orange-500" /> Hábitos y Fototipo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-sand-50 p-6 rounded-2xl border border-sand-300 space-y-4 shadow-inner">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={dermData.habitos.tabaco} className="w-5 h-5 rounded-lg border-sand-400 text-[#C15F3C] focus:ring-[#C15F3C] shadow-sm" onChange={(e) => setDermData(prev => ({ ...prev, habitos: { ...prev.habitos, tabaco: e.target.checked } }))} />
                      <span className="text-sm font-black text-sand-700 group-hover:text-sand-900 transition-colors">Tabaquismo</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={dermData.habitos.alcohol} className="w-5 h-5 rounded-lg border-sand-400 text-[#C15F3C] focus:ring-[#C15F3C] shadow-sm" onChange={(e) => setDermData(prev => ({ ...prev, habitos: { ...prev.habitos, alcohol: e.target.checked } }))} />
                      <span className="text-sm font-black text-sand-700 group-hover:text-sand-900 transition-colors">Alcoholismo</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={dermData.habitos.drogas} className="w-5 h-5 rounded-lg border-sand-400 text-[#C15F3C] focus:ring-[#C15F3C] shadow-sm" onChange={(e) => setDermData(prev => ({ ...prev, habitos: { ...prev.habitos, drogas: e.target.checked } }))} />
                      <span className="text-sm font-black text-sand-700 group-hover:text-sand-900 transition-colors">Consumo de Drogas</span>
                    </label>
                  </div>
                  <div className="md:col-span-2 space-y-4 bg-sand-50 p-6 rounded-2xl border border-sand-300 shadow-inner">
                    <label className={labelClasses}>Escala Fitzpatrick (Seleccione)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDermData(prev => ({ ...prev, tipo_piel_fitzpatrick: val }))}
                          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 ${dermData.tipo_piel_fitzpatrick === val
                            ? 'bg-[#C15F3C] text-white border-[#C15F3C] shadow-lg scale-105'
                            : 'bg-white text-sand-500 border-sand-400 hover:border-[#C15F3C] hover:text-[#C15F3C] shadow-sm'
                            }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Exposición Solar</label>
                        <input type="text" name="habitos.exposicion_solar" value={dermData.habitos.exposicion_solar} onChange={handleDermChange} className={inputClasses} placeholder="Ej: Diaria, Ocasional..." />
                      </div>
                      <div>
                        <label className={labelClasses}>Uso de Cosméticos</label>
                        <input type="text" name="habitos.cosmeticos" value={dermData.habitos.cosmeticos} onChange={handleDermChange} className={inputClasses} placeholder="Ej: Cremas, Maquillaje..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {specialty === 'trich' && (
          <section className="bg-white rounded-3xl border border-sand-300 shadow-md p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-2 bg-sand-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-sand-200">
              <Scissors className="w-6 h-6 text-[#C15F3C]" />
              <h3 className="font-black text-xl text-sand-900">Historia Clínica Tricológica</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className={labelClasses}>Motivo de Consulta (Caída, Picazón, Dolor...)</label>
                <textarea name="motivo_consulta" value={trichData.motivo_consulta} onChange={handleTrichChange} className={`${inputClasses} min-h-[120px] py-4`} placeholder="Describa detalladamente el problema de caída, densidad o afección del cuero cabelludo..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className={labelClasses}>Inicio de la Caída</label>
                  <input type="text" name="inicio_caida" value={trichData.inicio_caida} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: Hace 3 meses" />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Cantidad Diaria Aprox.</label>
                  <input type="text" name="cantidad_diaria" value={trichData.cantidad_diaria} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: 50-100 cabellos" />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Patrón de Caída</label>
                  <input type="text" name="patron_caida" value={trichData.patron_caida} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: Difuso, Frontal, Coronilla..." />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Factores Desencadenantes</label>
                  <input type="text" name="factores_desencadenantes" value={trichData.factores_desencadenantes} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: Estrés, Posparto, Dieta..." />
                </div>
              </div>

              <div className="pt-8 border-t border-sand-300">
                <h4 className="text-md font-black text-sand-800 mb-6">Antecedentes Tricológicos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className={labelClasses}>Hormonales / Nutricionales</label>
                    <textarea name="enfermedades_hormonales" value={trichData.enfermedades_hormonales} onChange={handleTrichChange} className={`${inputClasses} min-h-[100px] py-4`} placeholder="SOP, Tiroides, Anemia..." />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClasses}>Estrés / Cirugías / COVID</label>
                    <textarea name="estres" value={trichData.estres} onChange={handleTrichChange} className={`${inputClasses} min-h-[100px] py-4`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClasses}>Medicamentos Actuales</label>
                    <textarea name="medicamentos" value={trichData.medicamentos} onChange={handleTrichChange} className={`${inputClasses} min-h-[100px] py-4`} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button type="submit" className="flex-[2] bg-[#C15F3C] hover:bg-[#8C4429] text-white py-5 rounded-2xl font-black shadow-xl shadow-[#C15F3C]/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] ring-4 ring-white">
            <Save className="w-6 h-6" /> GUARDAR PACIENTE Y GENERAR FICHA
          </button>
          <button type="button" onClick={() => navigate(-1)} className="flex-1 border-2 border-sand-400 py-5 rounded-2xl font-black text-sand-600 bg-white hover:bg-sand-100 transition-all shadow-md">
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPatient;
