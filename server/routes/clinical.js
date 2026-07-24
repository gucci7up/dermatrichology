import { Router } from 'express';
import { createClinicalRouter } from '../lib/crudRouter.js';

const router = Router();

router.use(createClinicalRouter({
  path: 'derm-histories',
  table: 'derm_histories',
  columns: [
    'id', 'paciente_id', 'motivo_consulta', 'antecedentes_personales_patologicos',
    'antecedentes_familiares', 'alergias', 'medicamentos_actuales', 'habitos',
    'tipo_piel_fitzpatrick', 'historia_enfermedad', 'diagnosticos',
    'evolucion_clinica', 'observaciones', 'fecha'
  ],
  allowUpdate: true
}));

router.use(createClinicalRouter({
  path: 'trich-histories',
  table: 'trich_histories',
  columns: [
    'id', 'paciente_id', 'motivo_consulta', 'antecedentes_familiares',
    'enfermedades_hormonales', 'deficits_nutricionales', 'estres', 'cirugias',
    'infecciones', 'covid', 'medicamentos', 'inicio_caida', 'duracion',
    'patron_caida', 'cantidad_diaria', 'factores_desencadenantes',
    'estacionalidad', 'progresion', 'examen_fisico', 'tricoscopia', 'escalas',
    'diagnostico_estructurado', 'plan_tratamiento', 'fecha'
  ],
  allowUpdate: true
}));

router.use(createClinicalRouter({
  path: 'sessions',
  table: 'sessions',
  columns: [
    'id', 'paciente_id', 'fecha', 'evolucion_clinica', 'fotos_comparativas',
    'cambios_densidad', 'respuesta_tratamiento', 'ajustes_terapeuticos'
  ],
  orderColumn: 'fecha'
}));

router.use(createClinicalRouter({
  path: 'labs',
  table: 'labs',
  columns: ['id', 'paciente_id', 'fecha', 'analisis', 'resultados', 'interpretacion']
}));

router.use(createClinicalRouter({
  path: 'treatments',
  table: 'treatments',
  columns: [
    'id', 'paciente_id', 'fecha', 'tratamiento_topico', 'tratamiento_oral',
    'procedimientos', 'notas_adicionales'
  ]
}));

router.use(createClinicalRouter({
  path: 'prescriptions',
  table: 'prescriptions',
  columns: ['id', 'paciente_id', 'fecha', 'contenido', 'created_at'],
  orderColumn: 'fecha',
  allowDelete: true
}));

export default router;
