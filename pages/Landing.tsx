import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Stethoscope, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { store } from '../services/store';
import { UserRole } from '../types';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.PATIENT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Simulated password
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = store.login(email, selectedRole);
    if (user) {
      if (user.role === UserRole.DOCTOR) navigate('/doctor/dashboard');
      else navigate('/patient/dashboard');
    } else {
      setError('Invalid credentials or role. Try patient@healthlocker.in or doctor@healthlocker.in');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
              <ShieldCheck className="h-4 w-4" />
              <span>Digital India Health Stack Ready</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
              Your Health Records,<br />
              <span className="text-primary-600">Secure & Portable.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              India's trusted digital health locker. Store medical history, share with doctors securely, and receive authenticated digital prescriptions instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>NMC Verified Doctors</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Bank-grade Security</span>
              </div>
            </div>
          </div>
          
          {/* Auth Card */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-2xl blur opacity-20"></div>
            <Card className="relative p-8">
              <div className="flex space-x-4 mb-8">
                <button
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 pb-2 text-center font-medium border-b-2 transition-colors ${activeTab === 'login' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 pb-2 text-center font-medium border-b-2 transition-colors ${activeTab === 'register' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500'}`}
                >
                  Register
                </button>
              </div>

              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRole(UserRole.PATIENT)}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${selectedRole === UserRole.PATIENT ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <User className="h-6 w-6" />
                      <span className="font-medium">Patient</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole(UserRole.DOCTOR)}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${selectedRole === UserRole.DOCTOR ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <Stethoscope className="h-6 w-6" />
                      <span className="font-medium">Doctor</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <Input 
                      label="Email Address" 
                      placeholder="you@example.com" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input 
                      label={selectedRole === UserRole.PATIENT ? "OTP (Use '1234')" : "Password"} 
                      type="password" 
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <Button type="submit" className="w-full h-12 text-lg">
                    <span>Access Locker</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>

                  <p className="text-center text-xs text-slate-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              ) : (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Registration Closed</h3>
                  <p className="text-slate-500">
                    We are currently in a closed beta with select hospitals. Please ask your healthcare provider for an invite code.
                  </p>
                  <Button variant="outline" className="mt-6" onClick={() => setActiveTab('login')}>Back to Login</Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};