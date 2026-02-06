-- Enable Row Level Security (RLS) on all tables is recommended, 
-- but for simplicity in this migration we will start with public access 
-- and then lock it down. 
-- Ideally, we create tables and policies.

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) -- Optional: link to auth user if needed per doctor
);

-- 2. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_nombre TEXT NOT NULL,
    paciente_telefono TEXT,
    paciente_correo TEXT,
    especialidad TEXT CHECK (especialidad IN ('derm', 'trich')),
    fecha_preferida DATE,
    hora_preferida TEXT,
    motivo TEXT,
    estado TEXT CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Derm Histories Table
CREATE TABLE IF NOT EXISTS public.derm_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    motivo_consulta TEXT,
    antecedentes_personales_patologicos TEXT,
    antecedentes_familiares TEXT,
    alergias TEXT,
    medicamentos_actuales TEXT,
    habitos JSONB, -- Stores { tabaco: bool, alcohol: bool, ... }
    tipo_piel_fitzpatrick INTEGER,
    historia_enfermedad TEXT,
    diagnosticos TEXT,
    evolucion_clinica TEXT,
    observaciones TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trich Histories Table
CREATE TABLE IF NOT EXISTS public.trich_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
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
    progresion TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    evolucion_clinica TEXT,
    fotos_comparativas JSONB, -- Array of URLs
    cambios_densidad NUMERIC(5,2),
    respuesta_tratamiento TEXT,
    ajustes_terapeuticos TEXT
);

-- 6. Labs Table
CREATE TABLE IF NOT EXISTS public.labs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    analisis TEXT,
    resultados TEXT,
    interpretacion TEXT
);

-- 7. Treatments Table
CREATE TABLE IF NOT EXISTS public.treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    tratamiento_topico TEXT,
    tratamiento_oral TEXT,
    procedimientos TEXT,
    notas_adicionales TEXT
);

-- Enable RLS (Security) - Optional for initial setup but good practice
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.derm_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trich_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Create Policy: Allow public access (TEMPORARY for development)
-- WARNING: Replace this with proper auth policies later!
CREATE POLICY "Public Access" ON public.patients FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.derm_histories FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.trich_histories FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.labs FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.treatments FOR ALL USING (true);

-- Storage Buckets (Manual step usually needed in Dashboard, but script can hint)
-- insert into storage.buckets (id, name) values ('images', 'images');
-- create policy "Public Access Images" on storage.objects for all using ( bucket_id = 'images' );
