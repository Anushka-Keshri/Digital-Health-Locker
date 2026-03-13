import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { PrescriptionForm } from './pages/PrescriptionForm';
import { AISummaryPage } from './pages/AISummaryPage';
import { UploadRecord } from './pages/UploadRecord';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/records" element={<PatientDashboard />} /> {/* Reusing for demo */}
          <Route path="/patient/records/:id/ai-summary" element={<AISummaryPage />} />
          <Route path="/patient/upload" element={<UploadRecord />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/create" element={<PrescriptionForm />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;