
import React from 'react';
import { DB } from '../services/db';
import { Patient } from '../types';
import { Search, Filter, Plus, UserCircle, Phone, Mail, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PatientList: React.FC = () => {
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { role } = useAuth();
  const { notify } = useToast();

  React.useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await DB.patients.getAll();
        setPatients(data);
      } catch (error) {
        console.error("Failed to load patients", error);
      }
    };
    fetchPatients();
  }, []);

  const handleDelete = async (patientId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to detail
    e.stopPropagation();

    if (window.confirm('¿Estás seguro de que quieres eliminar este paciente? Esta acción no se puede deshacer.')) {
      try {
        await DB.patients.delete(patientId);
        setPatients(prev => prev.filter(p => p.id !== patientId));
      } catch (error) {
        console.error("Error deleting patient", error);
        notify("Ocurrió un error al intentar eliminar el paciente.", 'error');
      }
    }
  };

  const filteredPatients = patients.filter(p =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.documento_identidad.includes(searchTerm)
  );

  const canDelete = role === 'admin' || role === 'doctor';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sand-900">Directorio de Pacientes</h1>
          <p className="text-sand-500">Gestión completa de historiales y expedientes.</p>
        </div>
        <Link to="/patients/new" className="flex items-center justify-center gap-2 bg-[#C15F3C] hover:bg-[#8C4429] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-[#C15F3C]/20">
          <Plus className="w-4 h-4" />
          Registrar Nuevo
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-sand-200 rounded-xl focus:ring-2 focus:ring-[#C15F3C] transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-sand-200 rounded-xl text-sand-600 font-medium hover:bg-sand-50">
          <Filter className="w-5 h-5" />
          Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="relative bg-white rounded-2xl border border-sand-200 shadow-md p-6 hover:shadow-xl transition-shadow group">

            {/* Delete Button - Only for Admin/Doctor */}
            {canDelete && (
              <button
                onClick={(e) => handleDelete(patient.id, e)}
                className="absolute top-4 right-4 p-2 text-sand-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                title="Eliminar Paciente"
                aria-label={`Eliminar a ${patient.nombre_completo}`}
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-4 mb-6 pr-8">
              <img src={patient.foto_perfil} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-sand-50" alt={`Foto de ${patient.nombre_completo}`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sand-900 truncate text-lg">{patient.nombre_completo}</h3>
                <p className="text-sm text-sand-500 flex items-center gap-1.5">
                  <UserCircle className="w-3.5 h-3.5" />
                  ID: {patient.documento_identidad}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-sand-600">
                <div className="w-8 h-8 rounded-lg bg-[#C15F3C]/10 flex items-center justify-center text-[#C15F3C]">
                  <Phone className="w-4 h-4" />
                </div>
                {patient.telefono}
              </div>
              <div className="flex items-center gap-3 text-sm text-sand-600">
                <div className="w-8 h-8 rounded-lg bg-sand-100 flex items-center justify-center text-sand-600">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="truncate">{patient.correo}</span>
              </div>
            </div>

            <Link
              to={`/patients/${patient.id}`}
              className="w-full py-2.5 bg-sand-50 group-hover:bg-[#C15F3C] text-sand-600 group-hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Ver Expediente
            </Link>
          </div>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-sand-200">
          <div className="w-20 h-20 bg-sand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-sand-300" />
          </div>
          <h3 className="text-xl font-bold text-sand-800">No se encontraron pacientes</h3>
          <p className="text-sand-500 mt-1">Prueba con otros términos de búsqueda o registra uno nuevo.</p>
        </div>
      )}
    </div>
  );
};

export default PatientList;
