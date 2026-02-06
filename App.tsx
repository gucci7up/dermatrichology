
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import NewPatient from './pages/NewPatient';
import Settings from './pages/Settings';
import PrintReport from './pages/PrintReport';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Consultations from './pages/Consultations';
import NewConsultation from './pages/NewConsultation';
import Prescription from './pages/Prescription';
import Landing from './pages/Landing';
import Login from './pages/Login';
import { AuthGuard } from './components/AuthGuard';
import { DB } from './services/db';

// Seed initial data if empty
const seedData = async () => {
  try {
    const patients = await DB.patients.getAll();
    if (patients.length === 0) {
      const patientId = crypto.randomUUID();

      await DB.patients.save({
        id: patientId,
        nombre_completo: "Carlos Alberto Rodríguez",
        fecha_nacimiento: "1988-05-12",
        sexo: 'M',
        telefono: "+54 9 11 4433-2211",
        correo: "carlos.alberto@gmail.com",
        direccion: "Av. Libertador 1200, CABA",
        documento_identidad: "20-33445566-1",
        contacto_emergencia: "Ana Maria (Esposa) +54 9 11 5566-7788",
        foto_perfil: "https://picsum.photos/seed/carlos/200",
        ocupacion: "Arquitecto",
        created_at: new Date().toISOString()
      });

      await DB.trich.save({
        id: crypto.randomUUID(),
        paciente_id: patientId,
        motivo_consulta: "Caída excesiva en zona frontal",
        antecedentes_familiares: "Padre con alopecia",
        enfermedades_hormonales: "Ninguna",
        deficits_nutricionales: "Vitamina D baja",
        estres: "Alto nivel laboral",
        cirugias: "Ninguna",
        infecciones: "Gripe hace 2 meses",
        covid: true,
        medicamentos: "Multivitamínicos",
        inicio_caida: "Hace 6 meses",
        duracion: "Progresivo",
        patron_caida: "Difuso",
        cantidad_diaria: "50-100 cabellos",
        factores_desencadenantes: "Estrés",
        progresion: "Moderada",
        fecha: new Date().toISOString()
      });

      await DB.sessions.save({
        id: crypto.randomUUID(),
        paciente_id: patientId,
        fecha: new Date().toISOString(),
        evolucion_clinica: "Mejoría en la inflamación perifolicular. Se observa mayor estabilidad del tallo.",
        fotos_comparativas: ["https://picsum.photos/seed/hair1/200", "https://picsum.photos/seed/hair2/200"],
        cambios_densidad: 8.5,
        respuesta_tratamiento: "Positiva",
        ajustes_terapeuticos: "Aumentar Minoxidil a 5%"
      });

      await DB.labs.save({
        id: crypto.randomUUID(),
        paciente_id: patientId,
        fecha: new Date().toISOString(),
        analisis: "Perfil Hormonal + Vitaminas",
        resultados: "Ferritina: 40ng/ml, VitD: 18ng/ml",
        interpretacion: "Se requiere suplementación de Vitamina D y control de niveles de hierro."
      });
    }
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};


import { AuthProvider } from './context/AuthContext';

// ... (seedData function remains unchanged)

const App: React.FC = () => {
  React.useEffect(() => {
    // seedData(); // Disabled to prevent duplicate creation
  }, []);

  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas */}
          <Route path="/*" element={
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/booking" element={<Landing />} />
                  <Route path="/patients" element={<PatientList />} />
                  <Route path="/patients/new" element={<NewPatient />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/patients/:id/print" element={<PrintReport />} />
                  <Route path="/patients/:id/prescription" element={<Prescription />} />
                  <Route path="/consultations" element={<Consultations />} />
                  <Route path="/consultations/new" element={<NewConsultation />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </AuthGuard>
          } />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
