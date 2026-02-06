
export interface Patient {
  id: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F' | 'O';
  telefono: string;
  correo: string;
  direccion: string;
  documento_identidad: string;
  contacto_emergencia: string;
  foto_perfil: string;
  ocupacion: string;
  created_at: string;
}

export interface AppointmentRequest {
  id: string;
  paciente_nombre: string;
  paciente_telefono: string;
  paciente_correo: string;
  especialidad: 'derm' | 'trich';
  fecha_preferida: string;
  hora_preferida: string; // Añadido para la agenda
  fecha_nacimiento?: string; // Added for prefilling patient data
  motivo: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada';
  created_at: string;
}

export interface DermHistory {
  id: string;
  paciente_id: string;
  motivo_consulta: string;
  antecedentes_personales_patologicos: string;
  antecedentes_familiares: string;
  alergias: string;
  medicamentos_actuales: string;
  habitos: {
    tabaco: boolean;
    alcohol: boolean;
    cosmeticos: string;
    exposicion_solar: string;
    otros: string;
  };
  tipo_piel_fitzpatrick: number; // 1-6
  historia_enfermedad: string;
  diagnosticos: string;
  evolucion_clinica: string;
  observaciones: string;
  fecha: string;
}

export interface TrichHistory {
  id: string;
  paciente_id: string;
  fecha: string;
  motivo_consulta: string;

  // Antecedentes
  antecedentes_familiares: string;
  enfermedades_hormonales: string; // SOP, Tiroides
  deficits_nutricionales: string;
  estres: string;
  cirugias: string;
  infecciones: string;
  covid: boolean;
  medicamentos: string;

  // Historia Capilar
  inicio_caida: string;
  duracion: string;
  patron_caida: string;
  cantidad_diaria: string;
  factores_desencadenantes: string;
  estacionalidad?: string;
  progresion: string;

  // JSONB Fields
  examen_fisico: {
    cuero_cabelludo: string[]; // Eritema, Descamación, etc.
    cabello: string[]; // Densidad, Frizz, etc.
    fototipo: number;
    patron_alopecia: string;
  };

  tricoscopia: {
    zona_evaluada: string;
    miniaturizacion_pct: number;
    vellosos: boolean;
    terminales: boolean;
    puntos_amarillos: boolean;
    puntos_negros: boolean;
    signos_inflamacion: boolean;
    notas: string;
  };

  escalas: {
    ludwig?: string;
    sinclair?: string;
    hamilton?: string;
    savin?: string;
    pull_test?: string;
    wash_test?: string;
  };

  diagnostico_estructurado: {
    principal: string;
    secundarios: string;
    tipo_alopecia: string;
    fase: string;
    actividad_inflamatoria: boolean;
  };

  plan_tratamiento: {
    topico: string;
    oral: string;
    procedimientos: string;
  };
}

export interface Session {
  id: string;
  paciente_id: string;
  fecha: string;
  evolucion_clinica: string;
  fotos_comparativas: string[];
  cambios_densidad: number; // Percent change
  respuesta_tratamiento: string;
  ajustes_terapeuticos: string;
}

export interface LabResult {
  id: string;
  paciente_id: string;
  fecha: string;
  analisis: string;
  resultados: string;
  interpretacion: string;
}

export interface Treatment {
  id: string;
  paciente_id: string;
  fecha: string;
  tratamiento_topico: string;
  tratamiento_oral: string;
  procedimientos: string;
  notas_adicionales: string;
}

export interface AppSettings {
  id?: string;
  app_name: string;
  logo_url: string;
  logo_width: number;
  logo_height: number;
  doctor_name: string;
  doctor_profession: string;
  doctor_photo_url: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  role: 'admin' | 'doctor' | 'assistant';
  full_name: string;
  updated_at?: string;
}

export interface Prescription {
  id: string;
  paciente_id: string;
  fecha: string; // ISO string
  contenido: string;
  created_at: string;
}
