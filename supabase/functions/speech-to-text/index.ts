import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const LANGUAGE_CODES: Record<string, string> = {
  'en': 'en',
  'hi': 'hi',
  'te': 'te',
  'kn': 'kn',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const language = formData.get('language') as string || 'en';

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Audio file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('STT request - Language:', language, 'File size:', audioFile.size);

    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');

    if (!baseUrl || !apiKey) {
      throw new Error('OnSpace AI not configured');
    }

    // Prepare form data for OnSpace AI
    const aiFormData = new FormData();
    aiFormData.append('file', audioFile);
    aiFormData.append('model', 'whisper-1');
    aiFormData.append('language', LANGUAGE_CODES[language] || 'en');
    aiFormData.append('response_format', 'verbose_json'); // Get detailed info including confidence

    // Call OnSpace AI Speech-to-Text endpoint (OpenAI Whisper compatible)
    const sttResponse = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: aiFormData,
    });

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('OnSpace AI STT error:', errorText);
      throw new Error(`STT failed: ${errorText}`);
    }

    const result = await sttResponse.json();
    
    console.log('STT successful - Text length:', result.text?.length || 0);

    return new Response(JSON.stringify({
      text: result.text || '',
      language: result.language || language,
      confidence: result.segments?.[0]?.confidence || 0.9,
      duration: result.duration || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('STT error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Speech recognition failed',
        fallbackToBrowser: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
