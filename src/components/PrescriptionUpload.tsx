import { useState, useRef } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { useLanguageStore } from '../stores/useLanguageStore';
import { t } from '../lib/translations';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface PrescriptionUploadProps {
  onExtractedText: (text: string) => void;
}

export function PrescriptionUpload({ onExtractedText }: PrescriptionUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguageStore();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsProcessing(true);

    try {
      // Upload to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(uploadData.path);

      // Extract text using edge function
      const { data, error } = await supabase.functions.invoke('extract-prescription', {
        body: { imageUrl: urlData.publicUrl },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to extract text'}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.text) {
        onExtractedText(data.text);
        toast.success('Text extracted successfully');
      } else {
        throw new Error('No text extracted');
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast.error(error.message || 'Failed to extract text');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        size="lg"
        className="w-full h-20 text-xl font-semibold rounded-2xl bg-medical-gradient hover:scale-105 transition-all duration-300"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-8 h-8 mr-3 animate-spin" />
            {t('extracting', language)}
          </>
        ) : (
          <>
            <Camera className="w-8 h-8 mr-3" />
            {t('uploadPrescription', language)}
          </>
        )}
      </Button>
    </>
  );
}
