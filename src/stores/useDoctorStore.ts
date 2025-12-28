import { create } from 'zustand';
import type { DoctorSession } from '../types';
import { supabase } from '../lib/supabase';

interface DoctorStore {
  session: DoctorSession | null;
  login: (session: DoctorSession) => void;
  logout: () => void;
  isSessionValid: () => boolean;
  saveSession: (session: DoctorSession) => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useDoctorStore = create<DoctorStore>((set, get) => ({
  session: null,

  login: async (session: DoctorSession) => {
    const sessionData = {
      ...session,
      loginTime: Date.now(),
    };
    set({ session: sessionData });
    await get().saveSession(sessionData);
  },

  logout: async () => {
    const { session } = get();
    if (session?.id) {
      await supabase.from('doctor_sessions').delete().eq('id', session.id);
    }
    set({ session: null });
  },

  isSessionValid: () => {
    const { session } = get();
    if (!session) return false;

    const now = Date.now();
    const elapsed = now - session.loginTime;
    
    if (elapsed > session.sessionExpiry) {
      get().logout();
      return false;
    }

    return true;
  },

  saveSession: async (session: DoctorSession) => {
    try {
      await supabase.from('doctor_sessions').upsert({
        id: session.id,
        email: session.email,
        full_name: session.fullName,
        role: session.role,
        status: session.status,
        session_expiry: session.sessionExpiry,
        login_time: session.loginTime,
        expires_at: new Date(session.loginTime + session.sessionExpiry).toISOString(),
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  loadSession: async () => {
    try {
      const { data } = await supabase
        .from('doctor_sessions')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const session: DoctorSession = {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          role: data.role,
          status: data.status,
          sessionExpiry: data.session_expiry,
          loginTime: data.login_time,
        };

        // Check if still valid
        const now = Date.now();
        const elapsed = now - session.loginTime;
        
        if (elapsed <= session.sessionExpiry) {
          set({ session });
        } else {
          await get().logout();
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  },
}));
