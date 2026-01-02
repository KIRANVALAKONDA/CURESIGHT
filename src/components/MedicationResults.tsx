import { useState, useEffect } from 'react';
import { AlertCircle, Pill, Activity, Shield, AlertTriangle, CheckCircle, Info, PlayCircle, StopCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useLanguageStore } from '../stores/useLanguageStore';
import { LANGUAGE_CODES } from '../types';
import { t } from '../lib/translations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { MedicationInfo } from '../types';

interface MedicationResultsProps {
  result: MedicationInfo;
  onNewSearch: () => void;
}

export function MedicationResults({ result, onNewSearch }: MedicationResultsProps) {
  const { language } = useLanguageStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      window.speechSynthesis.cancel();
    };
  }, [audio]);

  const generateSpeechText = () => {
    const parts = [];
    parts.push(`${t('medicineOverview', language)}: ${result.overview}.`);
    parts.push(`${t('commonUses', language)}: ${result.common_uses}.`);
    parts.push(`${t('possibleSideEffects', language)}: ${result.side_effects}.`);
    return parts.join(' ');
  };

  const speak = async () => {
    if (isSpeaking) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsLoadingAudio(true);
    setIsSpeaking(true);

    try {
      const speechText = generateSpeechText();
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: speechText, language },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            errorMessage = textContent || error.message;
          } catch {}
        }
        throw new Error(errorMessage);
      }

      if (data?.audioUrl) {
        const newAudio = new Audio(data.audioUrl);
        newAudio.onended = () => setIsSpeaking(false);
        newAudio.onerror = () => {
          setIsSpeaking(false);
          toast.error(t('audioPlaybackFailed', language));
        };
        newAudio.oncanplaythrough = () => setIsLoadingAudio(false);
        setAudio(newAudio);
        await newAudio.play();
      } else {
        setIsLoadingAudio(false);
        useBrowserTTS(speechText);
      }
    } catch (error: any) {
      setIsLoadingAudio(false);
      useBrowserTTS(generateSpeechText());
    }
  };

  const useBrowserTTS = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE_CODES[language];
    utterance.rate = 0.85;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error(t('speechFailed', language));
    };
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 animate-slide-up-fade">
      {/* Header */}
      <div className="text-center space-y-4 animate-bounce-in">
        <div className="inline-flex items-center gap-4 px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105">
          <Pill className="w-8 h-8 sm:w-10 sm:h-10 text-white flex-shrink-0 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-lg">
            {t('medicineInfoResult', language)}
          </h2>
        </div>
      </div>

      {/* Medicine Name - Most Prominent */}
      <Card className="p-8 sm:p-10 md:p-12 border-4 shadow-3xl bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-400 animate-bounce-in relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500 opacity-5 group-hover:opacity-10 transition-opacity duration-500" />
        
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-7 w-full sm:w-auto">
            <div className="p-6 sm:p-7 md:p-8 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 shadow-2xl flex-shrink-0 transform group-hover:rotate-3 transition-transform duration-500">
              <Pill className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <div className="text-center sm:text-left space-y-2">
              <h3 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-widest mb-3 text-teal-700 opacity-80">
                {t('medicineOverview', language)}
              </h3>
              <p className="text-4xl sm:text-5xl md:text-6xl font-black text-teal-900 leading-none drop-shadow-lg break-words">
                {result.medicine_name}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Overview */}
      <Card className="p-7 sm:p-9 bg-gradient-to-br from-slate-50 to-gray-100 border-3 border-slate-400 shadow-2xl animate-slide-in-left hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-slate-400 opacity-5 rounded-tr-full" />
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-700 to-gray-700 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500">
            <Info className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
              {t('medicineOverview', language)}
            </h3>
            <p className="text-lg sm:text-xl text-slate-800 leading-relaxed" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
              {result.overview}
            </p>
          </div>
        </div>
      </Card>

      {/* Common Uses */}
      <Card className="p-7 sm:p-9 bg-gradient-to-br from-blue-50 to-indigo-100 border-3 border-blue-400 shadow-2xl animate-slide-in-right hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-bl-full" />
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500">
            <CheckCircle className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-blue-900">
              {t('commonUses', language)}
            </h3>
            <p className="text-lg sm:text-xl text-blue-900 leading-relaxed" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
              {result.common_uses}
            </p>
          </div>
        </div>
      </Card>

      {/* Dosage Info */}
      <Card className="p-7 sm:p-9 bg-gradient-to-br from-purple-50 to-pink-100 border-3 border-purple-400 shadow-2xl animate-slide-in-left hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500 opacity-5 rounded-tl-full" />
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500">
            <Activity className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-purple-900">
              {t('generalDosageInfo', language)}
            </h3>
            <p className="text-lg sm:text-xl text-purple-900 leading-relaxed font-medium" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
              {result.dosage_info}
            </p>
          </div>
        </div>
      </Card>

      {/* Side Effects */}
      <Card className="p-7 sm:p-9 bg-gradient-to-br from-orange-50 to-amber-100 border-3 border-orange-400 shadow-2xl animate-slide-in-right hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500 opacity-10 rounded-br-full" />
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500">
            <AlertCircle className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-orange-900">
              {t('possibleSideEffects', language)}
            </h3>
            <p className="text-lg sm:text-xl text-orange-900 leading-relaxed" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
              {result.side_effects}
            </p>
          </div>
        </div>
      </Card>

      {/* Warnings */}
      <Card className="p-7 sm:p-9 bg-gradient-to-br from-red-50 to-rose-100 border-3 border-red-500 shadow-2xl animate-fade-in hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 70px)', color: '#dc2626' }} />
        </div>
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500 animate-pulse">
            <AlertTriangle className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-red-900 flex items-center gap-2">
              {t('warningsAndPrecautions', language)}
              <Shield className="w-5 h-5" />
            </h3>
            <p className="text-lg sm:text-xl text-red-900 leading-relaxed font-medium" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
              {result.warnings}
            </p>
          </div>
        </div>
      </Card>

      {/* When to Consult */}
      <Card className="p-7 sm:p-9 bg-gradient-to-br from-green-50 to-emerald-100 border-3 border-green-400 shadow-2xl animate-slide-in-left hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-500 opacity-5 rounded-tr-full" />
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500">
            <Shield className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-green-900">
              {t('whenToConsultDoctor', language)}
            </h3>
            <p className="text-lg sm:text-xl text-green-900 leading-relaxed font-medium" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
              {result.when_to_consult}
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 animate-slide-up-fade">
        <Button
          onClick={speak}
          disabled={isLoadingAudio}
          size="lg"
          className={`h-16 sm:h-20 text-xl sm:text-2xl font-black rounded-2xl transition-all shadow-2xl hover:shadow-3xl w-full transform hover:scale-105 duration-500 border-3 border-white/30 ${
            isSpeaking 
              ? 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white animate-pulse' 
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white'
          }`}
        >
          {isLoadingAudio ? (
            <>
              <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 mr-3 animate-spin" />
              <span className="truncate">{t('loadingAudio', language)}</span>
            </>
          ) : isSpeaking ? (
            <>
              <StopCircle className="w-7 h-7 sm:w-8 sm:h-8 mr-3" />
              <span className="truncate">{t('stopSpeaking', language)}</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-7 h-7 sm:w-8 sm:h-8 mr-3" />
              <span className="truncate">{t('speakResults', language)}</span>
            </>
          )}
        </Button>
        <Button
          onClick={onNewSearch}
          size="lg"
          className="h-16 sm:h-20 text-xl sm:text-2xl font-black rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-2xl hover:shadow-3xl w-full transform hover:scale-105 transition-all duration-500 border-3 border-white/30"
        >
          <Activity className="w-7 h-7 sm:w-8 sm:h-8 mr-3" />
          <span className="truncate">{t('newAnalysis', language)}</span>
        </Button>
      </div>

      {/* MANDATORY DISCLAIMER */}
      <Card className="p-6 sm:p-8 border-4 shadow-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-500 animate-fade-in hover:shadow-3xl transition-all duration-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 70px)', color: '#d97706' }} />
        </div>
        
        <div className="relative flex items-start gap-4 sm:gap-5">
          <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 mt-1 flex-shrink-0 text-amber-700" />
          <div className="flex-1 space-y-3">
            <p className="text-base sm:text-lg md:text-xl font-black text-amber-900 flex items-center gap-2">
              ⚠️ {t('educationalDisclaimer', language)}
              <Shield className="w-5 h-5" />
            </p>
            <p className="text-sm sm:text-base leading-relaxed font-medium text-amber-800" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '1.9' : '1.6' }}>
              {result.disclaimer}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
