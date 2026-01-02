import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Language name mapping for AI instruction
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi (हिन्दी)',
  'te': 'Telugu (తెలుగు)',
  'kn': 'Kannada (ಕನ್ನಡ)',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { medicineName, language = 'en' } = await req.json();

    if (!medicineName || medicineName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Medicine name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Medication info request:', { language, medicine: medicineName });

    const targetLanguage = LANGUAGE_INSTRUCTIONS[language] || 'English';
    
    const systemPrompt = `You are a pharmaceutical information assistant. You provide EDUCATIONAL INFORMATION ONLY about medicines.

🚨 CRITICAL SAFETY RULES:

1. INFORMATION ONLY - NOT MEDICAL ADVICE:
   - DO NOT diagnose conditions
   - DO NOT recommend the medicine to the user
   - DO NOT personalize dosage
   - DO NOT link the medicine to user symptoms
   - Use neutral phrases: "commonly used for", "often prescribed for"

2. OUTPUT LANGUAGE:
   - Write ALL content in ${targetLanguage} using ONLY its correct Unicode script
   - NO mixed scripts, NO English words (except medicine name if it's a brand name)

3. OUTPUT STRUCTURE (strict JSON format):
{
  "medicine_name": "Medicine name (keep original)",
  "overview": "Brief neutral description in ${targetLanguage}",
  "common_uses": "What this medicine is commonly prescribed for in ${targetLanguage}",
  "dosage_info": "MUST say: Follow the doctor's prescription or label instructions. DO NOT include mg values, timing, or frequency. Write in ${targetLanguage}",
  "side_effects": "List possible side effects in ${targetLanguage}",
  "warnings": "Safety warnings and precautions in ${targetLanguage}. If high-risk medicine, clearly highlight warnings.",
  "when_to_consult": "When to seek medical help in ${targetLanguage}",
  "disclaimer": "MUST include: This information is for educational purposes only and does not replace professional medical advice. Write in ${targetLanguage}"
}

4. UNKNOWN MEDICINES:
   - If medicine is unknown or unclear, respond safely:
   {
     "medicine_name": "[entered name]",
     "overview": "Unable to identify this medicine. Please verify the spelling or consult a pharmacist.",
     "common_uses": "Information not available",
     "dosage_info": "Consult a healthcare provider",
     "side_effects": "Information not available",
     "warnings": "Always consult a qualified healthcare provider before taking any medication",
     "when_to_consult": "Immediately - to verify the medicine and get proper guidance",
     "disclaimer": "This information is for educational purposes only and does not replace professional medical advice."
   }

5. NEVER:
   - Act as a doctor
   - Provide certainty or prescriptions
   - Include specific dosages (mg, ml, times per day)
   - Recommend starting or stopping medication
   - Diagnose based on symptoms

Remember: Safety over completeness. Clear, calm, professional language only.`;

    const aiResponse = await fetch(`${Deno.env.get('ONSPACE_AI_BASE_URL')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ONSPACE_AI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Language: ${targetLanguage}\nMedicine name: ${medicineName}\n\nProvide educational information about this medicine in ${targetLanguage} following ALL safety rules. If you don't recognize this medicine, respond safely as instructed.`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI raw response:', aiContent);

    // Parse AI response with validation
    let medicationInfo;
    try {
      // Remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      
      if (cleanContent.includes('```')) {
        const jsonMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          cleanContent = jsonMatch[1].trim();
        }
      }
      
      // Extract JSON object
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      medicationInfo = JSON.parse(cleanContent);
      
      // Validate required fields
      const requiredFields = ['medicine_name', 'overview', 'common_uses', 'dosage_info', 'side_effects', 'warnings', 'when_to_consult', 'disclaimer'];
      for (const field of requiredFields) {
        if (!medicationInfo[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Safety validation: ensure dosage_info doesn't contain specific dosages
      const dosageText = medicationInfo.dosage_info.toLowerCase();
      if (dosageText.match(/\d+\s*(mg|ml|tablets?|pills?|times?|hours?)/i)) {
        console.warn('Detected specific dosage in AI response, sanitizing...');
        medicationInfo.dosage_info = 'Follow the doctor\'s prescription or label instructions. Do not self-medicate.';
      }

      // Ensure disclaimer is present and appropriate
      if (!medicationInfo.disclaimer.toLowerCase().includes('educational') || 
          !medicationInfo.disclaimer.toLowerCase().includes('not replace')) {
        medicationInfo.disclaimer = 'This information is for educational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.';
      }
      
      console.log('Parsed and validated medication info:', medicationInfo);
      
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      console.error('Parse error:', e.message);
      
      // Safe fallback response
      medicationInfo = {
        medicine_name: medicineName,
        overview: 'Unable to retrieve information. Please verify the medicine name with a pharmacist.',
        common_uses: 'Information not available',
        dosage_info: 'Consult a healthcare provider for proper dosage instructions',
        side_effects: 'Consult a healthcare provider for side effect information',
        warnings: 'Always consult a qualified healthcare provider before taking any medication',
        when_to_consult: 'Consult a doctor or pharmacist for guidance on this medicine',
        disclaimer: 'This information is for educational purposes only and does not replace professional medical advice.',
      };
    }

    console.log('Medication info request completed successfully');

    return new Response(JSON.stringify(medicationInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Medication info error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to retrieve medication information' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
