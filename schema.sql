CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    fecha_nacimiento DATE,
    sexo TEXT CHECK (sexo IN ('M', 'F', 'O')),
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    documento_identidad TEXT,
    contacto_emergencia TEXT,
    foto_perfil TEXT,
    ocupacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_nombre TEXT NOT NULL,
    paciente_telefono TEXT,
    paciente_correo TEXT,
    paciente_cedula TEXT,
    especialidad TEXT CHECK (especialidad IN ('derm', 'trich')),
    fecha_preferida DATE,
    hora_preferida TEXT,
    fecha_nacimiento DATE,
    motivo TEXT,
    con_seguro BOOLEAN DEFAULT false,
    estado TEXT CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS derm_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    motivo_consulta TEXT,
    antecedentes_personales_patologicos TEXT,
    antecedentes_familiares TEXT,
    alergias TEXT,
    medicamentos_actuales TEXT,
    habitos JSONB,
    tipo_piel_fitzpatrick INTEGER,
    historia_enfermedad TEXT,
    diagnosticos TEXT,
    evolucion_clinica TEXT,
    observaciones TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trich_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    motivo_consulta TEXT,
    antecedentes_familiares TEXT,
    enfermedades_hormonales TEXT,
    deficits_nutricionales TEXT,
    estres TEXT,
    cirugias TEXT,
    infecciones TEXT,
    covid BOOLEAN,
    medicamentos TEXT,
    inicio_caida TEXT,
    duracion TEXT,
    patron_caida TEXT,
    cantidad_diaria TEXT,
    factores_desencadenantes TEXT,
    estacionalidad TEXT,
    progresion TEXT,
    examen_fisico JSONB,
    tricoscopia JSONB,
    escalas JSONB,
    diagnostico_estructurado JSONB,
    plan_tratamiento JSONB,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    evolucion_clinica TEXT,
    fotos_comparativas JSONB,
    cambios_densidad NUMERIC(5,2),
    respuesta_tratamiento TEXT,
    ajustes_terapeuticos TEXT
);

CREATE TABLE IF NOT EXISTS labs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    analisis TEXT,
    resultados TEXT,
    interpretacion TEXT
);

CREATE TABLE IF NOT EXISTS treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    tratamiento_topico TEXT,
    tratamiento_oral TEXT,
    procedimientos TEXT,
    notas_adicionales TEXT
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    contenido TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    app_name TEXT,
    logo_url TEXT,
    logo_width INTEGER,
    logo_height INTEGER,
    doctor_name TEXT,
    doctor_profession TEXT,
    doctor_photo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'doctor', 'assistant')) NOT NULL,
    full_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
