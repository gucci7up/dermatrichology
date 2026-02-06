
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DB } from '../services/db';
import { Patient, Session } from '../types';
import { Save, X, Camera, User, Calendar, Stethoscope, ArrowLeft, CheckCircle2 } from 'lucide-react';

const NewConsultation: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId');
    const appointmentId = searchParams.get('appointmentId'); // Optional, if coming from agenda

    const [patient, setPatient] = React.useState<Patient | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    const [sessionData, setSessionData] = React.useState<Partial<Session>>({
        evolucion_clinica: '',
        cambios_densidad: 0,
        respuesta_tratamiento: 'Estable',
        ajustes_terapeuticos: '',
        fotos_comparativas: []
    });

    React.useEffect(() => {
        const loadPatient = async () => {
            if (patientId) {
                try {
                    const p = await DB.patients.getById(patientId);
                    if (p) setPatient(p);
                } catch (error) {
                    console.error("Error loading patient", error);
                }
            }
            setLoading(false);
        };
        loadPatient();
    }, [patientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) return;

        setSaving(true);
        try {
            const newSession: Session = {
                id: crypto.randomUUID(),
                paciente_id: patientId,
                fecha: new Date().toISOString(),
                evolucion_clinica: sessionData.evolucion_clinica || 'Sin evolución registrada',
                fotos_comparativas: sessionData.fotos_comparativas || [],
                cambios_densidad: sessionData.cambios_densidad || 0,
                respuesta_tratamiento: sessionData.respuesta_tratamiento || 'Estable',
                ajustes_terapeuticos: sessionData.ajustes_terapeuticos || 'Mantener tratamiento actual'
            };

            await DB.sessions.save(newSession);

            // If linked to an appointment, we could mark it as completed here
            // (Assuming we add an update method to DB.appointments later)

            navigate(`/patients/${patientId}`);
        } catch (error) {
            console.error("Error saving session", error);
            alert("Error al guardar la consulta.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-500">Cargando paciente...</div>;
    if (!patient) return (
        <div className="p-10 text-center">
            <p className="font-bold text-slate-500">Paciente no seleccionado.</p>
            <button onClick={() => navigate('/consultations')} className="mt-4 text-blue-600 font-bold underline">Volver a Consultas</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                        <ArrowLeft className="w-6 h-6 text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Nueva Consulta</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 font-semibold">Paciente:</span>
                            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                <img src={patient.foto_perfil} className="w-5 h-5 rounded-full object-cover" />
                                <span className="font-bold text-slate-900 text-sm">{patient.nombre_completo}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Columna Izquierda: Datos Clínicos */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-md p-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <h3 className="font-black text-lg text-slate-900">Evolución Clínica</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Descripción de la Evolución</label>
                                    <textarea
                                        required
                                        value={sessionData.evolucion_clinica}
                                        onChange={e => setSessionData({ ...sessionData, evolucion_clinica: e.target.value })}
                                        className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-400"
                                        placeholder="Detalle los cambios observados, síntomas referidos y hallazgos en la exploración física..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Respuesta al Tratamiento</label>
                                        <select
                                            value={sessionData.respuesta_tratamiento}
                                            onChange={e => setSessionData({ ...sessionData, respuesta_tratamiento: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="Excelente">Excelente</option>
                                            <option value="Buena">Buena</option>
                                            <option value="Estable">Estable (Sin cambios)</option>
                                            <option value="Regular">Regular</option>
                                            <option value="Mala">Mala / Empeoramiento</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Variación de Densidad (%)</label>
                                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <input
                                                type="range"
                                                min="-50"
                                                max="50"
                                                step="1"
                                                value={sessionData.cambios_densidad}
                                                onChange={e => setSessionData({ ...sessionData, cambios_densidad: parseInt(e.target.value) })}
                                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <span className={`font-black w-16 text-right ${(sessionData.cambios_densidad || 0) > 0 ? 'text-emerald-600' :
                                                (sessionData.cambios_densidad || 0) < 0 ? 'text-red-500' : 'text-slate-500'
                                                }`}>
                                                {(sessionData.cambios_densidad || 0) > 0 ? '+' : ''}{sessionData.cambios_densidad}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-md p-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <h3 className="font-black text-lg text-slate-900">Plan Terapéutico</h3>
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ajustes / Indicaciones</label>
                                <textarea
                                    value={sessionData.ajustes_terapeuticos}
                                    onChange={e => setSessionData({ ...sessionData, ajustes_terapeuticos: e.target.value })}
                                    className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder-slate-400"
                                    placeholder="Mantener dosis actual, agregar suplementos, programar próxima sesión..."
                                />
                            </div>
                        </section>
                    </div>

                    {/* Columna Derecha: Fotos y Acciones */}
                    <div className="space-y-6">
                        <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <Camera className="w-6 h-6 text-[#d3b3a8]" />
                                <h3 className="font-black text-lg">Registro Fotográfico</h3>
                            </div>
                            <div className="space-y-4">
                                <label className="aspect-square bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-700 hover:border-slate-500 hover:text-white transition-all cursor-pointer">
                                    <Camera className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Añadir Foto</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    const base64 = reader.result as string;
                                                    setSessionData(prev => ({
                                                        ...prev,
                                                        fotos_comparativas: [...(prev.fotos_comparativas || []), base64]
                                                    }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>

                                {/* Preview of selected photos */}
                                {sessionData.fotos_comparativas && sessionData.fotos_comparativas.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {sessionData.fotos_comparativas.map((photo, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-600 group">
                                                <img src={photo} className="w-full h-full object-cover" alt={`Evidencia ${idx}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => setSessionData(prev => ({
                                                        ...prev,
                                                        fotos_comparativas: prev.fotos_comparativas?.filter((_, i) => i !== idx)
                                                    }))}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-xs text-slate-500 text-center font-medium">
                                    {sessionData.fotos_comparativas?.length || 0} fotos seleccionadas
                                </p>
                            </div>
                        </section>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-5 bg-[#d3b3a8] hover:bg-[#c4a499] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#d3b3a8]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {saving ? 'GUARDANDO...' : (
                                <>
                                    <Save className="w-5 h-5" /> GUARDAR CONSULTA
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default NewConsultation;
