import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD env vars (the account created by create-admin.js)');
  process.exit(1);
}

const call = async (path, options = {}, token) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body = res.status === 204 ? null : await res.json();
  return { status: res.status, body };
};

const run = async () => {
  const health = await call('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  console.log('health check passed');

  const badLogin = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'definitely-wrong' }),
  });
  assert.equal(badLogin.status, 401);
  console.log('bad login rejected');

  const login = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  const token = login.body.token;
  console.log('login passed, token acquired');

  const me = await call('/auth/me', {}, token);
  assert.equal(me.status, 200);
  assert.equal(me.body.profile.email, ADMIN_EMAIL);
  console.log('me endpoint passed');

  const patientId = crypto.randomUUID();
  const createPatient = await call('/patients', {
    method: 'POST',
    body: JSON.stringify({
      id: patientId,
      nombre_completo: 'Smoke Test Patient',
      fecha_nacimiento: '1990-01-01',
      sexo: 'M',
      telefono: '0000',
      correo: 'smoke@test.local',
      direccion: 'N/A',
      documento_identidad: 'N/A',
      contacto_emergencia: 'N/A',
      foto_perfil: '',
      ocupacion: 'N/A',
      created_at: new Date().toISOString(),
    }),
  }, token);
  assert.equal(createPatient.status, 204);
  console.log('patient created');

  const list = await call('/patients', {}, token);
  assert.equal(list.status, 200);
  assert.ok(list.body.some((p) => p.id === patientId));
  console.log('patient list passed');

  const trichPayload = {
    id: crypto.randomUUID(),
    paciente_id: patientId,
    motivo_consulta: 'smoke test',
    antecedentes_familiares: '',
    enfermedades_hormonales: '',
    deficits_nutricionales: '',
    estres: '',
    cirugias: '',
    infecciones: '',
    covid: false,
    medicamentos: '',
    inicio_caida: '',
    duracion: '',
    patron_caida: '',
    cantidad_diaria: '',
    factores_desencadenantes: '',
    progresion: '',
    examen_fisico: { cuero_cabelludo: ['Eritema'], cabello: ['Frizz'], fototipo: 3, patron_alopecia: 'difuso' },
    tricoscopia: { zona_evaluada: 'vertex', miniaturizacion_pct: 20, vellosos: true, terminales: true, puntos_amarillos: false, puntos_negros: false, signos_inflamacion: false, notas: '' },
    escalas: { ludwig: 'I' },
    diagnostico_estructurado: { principal: 'Alopecia androgenética', secundarios: '', tipo_alopecia: 'AGA', fase: 'inicial', actividad_inflamatoria: false },
    plan_tratamiento: { topico: 'Minoxidil', oral: '', procedimientos: '' },
    fecha: new Date().toISOString(),
  };
  const createTrich = await call('/trich-histories', { method: 'POST', body: JSON.stringify(trichPayload) }, token);
  assert.equal(createTrich.status, 204);

  const trichList = await call(`/trich-histories?paciente_id=${patientId}`, {}, token);
  assert.equal(trichList.status, 200);
  assert.equal(trichList.body.length, 1);
  assert.deepEqual(trichList.body[0].examen_fisico, trichPayload.examen_fisico);
  console.log('JSONB round-trip passed (nested objects survived insert + read)');

  const tooLong = await call('/patients', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), nombre_completo: 'a'.repeat(20001) }) }, token);
  assert.equal(tooLong.status, 400, 'oversized field should be rejected');
  console.log('input length validation works');

  const del = await call(`/patients/${patientId}`, { method: 'DELETE' }, token);
  assert.equal(del.status, 204);
  console.log('cleanup passed');

  const apptId = crypto.randomUUID();
  await call('/appointments', { method: 'POST', body: JSON.stringify({ id: apptId, paciente_nombre: 'Smoke Cita', especialidad: 'derm', fecha_preferida: '2026-08-01', hora_preferida: '10:00', motivo: 'test', estado: 'pendiente', created_at: new Date().toISOString() }) }, token);
  const patchAppt = await call(`/appointments/${apptId}`, { method: 'PATCH', body: JSON.stringify({ estado: 'confirmada' }) }, token);
  assert.equal(patchAppt.status, 204);
  const appts = await call('/appointments', {}, token);
  assert.equal(appts.body.find((a) => a.id === apptId).estado, 'confirmada', 'appointment status should update');
  console.log('appointment status update works');

  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'ratelimit@test.local', password: 'x' }) });
    if (r.status === 429) { got429 = true; break; }
  }
  assert.equal(got429, true, 'login should rate-limit after repeated attempts');
  console.log('login rate-limit works');

  console.log('\nALL SMOKE TESTS PASSED');
};

run().catch((e) => {
  console.error('SMOKE TEST FAILED:', e);
  process.exit(1);
});
