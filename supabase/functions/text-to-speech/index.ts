import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Function to enhance text with natural pauses for better speech quality
function enhanceTextForSpeech(text: string, language: string): string {
  let enhanced = text;
  
  // Add slight pauses after punctuation for more natural speech
  enhanced = enhanced.replace(/([.!?])\s+/g, '$1 ... ');
  enhanced = enhanced.replace(/([,;:])\s+/g, '$1 .. ');
  
  // For Indian languages, add pauses after common conjunctions
  if (language === 'hi' || language === 'te' || language === 'kn') {
    // Add brief pauses for better clarity in complex sentences
    enhanced = enhanced.replace(/और\s+/g, 'और .. ');
    enhanced = enhanced.replace(/మరియు\s+/g, 'మరియు .. ');
    enhanced = enhanced.replace(/ಮತ್ತು\s+/g, 'ಮತ್ತು .. ');
  }
  
  return enhanced;
}

// Enhanced voice mapping optimized for each language with better quality settings
const VOICE_CONFIG: Record<string, { voice: string; speed: number; model: string; pitch?: number }> = {
  'en': { voice: 'nova', speed: 0.95, model: 'tts-1-hd' },      // Clear, professional female (slightly slower for clarity)
  'hi': { voice: 'onyx', speed: 0.82, model: 'tts-1-hd' },      // Deep, clear male voice (optimized for Hindi)
  'te': { voice: 'shimmer', speed: 0.78, model: 'tts-1-hd' },   // Warm female voice (slower for Telugu script)
  'kn': { voice: 'shimmer', speed: 0.78, model: 'tts-1-hd' },   // Warm female voice (slower for Kannada script)
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language = 'en' } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create a hash for caching
    const encoder = new TextEncoder();
    const data = encoder.encode(text + language);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const cacheKey = `${language}_${hashHex}.mp3`;

    console.log('TTS request - Language:', language, 'Cache key:', cacheKey);

    // Check if cached version exists
    const { data: existingFiles } = await supabaseAdmin.storage
      .from('audio-cache')
      .list('', { search: cacheKey });

    if (existingFiles && existingFiles.length > 0) {
      const { data: publicUrl } = supabaseAdmin.storage
        .from('audio-cache')
        .getPublicUrl(cacheKey);

      console.log('Cache hit - returning cached audio');
      return new Response(JSON.stringify({ audioUrl: publicUrl.publicUrl, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Cache miss - generating new audio with OnSpace AI');

    // Use OnSpace AI for high-quality TTS
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');

    if (!baseUrl || !apiKey) {
      console.log('OnSpace AI not configured - falling back to client TTS');
      return new Response(JSON.stringify({ 
        audioUrl: null, 
        useClientTTS: true,
        text,
        language 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get voice configuration for language
    const config = VOICE_CONFIG[language] || VOICE_CONFIG['en'];

    // Enhance text with SSML-like pauses for better natural speech
    const enhancedText = enhanceTextForSpeech(text, language);

    // Call OnSpace AI TTS endpoint with enhanced retry logic
    let ttsResponse;
    let retryCount = 0;
    const maxRetries = 3; // Increased retries for better reliability

    while (retryCount <= maxRetries) {
      try {
        ttsResponse = await fetch(`${baseUrl}/audio/speech`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            input: enhancedText,
            voice: config.voice,
            response_format: 'mp3',
            speed: config.speed,
          }),
        });

        if (ttsResponse.ok) break;
        
        if (retryCount < maxRetries) {
          console.log(`TTS attempt ${retryCount + 1} failed (status: ${ttsResponse.status}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount))); // Exponential backoff
        }
      } catch (err) {
        if (retryCount === maxRetries) throw err;
        console.log(`TTS attempt ${retryCount + 1} error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      }
      retryCount++;
    }

    if (!ttsResponse || !ttsResponse.ok) {
      const errorText = ttsResponse ? await ttsResponse.text() : 'No response';
      console.error('OnSpace AI TTS error after retries:', errorText);
      throw new Error(`TTS generation failed: ${errorText}`);
    }

    // Get audio data
    const audioBlob = await ttsResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Upload to storage bucket for caching
    const { error: uploadError } = await supabaseAdmin.storage
      .from('audio-cache')
      .upload(cacheKey, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to cache audio');
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from('audio-cache')
      .getPublicUrl(cacheKey);

    console.log('Audio generated and cached successfully');

    return new Response(JSON.stringify({ 
      audioUrl: publicUrl.publicUrl,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
