import { useState } from 'react';
import { Send, Stethoscope, ShieldCheck, Loader2, Globe, Pill } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { LanguageSelector } from '../components/LanguageSelector';
import { VoiceInput } from '../components/VoiceInput';
import { PrescriptionUpload } from '../components/PrescriptionUpload';
import { AnalysisResults } from '../components/AnalysisResults';
import { MedicationResults } from '../components/MedicationResults';
import { useLanguageStore } from '../stores/useLanguageStore';
import { LANGUAGE_NAMES } from '../types';
import { supabase } from '../lib/supabase';
import { t } from '../lib/translations';
import { toast } from 'sonner';
import type { AnalysisResult, MedicationInfo, PortalMode } from '../types';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

export function PatientPortal() {
  const [mode, setMode] = useState<PortalMode>('symptom');
  const [symptoms, setSymptoms] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [symptomResult, setSymptomResult] = useState<AnalysisResult | null>(null);
  const [medicationResult, setMedicationResult] = useState<MedicationInfo | null>(null);
  const { language } = useLanguageStore();

  const handleSymptomAnalyze = async () => {
    if (!symptoms.trim() && !prescriptionText.trim()) {
      toast.error(t('analysisError', language));
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('Symptom analysis request:', { language, symptomsLength: symptoms.length });

      const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
        body: {
          symptoms: symptoms.trim(),
          prescriptionText: prescriptionText.trim(),
          language,
        },
      });

      if (error) {
        let errorMessage = t('analysisError', language);
        console.error('Analysis error:', error);
        
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            console.error('Error details:', { statusCode, textContent });
            errorMessage = textContent || errorMessage;
          } catch (parseError) {
            console.error('Error parsing failed:', parseError);
          }
        }
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error(t('analysisError', language));
      }

      console.log('Symptom analysis successful:', data);
      setSymptomResult(data as AnalysisResult);
    } catch (error: any) {
      console.error('Symptom analysis error:', error);
      toast.error(error.message || t('analysisError', language));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMedicationInfo = async () => {
    if (!medicineName.trim()) {
      toast.error(t('medicationInfoError', language));
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('Medication info request:', { language, medicine: medicineName });

      const { data, error } = await supabase.functions.invoke('medication-info', {
        body: {
          medicineName: medicineName.trim(),
          language,
        },
      });

      if (error) {
        let errorMessage = t('medicationInfoError', language);
        console.error('Medication info error:', error);
        
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            console.error('Error details:', { statusCode, textContent });
            errorMessage = textContent || errorMessage;
          } catch (parseError) {
            console.error('Error parsing failed:', parseError);
          }
        }
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error(t('medicationInfoError', language));
      }

      console.log('Medication info successful:', data);
      setMedicationResult(data as MedicationInfo);
    } catch (error: any) {
      console.error('Medication info error:', error);
      toast.error(error.message || t('medicationInfoError', language));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewAnalysis = () => {
    setSymptomResult(null);
    setMedicationResult(null);
    setSymptoms('');
    setMedicineName('');
    setPrescriptionText('');
  };

  const handleModeChange = (newMode: PortalMode) => {
    // Strict mode separation - clear all inputs when switching
    setMode(newMode);
    setSymptoms('');
    setMedicineName('');
    setPrescriptionText('');
    setSymptomResult(null);
    setMedicationResult(null);
  };

  // Show results if available
  if (symptomResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <AnalysisResults result={symptomResult} onNewAnalysis={handleNewAnalysis} />
        </div>
      </div>
    );
  }

  if (medicationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <MedicationResults result={medicationResult} onNewSearch={handleNewAnalysis} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 via-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 md:space-y-10 relative z-10">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-2xl animate-float flex-shrink-0 transform hover:scale-110 transition-transform duration-500">
                <Stethoscope className="w-10 h-10 sm:w-12 md:w-16 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 bg-clip-text text-transparent drop-shadow-sm">
                  {t('title', language)}
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-700 mt-1 sm:mt-2 font-medium">
                  {t('subtitle', language)}
                </p>
              </div>
            </div>
            <LanguageSelector />
          </div>

          {/* MODE TOGGLE - Most Prominent */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-white/50 hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => handleModeChange('symptom')}
                className={`h-16 sm:h-20 rounded-xl sm:rounded-2xl font-black text-lg sm:text-xl transition-all duration-500 transform hover:scale-105 border-3 ${
                  mode === 'symptom'
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl border-white/30 scale-105'
                    : 'bg-white/60 text-slate-700 border-slate-300 hover:bg-white/80'
                }`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
                  <span className="truncate">{t('symptomCheck', language)}</span>
                </div>
              </button>
              <button
                onClick={() => handleModeChange('medication')}
                className={`h-16 sm:h-20 rounded-xl sm:rounded-2xl font-black text-lg sm:text-xl transition-all duration-500 transform hover:scale-105 border-3 ${
                  mode === 'medication'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl border-white/30 scale-105'
                    : 'bg-white/60 text-slate-700 border-slate-300 hover:bg-white/80'
                }`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <Pill className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
                  <span className="truncate">{t('medicationGuide', language)}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* SYMPTOM CHECK MODE */}
        {mode === 'symptom' && (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-14 space-y-6 sm:space-y-8 md:space-y-10 animate-slide-up shadow-2xl border-2 border-white/50 hover:shadow-3xl transition-all duration-500">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 break-words">
              {t('describeSymptoms', language)}
            </h2>

            {/* Symptoms Input */}
            <div className="space-y-3 sm:space-y-4">
              <Textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={t('placeholder', language)}
                className="min-h-[180px] sm:min-h-[200px] md:min-h-[240px] text-base sm:text-lg md:text-xl p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl resize-none border-3 border-blue-200 focus:border-blue-500 shadow-inner bg-white/80 leading-relaxed"
                style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '1.8' : '1.5' }}
              />
              <div className="text-right text-sm sm:text-base text-slate-600 font-medium">
                {symptoms.length} {t('characters', language)}
              </div>
            </div>

            {/* Prescription Text */}
            {prescriptionText && (
              <div className="p-5 sm:p-6 md:p-7 bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-lg border-3 border-blue-300 rounded-xl sm:rounded-2xl shadow-xl">
                <h3 className="text-lg sm:text-xl font-bold mb-3 flex items-center gap-2 sm:gap-3 text-blue-800 flex-wrap">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <span className="break-words">Extracted Prescription Info</span>
                </h3>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed break-words">{prescriptionText}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              <VoiceInput onTranscript={(text) => setSymptoms((prev) => prev + ' ' + text)} />
              <PrescriptionUpload onExtractedText={setPrescriptionText} />
              <Button
                onClick={handleSymptomAnalyze}
                disabled={isAnalyzing}
                size="lg"
                className="h-20 sm:h-24 text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl border-2 border-white/30 w-full touch-manipulation"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 mr-3 sm:mr-4 animate-spin flex-shrink-0" />
                    <span className="truncate">{t('analyzing', language)}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-8 h-8 sm:w-10 sm:h-10 mr-3 sm:mr-4 flex-shrink-0" />
                    <span className="truncate">{t('analyze', language)}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* MEDICATION GUIDE MODE */}
        {mode === 'medication' && (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-14 space-y-6 sm:space-y-8 md:space-y-10 animate-slide-up shadow-2xl border-2 border-white/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 hover:shadow-3xl transition-all duration-500">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 break-words">
              {t('enterMedicineName', language)}
            </h2>

            {/* Medicine Name Input */}
            <div className="space-y-3 sm:space-y-4">
              <Input
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                placeholder={t('medicineNamePlaceholder', language)}
                className="h-16 sm:h-20 text-lg sm:text-xl md:text-2xl px-6 sm:px-8 rounded-xl sm:rounded-2xl border-3 border-emerald-300 focus:border-emerald-500 shadow-inner bg-white/80"
                style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '1.8' : '1.5' }}
              />
              <div className="text-right text-sm sm:text-base text-slate-600 font-medium">
                {medicineName.length} {t('characters', language)}
              </div>
            </div>

            {/* Info Notice */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-3 border-amber-300 rounded-xl sm:rounded-2xl shadow-xl">
              <div className="flex items-start gap-3 sm:gap-4">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-base sm:text-lg text-amber-900 font-bold mb-2">
                    ⚠️ {t('educationalDisclaimer', language)}
                  </p>
                  <p className="text-sm sm:text-base text-amber-800 leading-relaxed">
                    {t('disclaimerText', language)}
                  </p>
                </div>
              </div>
            </div>

            {/* Get Info Button */}
            <Button
              onClick={handleMedicationInfo}
              disabled={isAnalyzing}
              size="lg"
              className="h-20 sm:h-24 text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl border-2 border-white/30 w-full touch-manipulation"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 mr-3 sm:mr-4 animate-spin flex-shrink-0" />
                  <span className="truncate">{t('gettingInfo', language)}</span>
                </>
              ) : (
                <>
                  <Pill className="w-8 h-8 sm:w-10 sm:h-10 mr-3 sm:mr-4 flex-shrink-0" />
                  <span className="truncate">{t('getMedicineInfo', language)}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Doctor Portal Link */}
        <div className="text-center animate-fade-in">
          <Link to="/doctor" className="inline-block w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg sm:text-xl h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl border-2 bg-white/60 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto touch-manipulation"
            >
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="truncate">{t('doctorPortal', language)}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
