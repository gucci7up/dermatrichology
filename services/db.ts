import { api } from './api';
import { Patient, DermHistory, TrichHistory, Session, LabResult, Treatment, AppointmentRequest, AppSettings, UserProfile, Prescription } from '../types';

export const DB = {
  settings: {
    get: async (): Promise<AppSettings> => {
      try {
        return await api<AppSettings>('/settings');
      } catch (e) {
        console.error('DB: Error fetching settings:', e);
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
    },
    save: async (settings: AppSettings) => {
      await api('/settings', { method: 'PUT', body: JSON.stringify(settings) });
      window.dispatchEvent(new Event('app-settings-changed'));
    }
  },

  profiles: {
    get: async (id: string): Promise<UserProfile | null> => {
      try {
        return await api<UserProfile>(`/profiles/${id}`);
      } catch (e) {
        console.error('DB: Error fetching profile:', e);
        throw e;
      }
    }
  },

  patients: {
    getAll: async (): Promise<Patient[]> => {
      try {
        const data = await api<Patient[]>('/patients');
        console.log('DB: Patients fetched:', data.length);
        return data;
      } catch (e) {
        console.error('DB: patient fetch failed', e);
        return [];
      }
    },
    getById: async (id: string): Promise<Patient | undefined> => {
      try {
        return await api<Patient>(`/patients/${id}`);
      } catch {
        return undefined;
      }
    },
    save: async (patient: Patient) => {
      await api('/patients', { method: 'POST', body: JSON.stringify(patient) });
    },
    delete: async (id: string) => {
      await api(`/patients/${id}`, { method: 'DELETE' });
    },
    update: async (id: string, patient: Partial<Patient>) => {
      await api(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(patient) });
    }
  },

  appointments: {
    getAll: async (): Promise<AppointmentRequest[]> => {
      return api<AppointmentRequest[]>('/appointments');
    },
    save: async (app: AppointmentRequest) => {
      await api('/appointments', { method: 'POST', body: JSON.stringify(app) });
    },
    updateStatus: async (id: string, estado: 'pendiente' | 'confirmada' | 'cancelada') => {
      await api(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) });
    }
  },

  derm: {
    getByPatient: async (pId: string): Promise<DermHistory[]> => {
      return api<DermHistory[]>(`/derm-histories?paciente_id=${pId}`);
    },
    save: async (history: DermHistory) => {
      await api('/derm-histories', { method: 'POST', body: JSON.stringify(history) });
    },
    update: async (id: string, history: Partial<DermHistory>) => {
      await api(`/derm-histories/${id}`, { method: 'PATCH', body: JSON.stringify(history) });
    }
  },

  trich: {
    getByPatient: async (pId: string): Promise<TrichHistory[]> => {
      return api<TrichHistory[]>(`/trich-histories?paciente_id=${pId}`);
    },
    save: async (history: TrichHistory) => {
      await api('/trich-histories', { method: 'POST', body: JSON.stringify(history) });
    },
    update: async (id: string, history: Partial<TrichHistory>) => {
      await api(`/trich-histories/${id}`, { method: 'PATCH', body: JSON.stringify(history) });
    }
  },

  sessions: {
    getByPatient: async (pId: string): Promise<Session[]> => {
      return api<Session[]>(`/sessions?paciente_id=${pId}`);
    },
    save: async (session: Session) => {
      await api('/sessions', { method: 'POST', body: JSON.stringify(session) });
    }
  },

  labs: {
    getByPatient: async (pId: string): Promise<LabResult[]> => {
      return api<LabResult[]>(`/labs?paciente_id=${pId}`);
    },
    save: async (lab: LabResult) => {
      await api('/labs', { method: 'POST', body: JSON.stringify(lab) });
    }
  },

  treatments: {
    getByPatient: async (pId: string): Promise<Treatment[]> => {
      return api<Treatment[]>(`/treatments?paciente_id=${pId}`);
    },
    save: async (treatment: Treatment) => {
      await api('/treatments', { method: 'POST', body: JSON.stringify(treatment) });
    }
  },

  prescriptions: {
    getByPatient: async (pId: string): Promise<Prescription[]> => {
      return api<Prescription[]>(`/prescriptions?paciente_id=${pId}`);
    },
    save: async (prescription: Partial<Prescription>) => {
      await api('/prescriptions', { method: 'POST', body: JSON.stringify(prescription) });
    },
    delete: async (id: string) => {
      await api(`/prescriptions/${id}`, { method: 'DELETE' });
    }
  }
};
