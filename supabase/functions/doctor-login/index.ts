import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create sessions table
interface Session {
  id: string;
  email: string;
  fullName: string;
  role: 'doctor' | 'emergency_admin';
  status: string;
  sessionExpiry: number;
  loginTime: number;
}

// In-memory rate limiting (in production, use Redis or database)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, isEmergencyPasskey } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Emergency passkey access
    if (isEmergencyPasskey) {
      const identifier = `passkey_${req.headers.get('x-forwarded-for') || 'unknown'}`;
      
      if (!checkRateLimit(identifier)) {
        return new Response(
          JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get stored passkey (plain text)
      const { data: config } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'emergency_passkey')
        .single();

      if (config && config.value === password) {
        // Log passkey usage
        await supabaseAdmin.from('passkey_audit_logs').insert({
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          access_timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            role: 'emergency_admin',
            message: 'Emergency access granted',
            sessionExpiry: 30 * 60 * 1000 // 30 minutes
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid passkey' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Regular doctor login
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const identifier = `doctor_${email.toLowerCase()}`;
    
    if (!checkRateLimit(identifier)) {
      return new Response(
        JSON.stringify({ error: 'Too many login attempts. Please try again in 15 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const passwordHash = await hashPassword(password);

    // Get doctor account
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (doctorError || !doctor) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    if (doctor.password_hash !== passwordHash) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check approval status
    if (doctor.status === 'pending') {
      return new Response(
        JSON.stringify({ 
          error: 'Account pending approval',
          status: 'pending',
          message: 'Your account is awaiting admin approval. Please check back later.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (doctor.status === 'rejected') {
      return new Response(
        JSON.stringify({ error: 'Account access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Successful login
    loginAttempts.delete(identifier);

    return new Response(
      JSON.stringify({ 
        success: true,
        role: 'doctor',
        doctor: {
          id: doctor.id,
          email: doctor.email,
          fullName: doctor.full_name,
          status: doctor.status,
        },
        sessionExpiry: 8 * 60 * 60 * 1000 // 8 hours
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Login failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
