import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguageStore } from '../stores/useLanguageStore';
import { LANGUAGE_CODES } from '../types';
import { t } from '../lib/translations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { language } = useLanguageStore();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Setup browser speech recognition (fallback)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.maxAlternatives = 3;

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          onTranscript(finalTranscriptRef.current.trim());
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          toast.error('Voice input error: ' + event.error);
        }
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        if (isListening) {
          // Auto-restart if still listening (for continuous recording)
          try {
            recognitionInstance.start();
          } catch (e) {
            console.log('Recognition restart failed:', e);
            setIsListening(false);
          }
        }
      };

      recognitionRef.current = recognitionInstance;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening]);

  // Audio level visualization
  const updateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(100, average));

    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  // Setup audio recording with OnSpace AI STT
  const setupAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      updateAudioLevel();

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];

          // Convert to appropriate format and send to OnSpace AI
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          console.log('Sending audio to OnSpace AI STT...');

          const { data, error } = await supabase.functions.invoke('speech-to-text', {
            body: formData,
          });

          if (error) {
            let errorMessage = 'Speech recognition failed';
            if (error instanceof FunctionsHttpError) {
              try {
                const textContent = await error.context?.text();
                const errorData = textContent ? JSON.parse(textContent) : null;
                if (errorData?.fallbackToBrowser) {
                  console.log('Falling back to browser STT');
                  // Browser STT already captured via recognitionRef
                  toast.success('Voice input completed (browser mode)');
                  setIsProcessing(false);
                  return;
                }
                errorMessage = errorData?.error || textContent || errorMessage;
              } catch {}
            }
            throw new Error(errorMessage);
          }

          if (data?.text) {
            finalTranscriptRef.current = data.text;
            onTranscript(data.text);
            toast.success(`Voice input completed (confidence: ${Math.round((data.confidence || 0.9) * 100)}%)`);
          }
        } catch (error: any) {
          console.error('STT processing error:', error);
          toast.error(error.message || 'Failed to process audio');
          // Fallback to browser transcript if available
          if (finalTranscriptRef.current) {
            toast.info('Using browser speech recognition result');
          }
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
    } catch (error: any) {
      console.error('Audio setup error:', error);
      toast.error('Microphone access denied or not available');
      throw error;
    }
  };

  const toggleListening = async () => {
    if (isProcessing) return;

    if (isListening) {
      // Stop recording
      setIsListening(false);
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      setAudioLevel(0);
    } else {
      // Start recording
      finalTranscriptRef.current = '';
      audioChunksRef.current = [];
      setIsListening(true);
      
      try {
        // Start OnSpace AI recording
        await setupAudioRecording();
        
        // Also start browser recognition as backup
        if (recognitionRef.current) {
          recognitionRef.current.lang = LANGUAGE_CODES[language];
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Browser recognition start failed:', e);
          }
        }
        
        toast.success(t('listening', language) + ' - Speak now...', {
          icon: '🎤',
          duration: 2000,
        });
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsListening(false);
        toast.error('Failed to start voice input');
      }
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={toggleListening}
        disabled={isProcessing}
        size="lg"
        className={`w-full h-20 text-xl font-semibold rounded-2xl transition-all duration-300 relative overflow-hidden ${
          isProcessing
            ? 'bg-blue-400 cursor-wait'
            : isListening
            ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 animate-pulse'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:scale-105'
        }`}
      >
        {/* Audio level indicator */}
        {isListening && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all duration-100"
            style={{ width: `${audioLevel}%` }}
          />
        )}
        
        {isProcessing ? (
          <>
            <Loader2 className="w-8 h-8 mr-3 animate-spin" />
            {t('processing', language)}
          </>
        ) : isListening ? (
          <>
            <MicOff className="w-8 h-8 mr-3 animate-pulse" />
            <span className="flex items-center gap-2">
              {t('listening', language)}
              <Volume2 className="w-5 h-5 animate-bounce" />
            </span>
          </>
        ) : (
          <>
            <Mic className="w-8 h-8 mr-3" />
            {t('voiceInput', language)}
          </>
        )}
      </Button>
      
      {isListening && (
        <p className="text-center text-sm text-slate-600 animate-fade-in">
          🎙️ Recording... Tap again to stop
        </p>
      )}
    </div>
  );
}
