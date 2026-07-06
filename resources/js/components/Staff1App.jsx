import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Staff1Sidebar from './Staff1/Staff1Sidebar';
import Staff1Header from './Staff1/Staff1Header';
import InventoryManager from './Staff1/InventoryManager';
import TrainedPersonnelManager from './Staff1/TrainedPersonnelManager';
import EventsManager from './Staff1/EventsManager';
import Pcr from './Staff1/Pcr';
import Staff1Dashboard from './Staff1/Staff1Dashboard';

const Staff1App = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => localStorage.getItem('staff1_token'));
  const [staffUser, setStaffUser] = useState(null);
  
  const [email, setEmail] = useState(() => localStorage.getItem('staff1_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('staff1_remember_email'));
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [activeSection, setActiveSection] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/staff1/')) {
        const section = path.split('/')[2];
        if (section) {
            return section.replace(/-/g, '_');
        }
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (token) {
      const urlSection = activeSection.replace(/_/g, '-');
      window.history.pushState(null, '', `/staff1/${urlSection}`);
    }
  }, [activeSection, token]);

  useEffect(() => {
    const handlePopState = () => {
        const path = window.location.pathname;
        if (path.startsWith('/staff1/')) {
            const section = path.split('/')[2];
            setActiveSection(section ? section.replace(/-/g, '_') : 'dashboard');
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      if (data.user.role !== 'staff1' && data.user.role !== 'admin') {
        throw new Error('Access denied. Staff 1 privileges required.');
      }

      if (rememberMe) {
        localStorage.setItem('staff1_remember_email', email);
      } else {
        localStorage.removeItem('staff1_remember_email');
      }

      localStorage.setItem('staff1_token', data.access_token);
      setToken(data.access_token);
      setStaffUser(data.user);
    } catch (e) {
      setLoginError(e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Only fetch inventory data if logged in
  const { data: invData } = useQuery({
    queryKey: ['inventory', 1],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?page=1`);
      return res.json();
    },
    enabled: !!token
  });
  
  const inventory = invData?.data || [];
  const lowStockItemsCount = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080a] px-4 font-sans relative overflow-hidden">
        {/* Dynamic Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0a84ff]/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#34c759]/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
        
        <div className="w-full max-w-[420px] relative z-10">
          <div className="bg-[#111116]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] transform transition-all hover:border-white/10">
            <div className="flex flex-col items-center mb-8">
              <div className="bg-gradient-to-br from-[#1c1c24] to-[#121218] p-4 rounded-2xl border border-white/10 shadow-inner shadow-white/5 mb-5 relative group">
                <div className="absolute inset-0 bg-[#0a84ff]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <img src="/images/mdrrmo_logo.png" alt="MDRRMO Logo" className="w-[72px] h-[72px] object-contain relative z-10 drop-shadow-2xl" />
              </div>
              <h2 className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight text-center">
                MDRRMO System
              </h2>
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-[#0a84ff]/10 border border-[#0a84ff]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]"></span>
                <span className="text-[10px] font-bold tracking-widest text-[#0a84ff] uppercase">Staff 1 Portal</span>
              </div>
            </div>

            {loginError && (
              <div className="mb-6 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-3.5 flex items-start gap-3 animate-[shake_0.4s_ease-in-out]">
                <span className="text-[#ef4444] mt-0.5">⚠️</span>
                <p className="text-sm text-[#ef4444] leading-tight m-0 font-medium">{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 group-focus-within:text-[#0a84ff] transition-colors">✉️</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#08080a]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff] transition-all placeholder:text-gray-600 font-medium"
                    placeholder="staff1@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 group-focus-within:text-[#0a84ff] transition-colors">🔒</span>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-[#08080a]/50 border border-white/10 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff] transition-all placeholder:text-gray-600 font-medium ${!showPassword && password ? 'tracking-widest' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4 rounded border border-white/20 bg-[#08080a]/50 group-hover:border-[#0a84ff] transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="absolute opacity-0 w-full h-full cursor-pointer"
                    />
                    {rememberMe && (
                      <span className="text-[#0a84ff] text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                </label>

                <a href="#" onClick={(e) => e.preventDefault()} className="text-[11px] font-medium text-[#0a84ff] hover:text-[#3399ff] hover:underline transition-colors">
                  Forgot password?
                </a>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-[#0a84ff] to-[#0066cc] text-white font-bold py-4 px-4 rounded-xl transition-all shadow-[0_8px_20px_rgba(10,132,255,0.3)] hover:shadow-[0_12px_28px_rgba(10,132,255,0.4)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    {loginLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="tracking-wide">Authenticating...</span>
                      </>
                    ) : (
                      <span className="tracking-wide">Secure Login</span>
                    )}
                  </div>
                </button>
              </div>
            </form>
            
            <div className="mt-8 text-center border-t border-white/5 pt-6">
              <p className="text-[10px] text-gray-500 font-medium tracking-wide">
                MDRRMO Authorized Personnel Only
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-100 font-sans flex overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-[radial-gradient(circle_at_top,rgba(10,132,255,0.08),transparent_70%)] pointer-events-none z-0" />
      
      <Staff1Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        lowStockItemsCount={lowStockItemsCount} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <Staff1Header activeSection={activeSection} />

        <div className="p-8 overflow-y-auto flex-1">
          {(activeSection === 'inventory' || activeSection === 'equipment' || activeSection === 'alerts' || activeSection === 'reports') && <InventoryManager activeSection={activeSection} />}
          {activeSection === 'events' && (
            <EventsManager role="Staff1" />
          )}

          {activeSection === 'pcr' && (
            <Pcr />
          )}

          {activeSection === 'dashboard' && (
            <Staff1Dashboard setActiveSection={setActiveSection} />
          )}
          {activeSection === 'trained_personnel' && <TrainedPersonnelManager />}
        </div>
      </div>
    </div>
  );
};

export default Staff1App;
