
import React from 'react';
import { DB } from '../services/db';
import { AppointmentRequest, AppSettings } from '../types';
import {
  Calendar,
  Stethoscope,
  Scissors,
  User,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  ShieldCheck,
  Star,
  Sparkles,
  Zap,
  Droplets,
  Heart,
  Baby,
  Activity,
  UserCheck,
  Gem
} from 'lucide-react';

const Landing: React.FC = () => {
  const [settings, setSettings] = React.useState<AppSettings>({
    app_name: 'DermaTrich',
    logo_url: '',
    logo_width: 220,
    logo_height: 100,
    doctor_name: 'Cargando...',
    doctor_profession: '...',
    doctor_photo_url: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await DB.settings.get();
        setSettings(s);
      } catch (e) {
        console.error(e);
      }
    };
    loadSettings();
  }, []);

  const [formData, setFormData] = React.useState<Partial<AppointmentRequest>>({
    paciente_nombre: '',
    paciente_telefono: '',
    paciente_correo: '',
    especialidad: 'derm',
    fecha_preferida: '',
    hora_preferida: '09:00',
    motivo: '',
  });

  const services = [
    { name: "Consulta niños y adultos (piel, pelo, uñas)", icon: Baby },
    { name: "Cirugía menor", icon: Activity },
    { name: "Rejuvenecimiento de cuello", icon: Sparkles },
    { name: "Depilación láser", icon: Zap },
    { name: "Eliminación de verrugas", icon: ShieldCheck },
    { name: "Toxina Botulinica (Botox)", icon: Gem },
    { name: "Exosomas", icon: Droplets },
    { name: "Evaluación capilar", icon: Scissors },
    { name: "Peeling químico (manchas, acné, ojeras)", icon: Sparkles },
    { name: "Microdermoabrasión", icon: UserCheck },
    { name: "Hidratación profunda", icon: Droplets },
    { name: "Alta frecuencia", icon: Zap },
    { name: "Micropunción / Microneedling", icon: Activity },
    { name: "Hiperhidrosis Axilar", icon: Droplets },
    { name: "Acido Hialuronico", icon: Gem },
    { name: "Tratamiento de estrías y celulitis", icon: Heart },
    { name: "Reparación de lóbulo rasgado", icon: Heart },
    { name: "Eliminación de papada", icon: UserCheck },
    { name: "Mesoterapia (manchas, acné, arrugas)", icon: Droplets },
    { name: "Escleroterapia (varices)", icon: Activity },
    { name: "Plasma rico en plaquetas", icon: Droplets },
    { name: "Blanqueamiento íntimo", icon: Sparkles },
    { name: "Hollywood peel", icon: Star },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newRequest: AppointmentRequest = {
        ...formData as AppointmentRequest,
        id: crypto.randomUUID(),
        estado: 'pendiente',
        created_at: new Date().toISOString()
      };

      await DB.appointments.save(newRequest);

      // Reset form
      setFormData({
        paciente_nombre: '',
        paciente_telefono: '',
        paciente_correo: '',
        especialidad: 'derm',
        fecha_preferida: '',
        hora_preferida: '09:00',
        motivo: '',
      });

      setShowSuccess(true);
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert("Error al enviar la solicitud. Por favor intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToBooking = () => {
    document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">¡Solicitud Enviada!</h2>
          <p className="text-slate-600 font-medium mb-8">Gracias por confiar en nosotros. Nos pondremos en contacto contigo en breve para confirmar tu horario.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#d3b3a8]/30 pb-20 scroll-smooth">
      {/* Header Fijo */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-center md:justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                style={{
                  width: 'auto',
                  height: settings.logo_height * 0.7,
                  maxWidth: settings.logo_width * 0.9,
                  objectFit: 'contain'
                }}
                alt="Logo"
              />
            ) : (
              <>
                <div className="w-12 h-12 bg-[#d3b3a8] rounded-xl flex items-center justify-center text-white font-black text-2xl">{settings.app_name?.[0] || 'D'}</div>
                <span className="font-black text-2xl tracking-tighter">{settings.app_name || 'DermaTrich'}</span>
              </>
            )}
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-slate-500">
            <a href="#servicios" className="hover:text-slate-900 transition-colors">Servicios</a>
            <button
              onClick={scrollToBooking}
              className="bg-slate-900 text-white px-8 py-3 rounded-full hover:scale-105 transition-all shadow-lg active:scale-95"
            >
              CITAS
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-48 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#d3b3a8]/10 text-[#d3b3a8] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <Star className="w-3 h-3" /> Excelencia Médica en cada consulta
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter mb-8">
            Tu piel y cabello en <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d3b3a8] to-slate-400">manos expertas.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Especialistas en diagnósticos precisos de Dermatología y Tricología avanzada. Tecnología de vanguardia para tu salud integral.
          </p>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter">Nuestros Servicios</h2>
            <div className="w-24 h-2 bg-[#d3b3a8] mx-auto rounded-full mb-6"></div>
            <p className="text-slate-500 font-bold max-w-xl mx-auto uppercase text-[11px] tracking-[0.2em]">Cuidado integral de piel, pelo y uñas con tecnología de vanguardia</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, idx) => (
              <div key={idx} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-[#d3b3a8]/30 hover:bg-white hover:shadow-xl transition-all group flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#d3b3a8] mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[#d3b3a8] group-hover:text-white transition-all duration-300">
                  <service.icon className="w-7 h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-sm leading-tight uppercase tracking-tight">{service.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="agendar" className="py-24 px-6 relative overflow-hidden bg-slate-50">
        <div className="max-w-2xl mx-auto bg-white rounded-[3.5rem] shadow-2xl p-8 md:p-14 border border-slate-200 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-3 text-slate-900">Agenda tu Consulta</h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Completa los datos para reservar tu espacio</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, especialidad: 'derm' })}
                className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${formData.especialidad === 'derm' ? 'border-[#d3b3a8] bg-[#d3b3a8]/5 ring-4 ring-[#d3b3a8]/10' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <Stethoscope className={`w-8 h-8 ${formData.especialidad === 'derm' ? 'text-[#d3b3a8]' : 'text-slate-300'}`} />
                <span className="font-black text-sm uppercase">Dermatología</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, especialidad: 'trich' })}
                className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${formData.especialidad === 'trich' ? 'border-slate-800 bg-slate-50 ring-4 ring-slate-100' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <Scissors className={`w-8 h-8 ${formData.especialidad === 'trich' ? 'text-slate-800' : 'text-slate-300'}`} />
                <span className="font-black text-sm uppercase">Tricología</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <User className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                <input
                  type="text"
                  required
                  placeholder="Nombre Completo"
                  value={formData.paciente_nombre}
                  onChange={e => setFormData({ ...formData, paciente_nombre: e.target.value })}
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold text-slate-800 placeholder-slate-400 transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Phone className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                  <input
                    type="tel"
                    required
                    placeholder="Teléfono"
                    value={formData.paciente_telefono}
                    onChange={e => setFormData({ ...formData, paciente_telefono: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold shadow-sm"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                  <input
                    type="email"
                    required
                    placeholder="Correo electrónico"
                    value={formData.paciente_correo}
                    onChange={e => setFormData({ ...formData, paciente_correo: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Calendar className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                  <input
                    type="date"
                    required
                    value={formData.fecha_preferida}
                    onChange={e => setFormData({ ...formData, fecha_preferida: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold text-slate-400 focus:text-slate-800 shadow-sm"
                  />
                  <label className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Preferida</label>
                </div>
                <div className="relative">
                  <Clock className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                  <input
                    type="time"
                    required
                    value={formData.hora_preferida}
                    onChange={e => setFormData({ ...formData, hora_preferida: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold text-slate-400 focus:text-slate-800 shadow-sm"
                  />
                  <label className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hora Preferida</label>
                </div>
              </div>

              <div className="relative">
                <Baby className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                <input
                  type="date"
                  placeholder="Fecha de Nacimiento"
                  value={formData.fecha_nacimiento || ''}
                  onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold text-slate-400 focus:text-slate-800 shadow-sm"
                />
                <label className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Nacimiento (Opcional)</label>
              </div>

              <textarea
                placeholder="Cuéntanos brevemente el motivo de tu consulta..."
                value={formData.motivo}
                onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#d3b3a8] outline-none font-bold h-32 resize-none shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-lg shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'RESERVAR MI ESPACIO'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Landing;
