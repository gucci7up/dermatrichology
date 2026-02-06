import { supabase } from './supabase';
import { Patient, DermHistory, TrichHistory, Session, LabResult, Treatment, AppointmentRequest, AppSettings, UserProfile, Prescription } from '../types';

// AppSettings imported from ../types

// Helper to map Supabase response to our types if needed
// For now, assuming table column names match TS interface exactly (snake_case)


const withTimeout = <T>(promise: Promise<T>, ms: number = 2000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), ms))
  ]);
};

export const DB = {
  settings: {
    get: async (): Promise<AppSettings> => {
      const { data, error } = await withTimeout(supabase.from('settings').select('*').limit(1).single());

      if (error || !data) {
        // Return default defaults if no row found
        return {
          app_name: 'DermaTrich',
          logo_url: '',
          logo_width: 220,
          logo_height: 100,
          doctor_name: 'Dr. Alejandro Pérez',
          doctor_profession: 'Dermatólogo-Tricólogo',
          doctor_photo_url: ''
        };
      }
      return data as AppSettings;
    },
    save: async (settings: AppSettings) => {
      // Upsert based on a fixed ID or logic. 
      // Since we usually have one row, we can try to fetch first.
      // But for simplicity, let's assume we want to update the first row found or insert one.
      // Ideally, the table should have a singleton constraint, but we'll manage via code.

      const existing = await DB.settings.get();
      const payload = { ...settings, updated_at: new Date().toISOString() };

      if (existing.id) {
        const { error } = await withTimeout(supabase.from('settings').update(payload).eq('id', existing.id));
        if (error) throw error;
      } else {
        const { error } = await withTimeout(supabase.from('settings').insert(payload));
        if (error) throw error;
      }
      window.dispatchEvent(new Event('app-settings-changed'));
    }
  },

  profiles: {
    get: async (id: string): Promise<UserProfile | null> => {
      try {
        const { data, error } = await withTimeout(supabase.from('profiles').select('*').eq('id', id).single());
        if (error) {
          console.error("DB: Error fetching profile:", error);
          // Don't return null immediately if error might be RLS? 
          // Actually better to throw so AuthContext handles it.
          throw error;
        }
        return data as UserProfile;
      } catch (e) {
        console.error("DB: Catch in profiles.get:", e);
        throw e;
      }
    }
  },

  patients: {
    getAll: async (): Promise<Patient[]> => {
      try {
        const { data, error } = await withTimeout(supabase.from('patients').select('*').order('created_at', { ascending: false }));
        if (error) {
          console.error("DB: Error fetching patients:", error);
          throw error;
        }
        console.log("DB: Patients fetched:", data?.length);
        return data as Patient[];
      } catch (e) {
        console.error("DB: patient fetch failed", e);
        return [];
      }
    },
    getById: async (id: string): Promise<Patient | undefined> => {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
      if (error) return undefined;
      return data as Patient;
    },
    save: async (patient: Patient) => {
      // Upsert: Create or Update based on ID
      // If ID is local mock ID (simple string), Supabase might want UUID.
      // For migration, we might let Supabase generate UUIDs if ID is missing.
      // But our type has ID. Let's try upsert.
      const { error } = await supabase.from('patients').upsert(patient);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
    },
    update: async (id: string, patient: Partial<Patient>) => {
      const { error } = await supabase.from('patients').update(patient).eq('id', id);
      if (error) throw error;
    }
  },

  appointments: {
    getAll: async (): Promise<AppointmentRequest[]> => {
      const { data, error } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as AppointmentRequest[];
    },
    save: async (app: AppointmentRequest) => {
      const { error } = await supabase.from('appointments').insert(app);
      if (error) throw error;
    }
  },

  derm: {
    getByPatient: async (pId: string): Promise<DermHistory[]> => {
      const { data, error } = await supabase.from('derm_histories').select('*').eq('paciente_id', pId);
      if (error) throw error;
      return data as DermHistory[];
    },
    save: async (history: DermHistory) => {
      const { error } = await supabase.from('derm_histories').insert(history);
      if (error) throw error;
    },
    update: async (id: string, history: Partial<DermHistory>) => {
      const { error } = await supabase.from('derm_histories').update(history).eq('id', id);
      if (error) throw error;
    }
  },

  trich: {
    getByPatient: async (pId: string): Promise<TrichHistory[]> => {
      const { data, error } = await supabase.from('trich_histories').select('*').eq('paciente_id', pId);
      if (error) throw error;
      return data as TrichHistory[];
    },
    save: async (history: TrichHistory) => {
      const { error } = await supabase.from('trich_histories').insert(history);
      if (error) throw error;
    },
    update: async (id: string, history: Partial<TrichHistory>) => {
      const { error } = await supabase.from('trich_histories').update(history).eq('id', id);
      if (error) throw error;
    }
  },

  sessions: {
    getByPatient: async (pId: string): Promise<Session[]> => {
      const { data, error } = await supabase.from('sessions').select('*').eq('paciente_id', pId).order('fecha', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    save: async (session: Session) => {
      const { error } = await supabase.from('sessions').insert(session);
      if (error) throw error;
    }
  },

  labs: {
    getByPatient: async (pId: string): Promise<LabResult[]> => {
      const { data, error } = await supabase.from('labs').select('*').eq('paciente_id', pId);
      if (error) throw error;
      return data as LabResult[];
    },
    save: async (lab: LabResult) => {
      const { error } = await supabase.from('labs').insert(lab);
      if (error) throw error;
    }
  },

  treatments: {
    getByPatient: async (pId: string): Promise<Treatment[]> => {
      const { data, error } = await supabase.from('treatments').select('*').eq('paciente_id', pId);
      if (error) throw error;
      return data as Treatment[];
    },
    save: async (treatment: Treatment) => {
      const { error } = await supabase.from('treatments').insert(treatment);
      if (error) throw error;
    }
  },

  prescriptions: {
    getByPatient: async (pId: string): Promise<Prescription[]> => {
      const { data, error } = await supabase.from('prescriptions').select('*').eq('paciente_id', pId).order('fecha', { ascending: false });
      if (error) throw error;
      return data as Prescription[];
    },
    save: async (prescription: Partial<Prescription>) => {
      // Remove id if empty string to let DB generate it, or handle partials
      const { error } = await supabase.from('prescriptions').insert(prescription);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('prescriptions').delete().eq('id', id);
      if (error) throw error;
    }
  }
};
