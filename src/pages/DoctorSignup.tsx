import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

export function DoctorSignup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('doctor-signup', {
        body: { email, password, fullName },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const errorData = await error.context?.json();
            errorMessage = errorData?.error || error.message;
          } catch {
            errorMessage = error.message;
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.success) {
        setSignupSuccess(true);
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass-card shadow-2xl text-center">
          <div className="inline-flex p-4 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Account Created Successfully!</h2>
          <p className="text-muted-foreground mb-6">
            Your account is pending admin approval. You will be able to login once your account is approved.
            This typically takes 1-2 business days.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/doctor/login')}
              className="w-full bg-medical-gradient"
            >
              Go to Login
            </Button>
            <Link to="/">
              <Button variant="ghost" className="w-full">
                Back to Patient Portal
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-10 glass-card shadow-2xl border-2 border-white/40 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 mb-6 shadow-lg">
            <UserPlus className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800">Doctor Registration</h1>
          <p className="text-slate-600 mt-2 text-lg">Create your professional account</p>
        </div>

        <div className="mb-6 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Institutional Email Required</p>
            <p>Use your hospital, clinic, or medical institution email address. Personal emails (Gmail, Yahoo, etc.) are not accepted.</p>
          </div>
        </div>

        <div className="space-y-5 animate-slide-up">
          <div>
            <label className="text-sm font-semibold mb-2 block text-slate-700">Full Name</label>
            <Input
              type="text"
              placeholder="Dr. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block text-slate-700">Institutional Email</label>
            <Input
              type="email"
              placeholder="doctor@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
            <p className="text-xs text-slate-600 mt-2">
              Must be from a recognized healthcare institution
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block text-slate-700">Password</label>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block text-slate-700">Confirm Password</label>
            <Input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
              className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Your account will be pending approval after registration. Admin review typically takes 1-2 business days.
            </p>
          </div>

          <Button
            onClick={handleSignup}
            disabled={isLoading}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <div className="text-center space-y-3 pt-4 border-t-2 border-slate-100">
            <Link to="/doctor/login">
              <Button variant="outline" className="w-full h-12 text-base border-2 rounded-xl hover:bg-slate-50">
                Already have an account? Login
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="w-full h-12 text-base rounded-xl hover:bg-slate-100">
                Back to Patient Portal
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
