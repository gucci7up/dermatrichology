
import React from 'react';
import { DB } from '../services/db';
import { AppSettings } from '../types';
import { Settings as SettingsIcon, Globe, Upload, Save, CheckCircle, Trash2, Image as ImageIcon, UserCircle, Briefcase, Maximize2 } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = React.useState<AppSettings>({
    app_name: 'DermaTrich',
    logo_url: '',
    logo_width: 220,
    logo_height: 100,
    doctor_name: '',
    doctor_profession: '',
    doctor_photo_url: ''
  });
  const [loading, setLoading] = React.useState(true);
  const [showSaved, setShowSaved] = React.useState(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await DB.settings.get();
        if (data) setSettings(data);
      } catch (error) {
        console.error("Error loading settings", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      await DB.settings.save(settings);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Error al guardar la configuración.");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDoctorPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, doctor_photo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => setSettings(prev => ({ ...prev, logo_url: '' }));
  const removeDoctorPhoto = () => setSettings(prev => ({ ...prev, doctor_photo_url: '' }));

  const inputClasses = "w-full px-5 py-3 bg-white border border-slate-400 rounded-xl focus:ring-2 focus:ring-[#d3b3a8] focus:border-[#d3b3a8] outline-none transition-all placeholder-slate-400 text-slate-900 shadow-sm font-medium";
  const labelClasses = "text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-1.5 block";

  if (loading) return <div className="p-10 text-center">Cargando configuración...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Configuración del Sistema</h1>
        <p className="text-slate-600 font-semibold">Configura la identidad de tu clínica y perfil profesional.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Identidad de la Clínica */}
        <section className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
          <div className="flex items-center gap-2 mb-8 bg-slate-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-slate-200">
            <Globe className="w-6 h-6 text-[#d3b3a8]" />
            <h3 className="font-black text-xl text-slate-900">Identidad Institucional</h3>
          </div>

          <div className="space-y-8">
            <div className="space-y-1">
              <label className={labelClasses}>Nombre de la Aplicación / Clínica</label>
              <input
                value={settings.app_name}
                onChange={e => setSettings({ ...settings, app_name: e.target.value })}
                className={inputClasses}
                placeholder="Ej: Clínica DermaCare"
              />
            </div>

            <div className="space-y-6">
              <label className={labelClasses}>Logo Institucional</label>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative w-48 h-48 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner group">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      style={{ width: settings.logo_width, height: settings.logo_height, objectFit: 'contain' }}
                      alt="Logo Preview"
                    />
                  ) : (
                    <ImageIcon className="text-slate-300 w-12 h-12" />
                  )}
                </div>
                <div className="flex-1 space-y-6 w-full">
                  <div className="flex flex-wrap gap-3">
                    <label className="cursor-pointer bg-white border-2 border-slate-400 px-6 py-2.5 rounded-xl font-black text-sm text-slate-700 hover:bg-slate-50 hover:border-[#d3b3a8] hover:text-[#d3b3a8] transition-all shadow-sm flex items-center gap-2">
                      <Upload className="w-4 h-4" /> SUBIR LOGO
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                    </label>
                    {settings.logo_url && (
                      <button type="button" onClick={removeLogo} className="bg-white border-2 border-red-200 px-6 py-2.5 rounded-xl font-black text-sm text-red-500 hover:bg-red-50 hover:border-red-500 transition-all shadow-sm flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> ELIMINAR
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className={labelClasses}>Ancho del Logo (px)</label>
                      <div className="relative">
                        <Maximize2 className="absolute left-3 top-3 w-4 h-4 text-slate-400 rotate-90" />
                        <input
                          type="number"
                          value={settings.logo_width}
                          onChange={e => setSettings({ ...settings, logo_width: parseInt(e.target.value) || 0 })}
                          className={`${inputClasses} pl-10 py-2`}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClasses}>Alto del Logo (px)</label>
                      <div className="relative">
                        <Maximize2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          value={settings.logo_height}
                          onChange={e => setSettings({ ...settings, logo_height: parseInt(e.target.value) || 0 })}
                          className={`${inputClasses} pl-10 py-2`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Perfil del Profesional */}
        <section className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
          <div className="flex items-center gap-2 mb-8 bg-slate-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-slate-200">
            <UserCircle className="w-6 h-6 text-[#d3b3a8]" />
            <h3 className="font-black text-xl text-slate-900">Perfil del Profesional</h3>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className={labelClasses}>Nombre Completo (Doctor/a)</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    value={settings.doctor_name}
                    onChange={e => setSettings({ ...settings, doctor_name: e.target.value })}
                    className={`${inputClasses} pl-12`}
                    placeholder="Ej: Dr. Alejandro Pérez"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClasses}>Profesión / Especialidad</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    value={settings.doctor_profession}
                    onChange={e => setSettings({ ...settings, doctor_profession: e.target.value })}
                    className={`${inputClasses} pl-12`}
                    placeholder="Ej: Dermatólogo - Tricólogo"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className={labelClasses}>Foto de Perfil Profesional</label>
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="relative w-32 h-32 rounded-full border-2 border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-white">
                  {settings.doctor_photo_url ? (
                    <img src={settings.doctor_photo_url} className="w-full h-full object-cover" alt="Doctor Preview" />
                  ) : (
                    <UserCircle className="text-slate-300 w-12 h-12" />
                  )}
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap gap-3">
                    <label className="cursor-pointer bg-white border-2 border-slate-400 px-6 py-2.5 rounded-xl font-black text-sm text-slate-700 hover:bg-slate-50 hover:border-[#d3b3a8] hover:text-[#d3b3a8] transition-all shadow-sm flex items-center gap-2">
                      <Upload className="w-4 h-4" /> SUBIR FOTO
                      <input type="file" className="hidden" accept="image/*" onChange={handleDoctorPhotoChange} />
                    </label>
                    {settings.doctor_photo_url && (
                      <button type="button" onClick={removeDoctorPhoto} className="bg-white border-2 border-red-200 px-6 py-2.5 rounded-xl font-black text-sm text-red-500 hover:bg-red-50 hover:border-red-500 transition-all shadow-sm flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> ELIMINAR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4 sticky bottom-6 z-10">
          <button type="submit" className="flex-1 bg-[#d3b3a8] hover:bg-[#c4a499] text-white py-5 rounded-2xl font-black shadow-2xl shadow-[#d3b3a8]/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
            <Save className="w-6 h-6" /> GUARDAR TODOS LOS CAMBIOS
          </button>

          {showSaved && (
            <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-right-4 bg-white px-6 py-4 rounded-2xl border border-emerald-200 shadow-lg">
              <CheckCircle className="w-6 h-6" /> Configuración Guardada
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default Settings;
