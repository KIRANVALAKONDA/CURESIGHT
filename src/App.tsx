import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PatientPortal } from './pages/PatientPortal';
import { DoctorLogin } from './pages/DoctorLogin';
import { DoctorSignup } from './pages/DoctorSignup';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AccessRestricted } from './pages/AccessRestricted';
import { useDoctorStore } from './stores/useDoctorStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSessionValid } = useDoctorStore();
  return isSessionValid() ? <>{children}</> : <Navigate to="/doctor/access-denied" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<PatientPortal />} />
        <Route path="/doctor" element={<Navigate to="/doctor/login" />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/signup" element={<DoctorSignup />} />
        <Route path="/doctor/access-denied" element={<AccessRestricted />} />
        <Route 
          path="/doctor/dashboard" 
          element={
            <ProtectedRoute>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
