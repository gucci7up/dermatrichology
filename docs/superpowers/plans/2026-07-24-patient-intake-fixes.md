# Patient Intake Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "+ Registrar Nuevo" patient-creation form capture the same clinical anamnesis fields the doctor edits later in the patient's expediente, add a "drug use" habit field, and let evolution photos open full-size on click.

**Architecture:** Frontend-only (React 19 + Vite + TS). No backend or schema changes — `habitos` (DermHistory) is a JSONB column already whitelisted end to end (`server/lib/crudRouter.js`'s `derm-histories` config includes `habitos` in `columns`), so adding a new key inside that object requires no migration. `pages/NewPatient.tsx` currently under-collects data relative to what `pages/PatientDetail.tsx`'s edit tabs (`dermForm`/`trichForm`) expose — this plan brings the intake form's field coverage up to match, for the anamnesis/history fields only (exam findings, tricoscopy, and diagnosis are intentionally left for the doctor to fill in during the actual physical consultation, via the existing "Ficha"/"GUARDAR FICHA" edit flow — this matches how the derm intake already deliberately leaves `diagnosticos`/`evolucion_clinica`/`observaciones` blank at creation).

**Tech Stack:** React 19, TypeScript, existing Tailwind conventions, `useToast` from `context/ToastContext.tsx` (already wired app-wide).

## Global Constraints

- No backend changes needed — `habitos`, `examen_fisico`, `tricoscopia`, `escalas`, `diagnostico_estructurado`, `plan_tratamiento` are all JSONB columns already covered by the existing whitelist in `server/routes/clinical.js`/`crudRouter.js`.
- No new dependency for the photo lightbox — plain React state + a fixed-position overlay `<div>`, consistent with how modals/overlays are already done in this codebase (e.g. the mobile menu overlay in `components/Layout.tsx`).
- Match existing Tailwind styling conventions in the file being edited (don't introduce a new visual language).
- `useToast()` must be called at the top of the component body (React hooks rule) if a task adds a new error/success path that didn't have one before.
- Backward compatibility: existing `DermHistory` records in the DB won't have a `drogas` key inside `habitos` — all reads must default missing values (`dermForm.habitos?.drogas || false`), matching the existing pattern already used for `tabaco`/`alcohol`.

---

### Task 14: Add "Consumo de Drogas" habit field

**Files:**
- Modify: `types.ts` (DermHistory.habitos shape)
- Modify: `pages/NewPatient.tsx` (creation form)
- Modify: `pages/PatientDetail.tsx` (edit form, derm tab)

**Interfaces:**
- Produces: `habitos.drogas: boolean` — a new key inside the existing JSONB `habitos` object, read/written alongside `tabaco`/`alcohol`.

- [ ] **Step 1: Add the field to the type**

In `types.ts`, inside `DermHistory.habitos`, add `drogas: boolean;` after `alcohol: boolean;`:
```ts
  habitos: {
    tabaco: boolean;
    alcohol: boolean;
    drogas: boolean;
    cosmeticos: string;
    exposicion_solar: string;
    otros: string;
  };
```

- [ ] **Step 2: Add the checkbox to `pages/NewPatient.tsx`**

In the `dermData` initial state (around line 32-38), add `drogas: false` after `alcohol: false`:
```tsx
    habitos: {
      tabaco: false,
      alcohol: false,
      drogas: false,
      cosmeticos: '',
      exposicion_solar: '',
      otros: ''
    }
```
In the JSX habits block (right after the Alcoholismo `<label>`, around line 289), add a third checkbox following the exact same pattern as tabaco/alcohol:
```tsx
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={dermData.habitos.drogas} className="w-5 h-5 rounded-lg border-slate-400 text-[#d3b3a8] focus:ring-[#d3b3a8] shadow-sm" onChange={(e) => setDermData(prev => ({ ...prev, habitos: { ...prev.habitos, drogas: e.target.checked } }))} />
                      <span className="text-sm font-black text-slate-700 group-hover:text-slate-900 transition-colors">Consumo de Drogas</span>
                    </label>
```

- [ ] **Step 3: Add the checkbox to `pages/PatientDetail.tsx`'s derm edit tab**

In the "Section 2: Habits & Type" block (around line 445-465, right after the Alcohol `<label>`), add the same checkbox pattern used for `tabaco`/`alcohol` there:
```tsx
                          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={dermForm.habitos?.drogas || false}
                              onChange={e => setDermForm({ ...dermForm, habitos: { ...dermForm.habitos!, drogas: e.target.checked } })}
                              className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700">Consumo de Drogas</span>
                          </label>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors (the `habitos` object literal in `NewPatient.tsx` must satisfy the updated `DermHistory['habitos']` type — since `NewPatient.tsx` builds a plain object, not a typed `DermHistory` directly for `dermData` state, confirm the final `dermHist` object at save-time still type-checks against `DermHistory`). Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add types.ts pages/NewPatient.tsx pages/PatientDetail.tsx
git commit -m "feat: add drug-use habit field to dermatological history"
```

---

### Task 15: Complete the dermatology intake form (alergias, medicamentos, habitos gaps)

**Files:**
- Modify: `pages/NewPatient.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by other tasks — this task's `dermData` state gains 4 new keys that get saved via the existing `DB.derm.save(dermHist)` call unchanged.

Context: `NewPatient.tsx`'s `dermData` state (and its form) is missing four fields that `DermHistory` requires and that the doctor CAN edit later in `PatientDetail.tsx`'s derm tab: `alergias`, `medicamentos_actuales`, `habitos.exposicion_solar`, `habitos.cosmeticos`. Today these save as empty/undefined on every new patient, so the expediente looks empty until someone remembers to fill them in via the edit tab.

- [ ] **Step 1: Add the missing keys to `dermData` state**

In `pages/NewPatient.tsx`, the `dermData` initial state (after Task 14's edit, so `habitos` already has `drogas`), add `alergias: ''` and `medicamentos_actuales: ''` as top-level keys, and `exposicion_solar: ''`/`cosmeticos: ''` already exist in the `habitos` object from the original code — confirm they're there (they are, per the original file) and will now actually get form inputs (Step 2):
```tsx
  const [dermData, setDermData] = React.useState({
    motivo_consulta: '',
    antecedentes_personales_patologicos: '',
    antecedentes_familiares: '',
    alergias: '',
    medicamentos_actuales: '',
    historia_enfermedad: '',
    tipo_piel_fitzpatrick: 3,
    habitos: {
      tabaco: false,
      alcohol: false,
      drogas: false,
      cosmeticos: '',
      exposicion_solar: '',
      otros: ''
    }
  });
```

- [ ] **Step 2: Add the two missing top-level inputs**

In the "Historia Clínica Dermatológica" section of `pages/NewPatient.tsx`, right after the "Antecedentes Personales"/"Antecedentes Familiares" grid (after the closing `</div>` of that `grid grid-cols-1 md:grid-cols-2 gap-8` block, before the `<div className="pt-8 border-t border-slate-300">` habits section), add a new grid with Alergias and Medicamentos Actuales, styled consistently (Alergias uses the red-tinted style like `PatientDetail.tsx`'s equivalent field):
```tsx
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className={labelClasses}>Alergias</label>
                  <input type="text" name="alergias" value={dermData.alergias} onChange={handleDermChange} className={`${inputClasses} bg-red-50/50 border-red-200 text-red-800 placeholder-red-300`} placeholder="Ej: Penicilina, Níquel..." />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Medicamentos Actuales</label>
                  <input type="text" name="medicamentos_actuales" value={dermData.medicamentos_actuales} onChange={handleDermChange} className={inputClasses} placeholder="Medicamentos que toma actualmente" />
                </div>
              </div>
```
This works via the existing `handleDermChange` handler already in the file (it does `setDermData(prev => ({ ...prev, [name]: value }))` for any `name` not starting with `habitos.`), so no new handler is needed.

- [ ] **Step 3: Add the two missing habitos inputs**

In the same habits block where Task 14 added the "Consumo de Drogas" checkbox, add two text inputs for `exposicion_solar` and `cosmeticos` next to the Fitzpatrick scale (in the `md:col-span-2` column that currently only has the Fitzpatrick buttons) — add them as a new row below the Fitzpatrick buttons, inside the same `md:col-span-2` div:
```tsx
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Exposición Solar</label>
                        <input type="text" name="habitos.exposicion_solar" value={dermData.habitos.exposicion_solar} onChange={handleDermChange} className={inputClasses} placeholder="Ej: Diaria, Ocasional..." />
                      </div>
                      <div>
                        <label className={labelClasses}>Uso de Cosméticos</label>
                        <input type="text" name="habitos.cosmeticos" value={dermData.habitos.cosmeticos} onChange={handleDermChange} className={inputClasses} placeholder="Ej: Cremas, Maquillaje..." />
                      </div>
                    </div>
```
This works via the existing `handleDermChange` handler's `habitos.` prefix branch already in the file.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add pages/NewPatient.tsx
git commit -m "feat: capture allergies, medications, and remaining habits in patient intake"
```

---

### Task 16: Complete the trichology intake form (full anamnesis)

**Files:**
- Modify: `pages/NewPatient.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by other tasks. Replaces the single-textarea trich section with a `trichData` state object, saved via the existing `DB.trich.save(trichHist)` call (only the object construction changes — currently 12 of ~14 fields are hardcoded to `''`/`false`).

Context: today `specialty === 'trich'` only collects one free-text field (`initialReasonTrich`) via a lone `<textarea>`; every other `TrichHistory` anamnesis field is hardcoded blank in `handleSubmit`. This is the core bug reported: trichology patients get an almost-empty expediente. Bring the intake form up to the SAME anamnesis fields the doctor can edit later in `PatientDetail.tsx`'s trich tab "Historia Capilar" + "Antecedentes Tricológicos" sections — do NOT add exam/tricoscopy/diagnosis/treatment-plan fields (those stay for the post-exam "Ficha" edit, matching how derm already works).

- [ ] **Step 1: Replace `initialReasonTrich` with a full `trichData` state object**

In `pages/NewPatient.tsx`, replace this line:
```tsx
  const [initialReasonTrich, setInitialReasonTrich] = React.useState('');
```
with:
```tsx
  const [trichData, setTrichData] = React.useState({
    motivo_consulta: '',
    inicio_caida: '',
    cantidad_diaria: '',
    patron_caida: '',
    factores_desencadenantes: '',
    enfermedades_hormonales: '',
    estres: '',
    medicamentos: '',
  });

  const handleTrichChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTrichData(prev => ({ ...prev, [name]: value }));
  };
```

- [ ] **Step 2: Update the prefill effect**

In the `React.useEffect` that handles `state?.prefill` (around line 46-69), change the `else` branch (currently `setInitialReasonTrich(motivo || '')`) to:
```tsx
      } else {
        setTrichData(prev => ({ ...prev, motivo_consulta: motivo || '' }));
      }
```

- [ ] **Step 3: Update `handleSubmit`'s trich branch**

Replace the hardcoded `trichHist` object (currently in the `else` branch of `if (specialty === 'derm')`) with one built from `trichData`, keeping the same id/paciente_id/fecha handling and the same hardcoded-blank fields for what's genuinely exam/diagnosis-only (`antecedentes_familiares`, `cirugias`, `infecciones`, `covid`, `estacionalidad`, `progresion`, and all the JSONB exam/diagnosis objects):
```tsx
        const trichHist: TrichHistory = {
          id: crypto.randomUUID(),
          paciente_id: patientId,
          motivo_consulta: trichData.motivo_consulta || 'Consulta inicial de tricología',
          antecedentes_familiares: '',
          enfermedades_hormonales: trichData.enfermedades_hormonales,
          deficits_nutricionales: '',
          estres: trichData.estres,
          cirugias: '',
          infecciones: '',
          covid: false,
          medicamentos: trichData.medicamentos,
          inicio_caida: trichData.inicio_caida,
          duracion: '',
          patron_caida: trichData.patron_caida,
          cantidad_diaria: trichData.cantidad_diaria,
          factores_desencadenantes: trichData.factores_desencadenantes,
          progresion: '',
          fecha: new Date().toISOString()
        };
```
Note: `TrichHistory` also requires `examen_fisico`, `tricoscopia`, `escalas`, `diagnostico_estructurado`, `plan_tratamiento` per `types.ts` — check whether the ORIGINAL pre-existing code (before this task) included those keys in its hardcoded object. If the original object did NOT include them (verify by reading the current file before editing — the version read during planning did not include them), this is pre-existing behavior (TypeScript likely allows it due to how the object is typed/asserted elsewhere, or there's a widening cast) — do not introduce a NEW type error by remaining consistent with the original object's key set. If `tsc` reports a missing-properties error on this object that did not exist before your edit, add empty-default JSONB objects matching the shape in `types.ts` (e.g. `examen_fisico: { cuero_cabelludo: [], cabello: [], fototipo: 0, patron_alopecia: '' }`, `tricoscopia: { zona_evaluada: '', miniaturizacion_pct: 0, vellosos: false, terminales: false, puntos_amarillos: false, puntos_negros: false, signos_inflamacion: false, notas: '' }`, `escalas: {}`, `diagnostico_estructurado: { principal: '', secundarios: '', tipo_alopecia: '', fase: '', actividad_inflamatoria: false }`, `plan_tratamiento: { topico: '', oral: '', procedimientos: '' }`) — but ONLY if `tsc` actually requires it; don't add unrequested code.

- [ ] **Step 4: Replace the trich JSX section**

Replace the entire `{specialty === 'trich' && (...)}` block (currently one textarea) with a form matching `PatientDetail.tsx`'s "Historia Capilar" + "Antecedentes Tricológicos" sections' field set, styled consistently with the rest of `NewPatient.tsx` (use `labelClasses`/`inputClasses`, not `PatientDetail`'s tab-specific styling):
```tsx
        {specialty === 'trich' && (
          <section className="bg-white rounded-3xl border border-slate-300 shadow-md p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-2 bg-slate-50 -mx-8 -mt-8 p-6 rounded-t-3xl border-b border-slate-200">
              <Scissors className="w-6 h-6 text-[#d3b3a8]" />
              <h3 className="font-black text-xl text-slate-900">Historia Clínica Tricológica</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className={labelClasses}>Motivo de Consulta (Caída, Picazón, Dolor...)</label>
                <textarea name="motivo_consulta" value={trichData.motivo_consulta} onChange={handleTrichChange} className={`${inputClasses} min-h-[120px] py-4`} placeholder="Describa detalladamente el problema de caída, densidad o afección del cuero cabelludo..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className={labelClasses}>Inicio de la Caída</label>
                  <input type="text" name="inicio_caida" value={trichData.inicio_caida} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: Hace 3 meses" />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Cantidad Diaria Aprox.</label>
                  <input type="text" name="cantidad_diaria" value={trichData.cantidad_diaria} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: 50-100 cabellos" />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Patrón de Caída</label>
                  <input type="text" name="patron_caida" value={trichData.patron_caida} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: Difuso, Frontal, Coronilla..." />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Factores Desencadenantes</label>
                  <input type="text" name="factores_desencadenantes" value={trichData.factores_desencadenantes} onChange={handleTrichChange} className={inputClasses} placeholder="Ej: Estrés, Posparto, Dieta..." />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-300">
                <h4 className="text-md font-black text-slate-800 mb-6">Antecedentes Tricológicos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className={labelClasses}>Hormonales / Nutricionales</label>
                    <textarea name="enfermedades_hormonales" value={trichData.enfermedades_hormonales} onChange={handleTrichChange} className={`${inputClasses} min-h-[100px] py-4`} placeholder="SOP, Tiroides, Anemia..." />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClasses}>Estrés / Cirugías / COVID</label>
                    <textarea name="estres" value={trichData.estres} onChange={handleTrichChange} className={`${inputClasses} min-h-[100px] py-4`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClasses}>Medicamentos Actuales</label>
                    <textarea name="medicamentos" value={trichData.medicamentos} onChange={handleTrichChange} className={`${inputClasses} min-h-[100px] py-4`} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors (resolve any `TrichHistory` shape mismatch per Step 3's note), build succeeds.

- [ ] **Step 6: Commit**

```bash
git add pages/NewPatient.tsx
git commit -m "feat: capture full trichology anamnesis in patient intake"
```

---

### Task 17: Click-to-enlarge evolution photos

**Files:**
- Modify: `pages/PatientDetail.tsx`

**Interfaces:**
- Produces: nothing consumed by other tasks. Adds local state `enlargedPhoto: string | null` and an overlay modal, scoped to the "sessions" tab where `fotos_comparativas` thumbnails are rendered.

Context: `PatientDetail.tsx`'s sessions tab already renders photo thumbnails with `cursor-pointer hover:scale-105` (around line 730-735) but has no click handler — clicking does nothing today.

- [ ] **Step 1: Add lightbox state**

Near `PatientDetail.tsx`'s other `useState` declarations (top of the component, alongside `activeTab`/`dermForm`/`trichForm`), add:
```tsx
  const [enlargedPhoto, setEnlargedPhoto] = React.useState<string | null>(null);
```

- [ ] **Step 2: Wire the click handler on each thumbnail**

Change the thumbnail `<div>` (around line 733) from:
```tsx
                                    <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm group cursor-pointer hover:scale-105 transition-transform">
                                      <img src={foto} alt={`Evolución ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
```
to:
```tsx
                                    <div
                                      key={idx}
                                      onClick={() => setEnlargedPhoto(foto)}
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Ampliar foto de evolución ${idx + 1}`}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEnlargedPhoto(foto); }}
                                      className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm group cursor-pointer hover:scale-105 transition-transform"
                                    >
                                      <img src={foto} alt={`Evolución ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
```

- [ ] **Step 3: Render the lightbox overlay**

Near the end of the component's JSX return, right before its final closing tag (find the outermost wrapping `<div>` that the component returns and add this as the last child, as a sibling to the main content — check the existing pattern for how `components/Layout.tsx` renders its mobile-menu overlay for the closing-tag placement convention), add:
```tsx
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setEnlargedPhoto(null)}
        >
          <button
            onClick={() => setEnlargedPhoto(null)}
            aria-label="Cerrar imagen ampliada"
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={enlargedPhoto}
            alt="Foto de evolución ampliada"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
```
Confirm `X` is already imported from `lucide-react` in this file (it is, per existing usage elsewhere) — if not, add it to the import.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add pages/PatientDetail.tsx
git commit -m "feat: click evolution photos to view full-size"
```

---

## Final verification

After all 4 tasks: redeploy the `app-improvements` branch (already the active deploy target) and manually verify — register a new trichology patient with full anamnesis filled in, confirm every field appears in the expediente's Tricología tab; register a dermatology patient with drugs/allergies/medications/sun-exposure/cosmetics filled in, confirm they appear; click an evolution photo thumbnail on an existing patient with session photos and confirm it opens full-size with a working close button.
