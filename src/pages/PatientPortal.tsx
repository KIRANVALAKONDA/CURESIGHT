import { useState } from 'react';
import { Send, Stethoscope, ShieldCheck, Loader2, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { LanguageSelector } from '../components/LanguageSelector';
import { VoiceInput } from '../components/VoiceInput';
import { PrescriptionUpload } from '../components/PrescriptionUpload';
import { AnalysisResults } from '../components/AnalysisResults';
import { useLanguageStore } from '../stores/useLanguageStore';
import { LANGUAGE_NAMES } from '../types';
import { supabase } from '../lib/supabase';
import { t } from '../lib/translations';
import { toast } from 'sonner';
import type { AnalysisResult } from '../types';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

export function PatientPortal() {
  const [symptoms, setSymptoms] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { language } = useLanguageStore();

  const handleAnalyze = async () => {
    if (!symptoms.trim() && !prescriptionText.trim()) {
      toast.error(t('analysisError', language));
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('Analysis request:', { language, symptomsLength: symptoms.length });

      const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
        body: {
          symptoms: symptoms.trim(),
          prescriptionText: prescriptionText.trim(),
          language, // Strict language control - ensures AI output matches UI language
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

      console.log('Analysis successful:', data);
      setResult(data as AnalysisResult);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || t('analysisError', language));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewAnalysis = () => {
    setResult(null);
    setSymptoms('');
    setPrescriptionText('');
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <AnalysisResults result={result} onNewAnalysis={handleNewAnalysis} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 md:space-y-10">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-xl animate-pulse flex-shrink-0">
                <Stethoscope className="w-10 h-10 sm:w-12 md:w-16 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 bg-clip-text text-transparent drop-shadow-sm truncate">
                  {t('title', language)}
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-700 mt-1 sm:mt-2 font-medium line-clamp-2">
                  {t('subtitle', language)}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <LanguageSelector />
            </div>
          </div>

          {/* Active Language Indicator */}
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl border-2 border-blue-200">
            <Globe className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">
              {t('activeLanguage', language)}: <span className="text-purple-700">{LANGUAGE_NAMES[language]}</span>
            </span>
          </div>
        </div>

        {/* Main Card - Mobile Optimized */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-14 space-y-6 sm:space-y-8 md:space-y-10 animate-slide-up shadow-2xl border-2 border-white/50">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 break-words">
            {t('describeSymptoms', language)}
          </h2>

          {/* Symptoms Input - Mobile Optimized */}
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

          {/* Prescription Text - Mobile Optimized */}
          {prescriptionText && (
            <div className="p-5 sm:p-6 md:p-7 bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-lg border-3 border-blue-300 rounded-xl sm:rounded-2xl shadow-xl">
              <h3 className="text-lg sm:text-xl font-bold mb-3 flex items-center gap-2 sm:gap-3 text-blue-800 flex-wrap">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                <span className="break-words">Extracted Prescription Info</span>
              </h3>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed break-words">{prescriptionText}</p>
            </div>
          )}

          {/* Action Buttons - Mobile Optimized Vertical Stack */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            <VoiceInput onTranscript={(text) => setSymptoms((prev) => prev + ' ' + text)} />
            <PrescriptionUpload onExtractedText={setPrescriptionText} />
            <Button
              onClick={handleAnalyze}
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

        {/* Doctor Portal Link - Mobile Optimized */}
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
