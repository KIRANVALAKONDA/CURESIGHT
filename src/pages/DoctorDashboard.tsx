import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, FileText, Settings, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { supabase } from '../lib/supabase';
import { useDoctorStore } from '../stores/useDoctorStore';
import { toast } from 'sonner';
import type { PatientQuery, SafetyRule, GuidanceContent } from '../types';

export function DoctorDashboard() {
  const [queries, setQueries] = useState<PatientQuery[]>([]);
  const [rules, setRules] = useState<SafetyRule[]>([]);
  const [guidance, setGuidance] = useState<GuidanceContent[]>([]);
  const [stats, setStats] = useState({ total: 0, emergency: 0, high: 0, today: 0 });
  const navigate = useNavigate();
  const { session, logout, isSessionValid } = useDoctorStore();

  useEffect(() => {
    if (!isSessionValid()) {
      toast.error('Session expired. Please login again.');
      navigate('/doctor/login');
      return;
    }

    loadData();

    // Auto-logout timer
    const timer = setInterval(() => {
      if (!isSessionValid()) {
        toast.error('Session expired due to inactivity');
        logout();
        navigate('/doctor/login');
      }
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    // Load patient queries
    const { data: queriesData } = await supabase
      .from('patient_queries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (queriesData) {
      setQueries(queriesData);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setStats({
        total: queriesData.length,
        emergency: queriesData.filter(q => q.severity === 'EMERGENCY' || q.severity === 'CRITICAL').length,
        high: queriesData.filter(q => q.severity === 'HIGH').length,
        today: queriesData.filter(q => new Date(q.created_at) >= today).length,
      });
    }

    // Load safety rules
    const { data: rulesData } = await supabase
      .from('safety_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (rulesData) setRules(rulesData);

    // Load guidance content
    const { data: guidanceData } = await supabase
      .from('guidance_content')
      .select('*')
      .order('category', { ascending: true });

    if (guidanceData) setGuidance(guidanceData);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/doctor/login');
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-600 shadow-lg animate-pulse',
      EMERGENCY: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-600 shadow-lg animate-pulse',
      HIGH: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-md',
      MODERATE: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white border-amber-600 shadow-md',
      LOW: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-600 shadow-md',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const timeRemaining = session 
    ? Math.max(0, Math.floor((session.sessionExpiry - (Date.now() - session.loginTime)) / 60000))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-100 p-4 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/70 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border-2 border-white/50 animate-slide-in-left hover:shadow-3xl transition-all duration-500">
          <div>
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              Medical Dashboard
            </h1>
            <p className="text-slate-700 mt-3 text-lg">
              Welcome back, <span className="font-bold text-blue-700">{session?.fullName}</span>
              {session?.role === 'emergency_admin' && (
                <span className="ml-3 px-3 py-1.5 text-sm bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg font-semibold shadow-md animate-pulse-glow">
                  🔑 Emergency Access
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl shadow-lg">
              <Clock className="w-5 h-5" />
              <span className="text-base font-bold">
                {timeRemaining}m left
              </span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="h-12 px-6 bg-white/90 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-700 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards with Better Visual Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 animate-slide-up-fade">
          <Card className="p-8 sm:p-10 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 backdrop-blur-lg border-4 border-blue-300 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 animate-bounce-in relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
            <div className="relative flex flex-col items-center justify-between gap-4">
              <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl transform group-hover:rotate-12 transition-transform duration-500">
                <Users className="w-14 h-14 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-base text-blue-900 font-black uppercase tracking-widest mb-2">Total Queries</p>
                <p className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 sm:p-10 bg-gradient-to-br from-red-50 via-red-100 to-rose-100 backdrop-blur-lg border-4 border-red-400 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 animate-bounce-in relative overflow-hidden group" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
            <div className="relative flex flex-col items-center justify-between gap-4">
              <div className="p-5 bg-gradient-to-br from-red-600 to-rose-600 rounded-3xl shadow-2xl transform group-hover:rotate-12 transition-transform duration-500 animate-pulse">
                <AlertTriangle className="w-14 h-14 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-base text-red-900 font-black uppercase tracking-widest mb-2">Emergency</p>
                <p className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">{stats.emergency}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 sm:p-10 bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 backdrop-blur-lg border-4 border-orange-300 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 animate-bounce-in relative overflow-hidden group" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
            <div className="relative flex flex-col items-center justify-between gap-4">
              <div className="p-5 bg-gradient-to-br from-orange-600 to-amber-600 rounded-3xl shadow-2xl transform group-hover:rotate-12 transition-transform duration-500">
                <TrendingUp className="w-14 h-14 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-base text-orange-900 font-black uppercase tracking-widest mb-2">High Risk</p>
                <p className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">{stats.high}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 sm:p-10 bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 backdrop-blur-lg border-4 border-green-300 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 animate-bounce-in relative overflow-hidden group" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
            <div className="relative flex flex-col items-center justify-between gap-4">
              <div className="p-5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl shadow-2xl transform group-hover:rotate-12 transition-transform duration-500">
                <Clock className="w-14 h-14 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-base text-green-900 font-black uppercase tracking-widest mb-2">Today</p>
                <p className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">{stats.today}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="queries" className="space-y-8 animate-fade-in-slow">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-lg p-2 rounded-2xl shadow-xl border-2 border-white/50">
            <TabsTrigger value="queries" className="text-lg h-14 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-300">
              <Users className="w-5 h-5 mr-2" />
              Patient Queries
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-lg h-14 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-300">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Safety Rules
            </TabsTrigger>
            <TabsTrigger value="guidance" className="text-lg h-14 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-300">
              <FileText className="w-5 h-5 mr-2" />
              Guidance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-4">
            <p className="text-slate-600">Recent patient symptom analysis queries</p>
            {queries.length === 0 ? (
              <Card className="p-12 text-center bg-white/60 backdrop-blur-sm">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No patient queries yet</p>
              </Card>
            ) : (
              queries.map((query, index) => (
                <Card key={query.id} className="p-6 sm:p-8 bg-gradient-to-r from-white to-blue-50 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] border-l-[6px] border-blue-600 rounded-xl animate-slide-in-left relative overflow-hidden group" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">
                            {new Date(query.created_at).toLocaleString()}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {query.language.toUpperCase()}
                          </span>
                        </div>
                        {query.severity && (
                          <span className={`px-4 py-2 rounded-xl font-bold text-sm border-3 ${getSeverityBadge(query.severity)} transform hover:scale-110 transition-transform duration-300`}>
                            {query.severity}
                          </span>
                        )}
                      </div>
                      <div>
                        <strong className="text-slate-700">Symptoms:</strong>{' '}
                        <span className="text-slate-600">{query.symptoms_text}</span>
                      </div>
                      {query.prescription_text && (
                        <div>
                          <strong className="text-slate-700">Prescription:</strong>{' '}
                          <span className="text-slate-600">{query.prescription_text}</span>
                        </div>
                      )}
                      {query.disease_category && (
                        <div>
                          <strong className="text-slate-700">Category:</strong>{' '}
                          <span className="text-slate-600">{query.disease_category}</span>
                        </div>
                      )}
                      {query.recommendation && (
                        <div>
                          <strong className="text-slate-700">Recommendation:</strong>{' '}
                          <span className="text-slate-600">{query.recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <p className="text-slate-600">
              Safety rules trigger emergency overrides when dangerous keywords are detected.
            </p>
            {rules.map((rule, index) => (
              <Card key={rule.id} className="p-6 sm:p-8 bg-gradient-to-r from-white to-red-50 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] border-l-[6px] border-red-600 rounded-xl animate-slide-in-left relative overflow-hidden group" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                <div className="relative">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-lg text-slate-800">{rule.keyword}</strong>
                      <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold text-sm border-3 border-red-600 shadow-lg animate-pulse transform hover:scale-110 transition-transform duration-300">
                        {rule.severity}
                      </span>
                    </div>
                    <div>
                      <strong className="text-slate-700">Category:</strong>{' '}
                      <span className="text-slate-600">{rule.category}</span>
                    </div>
                    <div>
                      <strong className="text-slate-700">Override Message:</strong>{' '}
                      <span className="text-slate-600">{rule.override_text}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="guidance" className="space-y-4">
            <p className="text-slate-600">
              Guidance content is shown to patients based on severity level.
            </p>
            {guidance.map((item, index) => (
              <Card key={item.id} className="p-6 sm:p-8 bg-gradient-to-r from-white to-green-50 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] border-l-[6px] border-green-600 rounded-xl animate-slide-in-left relative overflow-hidden group" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                <div className="relative">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-lg text-slate-800 capitalize">{item.category}</strong>
                      <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-medium text-sm">
                        {item.language.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{item.text}</p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
