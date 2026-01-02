export type Language = 'en' | 'hi' | 'te' | 'kn';

export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface AnalysisResult {
  disease_category: string;
  severity: Severity;
  recommendation: string;
  reason?: string;
  safe_guidance?: string | null;
  is_override?: boolean;
}

export interface PatientQuery {
  id: string;
  symptoms_text: string;
  prescription_text?: string;
  disease_category?: string;
  severity?: string;
  recommendation?: string;
  reason?: string;
  language: string;
  created_at: string;
}

export interface DoctorNote {
  id: string;
  query_id: string;
  note: string;
  created_at: string;
}

export interface SafetyRule {
  id: string;
  keyword: string;
  category: string;
  severity: string;
  override_text: string;
}

export interface GuidanceContent {
  id: string;
  category: 'self-care' | 'consult' | 'emergency';
  language: Language;
  text: string;
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
};

export const LANGUAGE_CODES: Record<Language, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
};

export interface DoctorSession {
  id: string;
  email: string;
  fullName: string;
  role: 'doctor' | 'emergency_admin';
  status: string;
  sessionExpiry: number;
  loginTime: number;
}

export type PortalMode = 'symptom' | 'medication';

export interface MedicationInfo {
  medicine_name: string;
  overview: string;
  common_uses: string;
  dosage_info: string;
  side_effects: string;
  warnings: string;
  when_to_consult: string;
  disclaimer: string;
}
