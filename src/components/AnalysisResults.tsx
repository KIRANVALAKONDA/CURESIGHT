import { useState, useEffect } from 'react';
import { AlertTriangle, Activity, FileText, Stethoscope, PlayCircle, StopCircle, AlertCircle, Loader2, Shield, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useLanguageStore } from '../stores/useLanguageStore';
import { LANGUAGE_CODES, type AnalysisResult, type Severity } from '../types';
import { t } from '../lib/translations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface AnalysisResultsProps {
  result: AnalysisResult;
  onNewAnalysis: () => void;
}

const severityConfig: Record<Severity, {
  color: string;
  textColor: string;
  gradient: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  urgency: string;
}> = {
  LOW: {
    color: 'text-emerald-700',
    textColor: 'text-emerald-800',
    gradient: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />,
    urgency: 'low',
  },
  MODERATE: {
    color: 'text-amber-700',
    textColor: 'text-amber-800',
    gradient: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: <Activity className="w-8 h-8 sm:w-10 sm:h-10" />,
    urgency: 'moderate',
  },
  HIGH: {
    color: 'text-orange-700',
    textColor: 'text-orange-800',
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />,
    urgency: 'high',
  },
  CRITICAL: {
    color: 'text-red-700',
    textColor: 'text-red-900',
    gradient: 'from-red-600 to-rose-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    icon: <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />,
    urgency: 'critical',
  },
};

export function AnalysisResults({ result, onNewAnalysis }: AnalysisResultsProps) {
  const { language } = useLanguageStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  const config = severityConfig[result.severity];
  const isCritical = result.severity === 'CRITICAL';
  const isHighRisk = result.severity === 'HIGH' || result.severity === 'CRITICAL';

  // Get translated severity label
  const getSeverityLabel = (severity: Severity): string => {
    const severityKeys: Record<Severity, string> = {
      LOW: 'severityLow',
      MODERATE: 'severityModerate',
      HIGH: 'severityHigh',
      CRITICAL: 'severityCritical',
    };
    return t(severityKeys[severity], language);
  };

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
    parts.push(`${t('severityLevel', language)}: ${getSeverityLabel(result.severity)}.`);
    parts.push(`${t('recommendation', language)}: ${result.recommendation}.`);
    if (result.reason) {
      parts.push(`${t('explanation', language)}: ${result.reason}`);
    }
    if (result.safe_guidance) {
      parts.push(`${t('safeGuidance', language)}: ${result.safe_guidance}`);
    }
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
      {/* Enhanced Header with Animation */}
      <div className="text-center space-y-4 animate-bounce-in">
        <div className="inline-flex items-center gap-4 px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105">
          <Stethoscope className="w-8 h-8 sm:w-10 sm:h-10 text-white flex-shrink-0 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-lg">
            {t('medicalTriageResult', language)}
          </h2>
        </div>
        {isCritical && (
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-xl shadow-xl animate-pulse">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-lg font-bold">{t('urgentAction', language)}</span>
          </div>
        )}
      </div>

      {/* ENHANCED SEVERITY LEVEL - Most Prominent with Better Visual Hierarchy */}
      <Card className={`p-8 sm:p-10 md:p-12 border-4 shadow-3xl ${config.bgColor} ${config.borderColor} animate-bounce-in ${isCritical ? 'animate-pulse-glow' : ''} relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
        {/* Decorative gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
        
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-7 w-full sm:w-auto">
            <div className={`p-6 sm:p-7 md:p-8 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-2xl flex-shrink-0 transform group-hover:rotate-3 transition-transform duration-500`}>
              <div className="text-white">{config.icon}</div>
            </div>
            <div className="text-center sm:text-left space-y-2">
              <h3 className={`text-base sm:text-lg md:text-xl font-black uppercase tracking-widest mb-3 ${config.color} opacity-80`}>
                {t('severityLevel', language)}
              </h3>
              <p className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black ${config.color} leading-none drop-shadow-lg`} style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '1.3' : '1.1' }}>
                {getSeverityLabel(result.severity)}
              </p>
            </div>
          </div>
          {isHighRisk && (
            <div className="flex flex-col gap-2 items-center">
              <div className={`px-6 py-3 ${isCritical ? 'bg-red-600' : 'bg-orange-500'} text-white rounded-xl shadow-2xl text-center animate-pulse`}>
                <p className="text-base sm:text-lg font-black uppercase tracking-wide">{t('urgentAction', language)}</p>
              </div>
              <AlertCircle className={`w-10 h-10 ${isCritical ? 'text-red-600' : 'text-orange-600'} animate-bounce`} />
            </div>
          )}
        </div>
      </Card>

      {/* ENHANCED RECOMMENDATION Card with Better Styling */}
      <Card className={`p-7 sm:p-9 border-3 shadow-2xl ${isCritical ? 'bg-gradient-to-br from-red-50 to-rose-100 border-red-500' : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-400'} animate-slide-in-left hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group`}>
        {/* Decorative corner accent */}
        <div className={`absolute top-0 right-0 w-32 h-32 ${isCritical ? 'bg-red-500' : 'bg-blue-500'} opacity-10 rounded-bl-full`} />
        
        <div className="relative flex items-start gap-5 sm:gap-6">
          <div className={`p-4 sm:p-5 md:p-6 rounded-2xl shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500 ${isCritical ? 'bg-gradient-to-br from-red-600 via-rose-600 to-pink-600' : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'}`}>
            <Shield className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className={`text-lg sm:text-xl font-black uppercase tracking-wide ${isCritical ? 'text-red-900' : 'text-blue-900'} flex items-center gap-2`}>
              {t('recommendation', language)}
              <Activity className="w-5 h-5 animate-pulse" />
            </h3>
            <p className={`text-2xl sm:text-3xl md:text-4xl font-black leading-tight ${isCritical ? 'text-red-900' : 'text-blue-900'} drop-shadow-sm`} style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '1.5' : '1.2' }}>
              {result.recommendation}
            </p>
          </div>
        </div>
      </Card>

      {/* ENHANCED EXPLANATION Card with Expandable Content */}
      {result.reason && (
        <Card className="p-7 sm:p-9 bg-gradient-to-br from-slate-50 to-gray-100 border-3 border-slate-400 shadow-2xl animate-slide-in-right hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
          {/* Decorative corner */}
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-slate-400 opacity-5 rounded-tr-full" />
          
          <div className="relative flex items-start gap-5 sm:gap-6">
            <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-700 via-gray-700 to-zinc-700 shadow-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-500">
              <FileText className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
                {t('explanation', language)}
                <Activity className="w-5 h-5 text-slate-600" />
              </h3>
              <div className={`${!showFullExplanation && result.reason.length > 200 ? 'line-clamp-3' : ''}`}>
                <p className="text-lg sm:text-xl text-slate-800 leading-relaxed" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
                  {result.reason}
                </p>
              </div>
              {result.reason.length > 200 && (
                <button
                  onClick={() => setShowFullExplanation(!showFullExplanation)}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline"
                >
                  {showFullExplanation ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ENHANCED SAFE GUIDANCE Card (Only if not critical) */}
      {result.safe_guidance && !isCritical && (
        <Card className="p-7 sm:p-9 bg-gradient-to-br from-green-50 to-emerald-100 border-3 border-green-400 shadow-2xl animate-fade-in hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden group">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-green-500 opacity-10 rounded-br-full" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500 opacity-5 rounded-tl-full" />
          
          <div className="relative flex items-start gap-5 sm:gap-6">
            <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 shadow-2xl flex-shrink-0 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              <CheckCircle className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-green-900 flex items-center gap-2">
                {t('safeGuidance', language)}
                <Shield className="w-5 h-5 text-green-700" />
              </h3>
              <p className="text-lg sm:text-xl text-green-900 leading-relaxed font-medium" style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '2' : '1.7' }}>
                {result.safe_guidance}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Enhanced Action Buttons with Better Visual Hierarchy */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 animate-slide-up-fade">
        <Button
          onClick={speak}
          disabled={isLoadingAudio}
          size="lg"
          className={`h-16 sm:h-20 text-xl sm:text-2xl font-black rounded-2xl transition-all shadow-2xl hover:shadow-3xl w-full transform hover:scale-105 duration-500 border-3 border-white/30 ${
            isSpeaking 
              ? 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white animate-pulse' 
              : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white'
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
          onClick={onNewAnalysis}
          size="lg"
          className="h-16 sm:h-20 text-xl sm:text-2xl font-black rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-3xl w-full transform hover:scale-105 transition-all duration-500 border-3 border-white/30"
        >
          <Activity className="w-7 h-7 sm:w-8 sm:h-8 mr-3" />
          <span className="truncate">{t('newAnalysis', language)}</span>
        </Button>
      </div>

      {/* ENHANCED MEDICAL DISCLAIMER - Always Visible with Better Styling */}
      <Card className={`p-6 sm:p-8 border-4 shadow-2xl animate-fade-in hover:shadow-3xl transition-all duration-500 relative overflow-hidden ${isCritical ? 'bg-gradient-to-br from-red-100 to-rose-200 border-red-600' : 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-500'}`}>
        {/* Warning pattern background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 70px)', color: isCritical ? '#dc2626' : '#d97706' }} />
        </div>
        
        <div className="relative flex items-start gap-4 sm:gap-5">
          <AlertCircle className={`w-8 h-8 sm:w-10 sm:h-10 mt-1 flex-shrink-0 ${isCritical ? 'text-red-700 animate-pulse' : 'text-amber-700'}`} />
          <div className="flex-1 space-y-3">
            <p className={`text-base sm:text-lg md:text-xl font-black ${isCritical ? 'text-red-900' : 'text-amber-900'} flex items-center gap-2`}>
              ⚠️ {t('medicalDisclaimer', language)}
              <Shield className="w-5 h-5" />
            </p>
            <p className={`text-sm sm:text-base leading-relaxed font-medium ${isCritical ? 'text-red-800' : 'text-amber-800'}`} style={{ lineHeight: language === 'te' || language === 'kn' || language === 'hi' ? '1.9' : '1.6' }}>
              {t('disclaimerText', language)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
