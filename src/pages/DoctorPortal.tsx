import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut, Users, FileText, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { PatientQuery, SafetyRule, GuidanceContent } from '../types';
import { FunctionsHttpError } from '@supabase/supabase-js';

export function DoctorPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queries, setQueries] = useState<PatientQuery[]>([]);
  const [rules, setRules] = useState<SafetyRule[]>([]);
  const [guidance, setGuidance] = useState<GuidanceContent[]>([]);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { password },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Login failed'}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.success) {
        setIsAuthenticated(true);
        toast.success('Login successful');
        loadData();
      } else {
        toast.error('Invalid password');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    // Load patient queries
    const { data: queriesData } = await supabase
      .from('patient_queries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (queriesData) setQueries(queriesData);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass-card shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-full bg-medical-gradient mb-4">
              <Lock className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Doctor Portal</h1>
            <p className="text-muted-foreground mt-2">Admin access required</p>
          </div>

          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="h-14 text-lg"
            />
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-14 text-lg bg-medical-gradient"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="w-full"
            >
              Back to Patient Portal
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-medical-gradient bg-clip-text text-transparent">
            Doctor Dashboard
          </h1>
          <Button
            onClick={() => {
              setIsAuthenticated(false);
              navigate('/');
            }}
            variant="outline"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="queries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queries" className="text-lg">
              <Users className="w-4 h-4 mr-2" />
              Patient Queries
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-lg">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Safety Rules
            </TabsTrigger>
            <TabsTrigger value="guidance" className="text-lg">
              <FileText className="w-4 h-4 mr-2" />
              Guidance Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-4">
            {queries.map((query) => (
              <Card key={query.id} className="p-6 glass-card shadow-lg">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(query.created_at).toLocaleString()}
                      </span>
                      <span className="ml-4 px-2 py-1 rounded text-sm bg-primary/10">
                        {query.language.toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg font-semibold ${
                        query.severity === 'EMERGENCY'
                          ? 'bg-red-100 text-red-700'
                          : query.severity === 'HIGH'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {query.severity}
                    </span>
                  </div>
                  <div>
                    <strong>Symptoms:</strong> {query.symptoms_text}
                  </div>
                  {query.prescription_text && (
                    <div>
                      <strong>Prescription:</strong> {query.prescription_text}
                    </div>
                  )}
                  <div>
                    <strong>Category:</strong> {query.disease_category}
                  </div>
                  <div>
                    <strong>Recommendation:</strong> {query.recommendation}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <p className="text-muted-foreground">
              Safety rules trigger emergency overrides when dangerous keywords are detected.
            </p>
            {rules.map((rule) => (
              <Card key={rule.id} className="p-6 glass-card shadow-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <strong className="text-lg">{rule.keyword}</strong>
                    <span className="px-3 py-1 rounded bg-red-100 text-red-700 font-semibold">
                      {rule.severity}
                    </span>
                  </div>
                  <div>
                    <strong>Category:</strong> {rule.category}
                  </div>
                  <div>
                    <strong>Override:</strong> {rule.override_text}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="guidance" className="space-y-4">
            <p className="text-muted-foreground">
              Guidance content is shown to patients based on severity level.
            </p>
            {guidance.map((item) => (
              <Card key={item.id} className="p-6 glass-card shadow-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <strong className="text-lg capitalize">{item.category}</strong>
                    <span className="px-3 py-1 rounded bg-primary/10">
                      {item.language.toUpperCase()}
                    </span>
                  </div>
                  <p>{item.text}</p>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
