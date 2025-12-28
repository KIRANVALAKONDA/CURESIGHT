import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Language name mapping for AI instruction
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi (हिन्दी)',
  'te': 'Telugu (తెలుగు)',
  'kn': 'Kannada (ಕನ್ನಡ)',
};

// Approved medication whitelist (generic OTC only)
const APPROVED_MEDICATIONS = [
  'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin',
  'antacid', 'oral rehydration solution', 'ORS',
  'saline nasal spray', 'cough syrup', 'lozenges',
  'antihistamine', 'vitamin C', 'zinc supplement'
];

// Prohibited categories that must never be recommended
const PROHIBITED_MEDICATION_TYPES = [
  'antibiotic', 'steroid', 'injection', 'insulin',
  'controlled substance', 'prescription drug', 'narcotic',
  'immunosuppressant', 'chemotherapy', 'antiviral prescription'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, language = 'en', prescriptionText = '' } = await req.json();

    if (!symptoms || symptoms.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Symptoms text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis request:', { language, symptomsLength: symptoms.length });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get safety rules
    const { data: rules } = await supabaseClient
      .from('safety_rules')
      .select('*');

    // Check for dangerous keywords
    const fullText = `${symptoms} ${prescriptionText}`.toLowerCase();
    const matchedRule = rules?.find(rule => fullText.includes(rule.keyword.toLowerCase()));

    if (matchedRule) {
      // Override with CRITICAL emergency response
      const { data: guidanceData } = await supabaseClient
        .from('guidance_content')
        .select('text')
        .eq('category', 'emergency')
        .eq('language', language)
        .single();

      const result = {
        disease_category: matchedRule.category,
        severity: 'CRITICAL',
        recommendation: 'Emergency medical attention',
        reason: guidanceData?.text || matchedRule.override_text,
        safe_guidance: null, // No home remedies for critical cases
        is_override: true,
      };

      // Log the query
      await supabaseClient.from('patient_queries').insert({
        symptoms_text: symptoms,
        prescription_text: prescriptionText || null,
        disease_category: result.disease_category,
        severity: result.severity,
        recommendation: result.recommendation,
        reason: result.reason,
        language,
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use OnSpace AI for analysis with strict safety rules
    const targetLanguage = LANGUAGE_INSTRUCTIONS[language] || 'English';
    
    const systemPrompt = `You are a medical triage AI assistant. You MUST respond ONLY in ${targetLanguage} language using ONLY its correct Unicode script.

🚨 CRITICAL SAFETY RULES:

1. SEVERITY LEVELS (use EXACT English keywords):
   - LOW: Minor symptoms, self-care appropriate
   - MODERATE: Concerning symptoms, may need consultation
   - HIGH: Serious symptoms, should consult doctor soon
   - CRITICAL: Life-threatening, requires immediate emergency care

2. RECOMMENDATION STRUCTURE:
   - For LOW: "Self-care" + simple home measures
   - For MODERATE: "Consult a doctor" + when to seek help
   - For HIGH: "Consult a doctor urgently" + clear timeline
   - For CRITICAL: "Emergency medical attention" + urgency emphasized

3. MEDICATION SAFETY RULES:
   ❌ NEVER recommend: antibiotics, steroids, injections, controlled substances, prescription drugs
   ✅ ONLY mention if in approved list: ${APPROVED_MEDICATIONS.join(', ')}
   ⚠️ If medication needed but not in approved list: Say "Consult a doctor for appropriate medication"
   🚫 NEVER invent drug names or dosages

4. CRITICAL SEVERITY MANDATORY RULES:
   - If CRITICAL: MUST say "Emergency medical attention" in recommendation
   - If CRITICAL: MUST emphasize urgency clearly
   - If CRITICAL: NO home remedies allowed in safe_guidance

5. LANGUAGE PURITY:
   - Write ALL fields in ${targetLanguage} using ONLY its correct Unicode script
   - NO mixed scripts, NO English words (except severity level)
   - disease_category, reason, recommendation, safe_guidance: ALL in ${targetLanguage}

6. OUTPUT STRUCTURE (JSON only):
{
  "disease_category": "Medical category in ${targetLanguage}",
  "severity": "LOW|MODERATE|HIGH|CRITICAL",
  "recommendation": "Action in ${targetLanguage}",
  "reason": "Simple non-diagnostic explanation in ${targetLanguage}",
  "safe_guidance": "Calm, safe advice in ${targetLanguage} OR null if CRITICAL"
}

Remember:
- Be calm and trustworthy, never cause panic
- Never diagnose diseases, only suggest triage level
- Prioritize patient safety above all
- When in doubt, recommend consulting a doctor`;

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
            content: `Language: ${targetLanguage}\nSymptoms: ${symptoms}\n${prescriptionText ? `Prescription medications mentioned: ${prescriptionText}` : ''}\n\nProvide a safe medical triage response in ${targetLanguage} following ALL safety rules.`
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent safety
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

    // Parse AI response with strict validation
    let analysisResult;
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
      
      analysisResult = JSON.parse(cleanContent);
      
      // Validate required fields
      if (!analysisResult.disease_category || !analysisResult.severity || !analysisResult.recommendation) {
        throw new Error('Missing required fields in AI response');
      }
      
      // Normalize severity to uppercase
      analysisResult.severity = analysisResult.severity.toUpperCase();
      
      // Validate severity value
      const validSeverities = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
      if (!validSeverities.includes(analysisResult.severity)) {
        console.warn('Invalid severity from AI:', analysisResult.severity, 'defaulting to MODERATE');
        analysisResult.severity = 'MODERATE';
      }

      // CRITICAL safety check: if CRITICAL, enforce emergency response
      if (analysisResult.severity === 'CRITICAL') {
        analysisResult.recommendation = 'Emergency medical attention';
        analysisResult.safe_guidance = null; // Remove any home remedies
      }

      // Medication safety filter
      if (analysisResult.safe_guidance) {
        const guidanceText = analysisResult.safe_guidance.toLowerCase();
        
        // Check for prohibited medications
        for (const prohibited of PROHIBITED_MEDICATION_TYPES) {
          if (guidanceText.includes(prohibited)) {
            console.warn('Prohibited medication type detected:', prohibited);
            analysisResult.safe_guidance = analysisResult.safe_guidance.replace(
              new RegExp(prohibited, 'gi'),
              'medication (consult doctor)'
            );
          }
        }
      }
      
      console.log('Parsed and validated analysis result:', analysisResult);
      
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      console.error('Parse error:', e.message);
      
      // Safe fallback response
      analysisResult = {
        disease_category: 'General Health Concern',
        severity: 'MODERATE',
        recommendation: 'Consult a doctor',
        reason: 'Unable to analyze symptoms accurately. Please seek professional medical evaluation.',
        safe_guidance: 'Please consult a healthcare provider for proper assessment and guidance.'
      };
    }

    // Log the query
    await supabaseClient.from('patient_queries').insert({
      symptoms_text: symptoms,
      prescription_text: prescriptionText || null,
      disease_category: analysisResult.disease_category,
      severity: analysisResult.severity,
      recommendation: analysisResult.recommendation,
      reason: analysisResult.reason,
      language,
    });

    console.log('Analysis completed successfully with safety validation');

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
