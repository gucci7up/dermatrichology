import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { Patient, AppSettings } from '../types';
import { ChevronLeft, Printer, Save, Upload } from 'lucide-react';

const Prescription: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = React.useState<Patient | null>(null);
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [prescriptionText, setPrescriptionText] = React.useState('');
    const [templateUrl, setTemplateUrl] = React.useState<string | null>(localStorage.getItem('prescription_template'));

    React.useEffect(() => {
        const fetchData = async () => {
            if (id) {
                const p = await DB.patients.getById(id);
                setPatient(p || null);
            }
            const s = await DB.settings.get();
            setSettings(s);
        };
        fetchData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setTemplateUrl(base64);
                localStorage.setItem('prescription_template', base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!prescriptionText.trim()) return;

        try {
            await DB.prescriptions.save({
                paciente_id: id!,
                contenido: prescriptionText,
                fecha: new Date().toISOString()
            });
            alert("Receta guardada en el historial del paciente.");
        } catch (error) {
            console.error("Error saving prescription:", error);
            alert("Error al guardar la receta.");
        }
    };

    if (!patient) return <div className="p-10 font-bold text-center">Cargando paciente...</div>;

    const currentDate = new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white flex flex-col items-center">
            {/* Toolbar - Hidden when printing */}
            <div className="w-full max-w-[210mm] flex items-center justify-between mb-8 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold"
                >
                    <ChevronLeft className="w-5 h-5" /> Volver
                </button>

                <div className="flex gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold cursor-pointer hover:bg-slate-50 text-sm shadow-sm">
                        <Upload className="w-4 h-4" />
                        Subir Plantilla (Imagen)
                        <input type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} />
                    </label>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/30"
                    >
                        <Save className="w-4 h-4" /> Guardar
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                    >
                        <Printer className="w-4 h-4" /> Imprimir
                    </button>
                </div>
            </div>

            {/* Landscape A4 Page Container */}
            <div className="bg-white shadow-2xl print:shadow-none w-[297mm] h-[210mm] relative overflow-hidden print:w-full print:h-screen print:absolute print:top-0 print:left-0">
                <style>
                    {`@media print { @page { size: landscape; margin: 0; } body { -webkit-print-color-adjust: exact; } }`}
                </style>

                {/* Background Template */}
                {templateUrl ? (
                    <img
                        src={templateUrl}
                        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-100"
                        alt="Background Template"
                    />
                ) : (
                    <div className="absolute inset-0 z-0 flex items-center justify-center border-8 border-double border-slate-100 m-8">
                        <p className="text-slate-300 font-black text-4xl uppercase -rotate-12">Plantilla Horizontal (Cárgala)</p>
                    </div>
                )}

                {/* Content Overlay */}
                <div className="relative z-10 w-full h-full">

                    {/* Main Writing Area - Adjusted to clear logo and fill page width */}
                    <div className="absolute top-[60mm] left-[25mm] right-[25mm] bottom-[50mm]">
                        <textarea
                            className="w-full h-full bg-transparent resize-none border-none focus:ring-0 font-['Caveat'] text-2xl leading-loose text-slate-800 placeholder-slate-300/50 outline-none p-4"
                            placeholder="Escribe la receta aquí..."
                            value={prescriptionText}
                            onChange={(e) => setPrescriptionText(e.target.value)}
                            spellCheck={false}
                        />
                    </div>

                    {/* Footer Fields - Adjusted for Landscape Bottom */}

                    {/* Paciente Name - Bottom Left */}
                    <div className="absolute bottom-[28mm] left-[45mm] font-['Caveat'] text-xl text-slate-900 font-bold whitespace-nowrap">
                        {patient.nombre_completo}
                    </div>

                    {/* Date - Bottom Left (Below Patient, shifted left to avoid signature) */}
                    <div className="absolute bottom-[14mm] left-[25mm] font-['Caveat'] text-xl text-slate-900 font-bold whitespace-nowrap">
                        {currentDate}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Prescription;
