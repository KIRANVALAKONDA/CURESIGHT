import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export function AccessRestricted() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-12 glass-card shadow-2xl border-2 border-red-200/40 text-center animate-fade-in">
        <div className="inline-flex p-6 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 mb-6 shadow-lg animate-pulse">
          <ShieldX className="w-20 h-20 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Access Restricted</h1>
        <div className="max-w-md mx-auto space-y-4 mb-10">
          <p className="text-xl font-semibold text-red-700">
            🔒 Verified Medical Professionals Only
          </p>
          <p className="text-base text-slate-600 leading-relaxed">
            This area is reserved for approved healthcare providers with institutional credentials.
          </p>
          <p className="text-sm text-slate-500">
            If you are a licensed medical professional, please login with your approved account or register for access.
          </p>
        </div>
        <div className="space-y-3">
          <Link to="/doctor/login">
            <Button className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl shadow-lg hover:shadow-xl transition-all">
              Go to Doctor Login
            </Button>
          </Link>
          <Link to="/doctor/signup">
            <Button variant="outline" className="w-full h-12 text-base border-2 rounded-xl hover:bg-slate-50">
              Register as Doctor
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="w-full h-12 text-base rounded-xl hover:bg-slate-100">
              Back to Patient Portal
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
