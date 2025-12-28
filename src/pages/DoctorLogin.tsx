import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, Stethoscope, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { useDoctorStore } from '../stores/useDoctorStore';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

export function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'account' | 'passkey'>('account');
  const [passkey, setPasskey] = useState('');
  const navigate = useNavigate();
  const { login } = useDoctorStore();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('doctor-login', {
        body: { email, password, isEmergencyPasskey: false },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const errorData = await error.context?.json();
            if (errorData?.status === 'pending') {
              toast.error(errorData.message);
              return;
            }
            errorMessage = errorData?.error || error.message;
          } catch {
            errorMessage = error.message;
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.success) {
        login({
          id: data.doctor.id,
          email: data.doctor.email,
          fullName: data.doctor.fullName,
          role: data.role,
          status: data.doctor.status,
          sessionExpiry: data.sessionExpiry,
          loginTime: Date.now(),
        });
        toast.success('Login successful');
        navigate('/doctor/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyAccess = async () => {
    if (!passkey) {
      toast.error('Please enter emergency passkey');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('doctor-login', {
        body: { password: passkey, isEmergencyPasskey: true },
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
        login({
          id: 'emergency',
          email: 'emergency@system',
          fullName: 'Emergency Admin',
          role: data.role,
          status: 'approved',
          sessionExpiry: data.sessionExpiry,
          loginTime: Date.now(),
        });
        toast.success('Emergency access granted');
        navigate('/doctor/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid passkey');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-10 glass-card shadow-2xl border-2 border-white/40 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 mb-6 shadow-lg">
            <Stethoscope className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">CureSight</h1>
          <h2 className="text-2xl font-bold text-slate-800 mt-2">Doctor Portal</h2>
          <p className="text-slate-600 mt-2 text-lg">Secure Medical Professional Access</p>
        </div>

        {/* Login Method Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-8 p-2 bg-slate-100/70 rounded-xl">
          <button
            onClick={() => setLoginMethod('account')}
            className={`py-3 px-4 rounded-lg font-semibold transition-all ${
              loginMethod === 'account'
                ? 'bg-white shadow-lg text-blue-700 scale-105'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Account Login
          </button>
          <button
            onClick={() => setLoginMethod('passkey')}
            className={`py-3 px-4 rounded-lg font-semibold transition-all ${
              loginMethod === 'passkey'
                ? 'bg-white shadow-lg text-purple-700 scale-105'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4 inline mr-2" />
            Passkey Login
          </button>
        </div>

        {loginMethod === 'account' ? (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="text-sm font-semibold mb-2 block text-slate-700">Institutional Email</label>
              <Input
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block text-slate-700">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Lock className="w-5 h-5 mr-2" />
              {isLoading ? 'Logging in...' : 'Login to Dashboard'}
            </Button>

            <div className="space-y-3 pt-4 border-t-2 border-slate-100">
              <Link to="/doctor/signup">
                <Button variant="outline" className="w-full h-12 text-base border-2 rounded-xl hover:bg-slate-50">
                  Create Doctor Account
                </Button>
              </Link>

              <Link to="/">
                <Button variant="ghost" className="w-full h-12 text-base rounded-xl hover:bg-slate-100">
                  Back to Patient Portal
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-slide-up">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900 mb-1">Passkey Access</p>
                <p className="text-sm text-purple-800">
                  All passkey logins are logged and monitored. Use only for authorized access.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block text-slate-700">Enter Passkey</label>
              <Input
                type="password"
                placeholder="Enter emergency passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmergencyAccess()}
                className="h-14 text-lg border-2 focus:border-purple-500 rounded-xl"
              />
              <p className="text-xs text-slate-500 mt-2">Contact system administrator if you don't have access credentials</p>
            </div>

            <Button
              onClick={handleEmergencyAccess}
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <KeyRound className="w-5 h-5 mr-2" />
              {isLoading ? 'Verifying...' : 'Access with Passkey'}
            </Button>

            <div className="pt-4 border-t-2 border-slate-100">
              <Link to="/">
                <Button variant="ghost" className="w-full h-12 text-base rounded-xl hover:bg-slate-100">
                  Back to Patient Portal
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
