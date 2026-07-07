import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

import Staff2Sidebar from './Staff2/Staff2Sidebar';
import Staff2Header from './Staff2/Staff2Header';
import Incidents from './Staff2/Incidents';
import LiveMonitoring from './Staff2/LiveMonitoring';
import Staff2Dashboard from './Staff2/Staff2Dashboard';
import EventsManager from './Staff1/EventsManager';
import Staff2Overview from './Staff2/Staff2Overview';

export default function Staff2App() {
  const [token, setToken] = useState(localStorage.getItem('staff2_token') || null);
  const [staffUser, setStaffUser] = useState(null);

  // Login Form State
  const [email, setEmail] = useState(() => localStorage.getItem('staff2_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('staff2_remember_email'));
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [activeSection, setActiveSection] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/staff2/')) {
        const section = path.split('/')[2];
        if (section) {
            return section.replace(/-/g, '_');
        }
    }
    return 'dashboard';
  });

  useEffect(() => {
    const urlSection = activeSection.replace(/_/g, '-');
    window.history.pushState(null, '', `/staff2/${urlSection}`);
  }, [activeSection]);

  useEffect(() => {
    const handlePopState = () => {
        const path = window.location.pathname;
        if (path.startsWith('/staff2/')) {
            const section = path.split('/')[2];
            setActiveSection(section ? section.replace(/-/g, '_') : 'dashboard');
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [simulateOpol, setSimulateOpol] = useState(false);
  const [responders, setResponders] = useState({});
  const [notifications, setNotifications] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
      if (token) {
          fetchStaffProfile();
      }
  }, [token]);

  const fetchStaffProfile = async () => {
      try {
          const res = await fetch('/api/user', {
              headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`
              }
          });
          if (res.ok) {
              const data = await res.json();
              setStaffUser(data);
          }
      } catch (e) {
          console.error('Failed to load profile', e);
      }
  };

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

          if (data.user.role !== 'staff2' && data.user.role !== 'admin') {
              throw new Error('Access denied. Staff 2 privileges required.');
          }

          if (rememberMe) {
              localStorage.setItem('staff2_remember_email', email);
          } else {
              localStorage.removeItem('staff2_remember_email');
          }

          localStorage.setItem('staff2_token', data.access_token);
          setToken(data.access_token);
          setStaffUser(data.user);
      } catch (e) {
          setLoginError(e.message);
      } finally {
          setLoginLoading(false);
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('staff2_token');
      setToken(null);
      setStaffUser(null);
      queryClient.clear();
  };

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3000`);

    socket.on('connect', () => {
      console.log('Staff 2 connected to tracking server');
    });

    socket.on('responderLocationUpdate', (data) => {
      setResponders(prev => ({
        ...prev,
        [data.responderId]: {
          ...data,
          updatedAt: new Date().toISOString()
        }
      }));
    });

    socket.on('incidentUpdate', () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['mapIncidents'] });
    });

    socket.on('dispatchReportUpdate', () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchReports'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  if (!token) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#08080a] px-4 font-sans relative overflow-hidden">
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
                              <span className="text-[10px] font-bold tracking-widest text-[#0a84ff] uppercase">Staff 2 Portal</span>
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
                                      placeholder="staff2@balansag.com"
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
                              MUNICIPAL DISASTER RISK REDUCTION<br/>& MANAGEMENT OFFICE
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="staff2-dashboard">
      <Staff2Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        setSimulateOpol={setSimulateOpol} 
      />
      
      <div className="main-content">
        <Staff2Header 
          activeSection={activeSection}
          handleLogout={handleLogout}
        />
        
        <div className="scrollable-content custom-scrollbar">
          {activeSection === 'dashboard' && <Staff2Overview setActiveSection={setActiveSection} responders={responders} />}
          {activeSection === 'incidents' && <Incidents setNotifications={setNotifications} />}

          {activeSection === 'live_monitoring' && (
            <Staff2Dashboard responders={responders} setNotifications={setNotifications} />
          )}

          {activeSection === 'events' && (
            <div className="h-full">
              <EventsManager role="Staff2" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .staff2-dashboard {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: linear-gradient(135deg, #08080a 0%, #1a1a2e 100%);
        }

        .sidebar {
          width: 300px;
          background: rgba(17, 17, 21, 0.95);
          border-right: 1px solid #1f1f26;
          padding: 24px;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
        }

        .sidebar-header {
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1px solid #1f1f26;
        }

        .sidebar-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #0a84ff 0%, #34c759 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nav-item {
          padding: 16px 20px;
          background: rgba(28, 28, 35, 0.5);
          border: 1px solid #1f1f26;
          border-radius: 12px;
          color: #8e8e93;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .nav-item:hover {
          background: rgba(10, 132, 255, 0.1);
          border-color: #0a84ff;
          color: #0a84ff;
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.15) 0%, rgba(52, 199, 89, 0.15) 100%);
          border-color: #0a84ff;
          color: #0a84ff;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .scrollable-content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .main-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
        }

        .btn-refresh {
          padding: 12px 24px;
          background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
          border: none;
          border-radius: 10px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-refresh:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
        }

        .content-section {
          background: rgba(17, 17, 21, 0.8);
          border: 1px solid #1f1f26;
          border-radius: 16px;
          padding: 24px;
        }

        .content-section h2 {
          margin: 0 0 24px 0;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: rgba(28, 28, 35, 0.8);
        }

        .data-table th {
          padding: 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #8e8e93;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid #1f1f26;
          color: #f3f4f6;
          font-size: 14px;
        }

        .data-table tbody tr:hover {
          background: rgba(10, 132, 255, 0.05);
        }

        .status {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status.completed {
          background: rgba(52, 199, 89, 0.15);
          color: #34c759;
          border: 1px solid rgba(52, 199, 89, 0.3);
        }

        .status.pending {
          background: rgba(255, 159, 10, 0.15);
          color: #ff9f0a;
          border: 1px solid rgba(255, 159, 10, 0.3);
        }

        .status.active {
          background: rgba(10, 132, 255, 0.15);
          color: #0a84ff;
          border: 1px solid rgba(10, 132, 255, 0.3);
        }

        .btn-view {
          padding: 8px 16px;
          background: rgba(10, 132, 255, 0.1);
          border: 1px solid #0a84ff;
          border-radius: 8px;
          color: #0a84ff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-view:hover {
          background: #0a84ff;
          color: #ffffff;
        }

        .loading, .error, .no-data {
          text-align: center;
          padding: 48px;
          color: #8e8e93;
          font-size: 16px;
        }

        .error {
          color: #ef4544;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: rgba(17, 17, 21, 0.98);
          border: 1px solid #1f1f26;
          border-radius: 20px;
          max-width: 800px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #1f1f26;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
        }

        .modal-close {
          background: rgba(239, 69, 68, 0.1);
          border: 1px solid #ef4544;
          color: #ef4544;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modal-close:hover {
          background: #ef4544;
          color: #ffffff;
        }

        .modal-body {
          padding: 24px;
        }

        .detail-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #1f1f26;
        }

        .detail-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .detail-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 700;
          color: #0a84ff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-section p {
          margin: 8px 0;
          color: #f3f4f6;
          font-size: 14px;
          line-height: 1.6;
        }

        .detail-section strong {
          color: #8e8e93;
          font-weight: 600;
        }

        .subsection {
          margin-top: 16px;
          padding: 16px;
          background: rgba(28, 28, 35, 0.5);
          border-radius: 12px;
          border: 1px solid #1f1f26;
        }

        .subsection h4 {
          margin: 0 0 12px 0;
          font-size: 13px;
          font-weight: 700;
          color: #34c759;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        /* Hazard Map Styles */
        .hazard-map-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }

        .hazard-map-wrapper {
          position: relative;
          width: 100%;
          height: calc(100vh - 200px);
          min-height: 500px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #1f1f26;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .leaflet-container {
          width: 100%;
          height: 100%;
          background: #08080a;
        }

        /* Floating Controls Panel */
        .map-floating-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: rgba(17, 17, 21, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 20px;
          width: 250px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .map-floating-controls h3 {
          margin: 0 0 16px 0;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #e5e7eb;
          font-size: 13px;
          cursor: pointer;
          user-select: none;
          transition: opacity 0.2s;
        }
        
        .toggle-label.border-top {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 12px;
          margin-top: 4px;
        }

        .toggle-label:hover {
          opacity: 0.8;
        }

        .toggle-label input[type="checkbox"] {
          display: none;
        }

        .checkbox-custom {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          position: relative;
          transition: all 0.2s;
        }

        .toggle-label input[type="checkbox"]:checked + .checkbox-custom {
          border-color: transparent;
        }

        .toggle-label input[type="checkbox"]:checked + .checkbox-custom::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .flood-color { background: rgba(59, 130, 246, 0.2); }
        .toggle-label input[type="checkbox"]:checked + .flood-color { background: #3b82f6; }

        .landslide-color { background: rgba(239, 68, 68, 0.2); }
        .toggle-label input[type="checkbox"]:checked + .landslide-color { background: #ef4444; }

        .surge-color { background: rgba(168, 85, 247, 0.2); }
        .toggle-label input[type="checkbox"]:checked + .surge-color { background: #a855f7; }
        
        .incident-color { background: rgba(245, 158, 11, 0.2); }
        .toggle-label input[type="checkbox"]:checked + .incident-color { background: #f59e0b; }

        .map-legend {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .map-legend h4 {
          margin: 0 0 12px 0;
          font-size: 12px;
          color: #9ca3af;
          text-transform: uppercase;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #d1d5db;
          margin-bottom: 8px;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .legend-color.high { background: #ef4444; }
        .legend-color.medium { background: #f59e0b; }

        .badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .badge.high {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .badge.medium {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .map-popup {
          background: #111116;
          color: #fff;
          padding: 8px;
          border-radius: 8px;
        }
        
        .map-popup h3 {
          margin: 0 0 8px 0;
          color: #fff;
          font-size: 16px;
          border-bottom: 1px solid #2a2a35;
          padding-bottom: 6px;
        }
        
        .map-popup p {
          margin: 4px 0;
          color: #d1d5db;
          font-size: 13px;
        }
        
        .map-popup strong {
          color: #9ca3af;
        }

        .popup-image-container {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #2a2a35;
        }

        .popup-snapshot {
          width: 100%;
          height: auto;
          border-radius: 6px;
          margin-top: 8px;
          border: 1px solid #2a2a35;
        }

        .popup-history {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #2a2a35;
        }

        .popup-history ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
          color: #d1d5db;
          font-size: 12px;
        }

        .popup-history li {
          margin-bottom: 4px;
        }

        .leaflet-popup-content-wrapper,
        .mapboxgl-popup-content {
          background: #111116;
          border: 1px solid #2a2a35;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          padding: 0;
        }

        .leaflet-popup-tip,
        .mapboxgl-popup-tip {
          border-top-color: #2a2a35 !important;
          border-bottom-color: #2a2a35 !important;
        }
        
        .mapboxgl-popup-close-button {
          color: #a1a1aa;
          font-size: 16px;
          padding: 4px 8px;
        }
        .mapboxgl-popup-close-button:hover {
          background: transparent;
          color: white;
        }
        
        /* Incident Module Styles */
        .incident-details-module {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 1000;
          background: rgba(17, 17, 21, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          width: 400px;
          max-height: calc(100vh - 280px);
          display: flex;
          flex-direction: column;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .module-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px 16px 0 0;
        }
        
        .module-header h3 {
          margin: 0;
          font-size: 16px;
          color: #fff;
          font-weight: 600;
        }
        
        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #a1a1aa;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background: #ef4444;
          color: #fff;
        }
        
        .module-content {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .module-stats {
          display: flex;
          gap: 12px;
        }
        
        .stat-box {
          flex: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .stat-val {
          font-size: 24px;
          font-weight: bold;
          color: #fff;
          line-height: 1.2;
        }
        
        .stat-label {
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
          margin-top: 4px;
        }
        
        .module-content h4 {
          margin: 0;
          font-size: 14px;
          color: #e5e7eb;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .report-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .report-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 12px;
          transition: border-color 0.2s;
        }
        
        .report-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .report-header strong {
          color: #60a5fa;
          font-size: 14px;
        }
        
        .report-time {
          font-size: 11px;
          color: #6b7280;
        }
        
        .report-card p {
          margin: 4px 0;
          font-size: 13px;
          color: #d1d5db;
        }
        
        .report-card strong {
          color: #9ca3af;
          font-weight: 500;
        }
        
        .report-desc {
          margin-top: 8px !important;
          padding-top: 8px;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
          font-style: italic;
          color: #a1a1aa !important;
        }
        
        /* Modal Custom Styling */
        .notification-modal {
          background: linear-gradient(135deg, #1f1f26 0%, #111116 100%);
          border: 1px solid #ef4444;
          border-radius: 16px;
          padding: 0;
          width: 400px;
          max-width: 90%;
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.3);
          animation: slideIn 0.3s ease-out;
          overflow: hidden;
        }

        .notification-modal .modal-header {
          background: rgba(239, 68, 68, 0.1);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          padding: 16px 20px;
        }
        
        .notification-modal .modal-header h3 {
          color: #ef4444;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .notification-modal .btn-icon {
          background: transparent;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          font-size: 16px;
        }
        
        .notification-modal .btn-icon:hover {
          color: #fff;
        }

        .notification-modal .modal-body {
          padding: 24px;
          text-align: center;
        }
        
        .notification-modal .modal-body h4 {
          color: #fff;
          font-size: 18px;
          margin: 0 0 12px 0;
        }
        
        .notification-modal .modal-body p {
          color: #a1a1aa;
          font-size: 14px;
          margin: 0;
          line-height: 1.5;
        }
        
        .notification-modal .modal-footer {
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .notification-modal .btn-primary {
          background: #ef4444;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .notification-modal .btn-primary:hover {
          background: #dc2626;
        }

        @keyframes pulse-marker {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Access Denied Card Styles */
        .access-denied-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 500px;
          background: rgba(17, 17, 21, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .access-denied-card {
          background: #111116;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          max-width: 450px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.1) inset;
        }

        .access-denied-icon {
          font-size: 48px;
          margin-bottom: 16px;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          50% { transform: translateX(5px) rotate(5deg); }
          75% { transform: translateX(-5px) rotate(-5deg); }
        }

        .access-denied-card h1 {
          color: #ef4444;
          margin: 0 0 12px 0;
          font-size: 24px;
        }

        .denied-message-primary {
          color: #e5e7eb;
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .denied-details {
          background: rgba(239, 68, 68, 0.1);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .denied-details p {
          margin: 4px 0;
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.5;
        }

        .location-warning {
          margin-top: 12px !important;
          padding-top: 12px;
          border-top: 1px dashed rgba(239, 68, 68, 0.3);
          font-weight: bold;
        }

        .detected-coords {
          margin-bottom: 24px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          font-family: monospace;
          color: #9ca3af;
          font-size: 13px;
        }
        
        .error-coords {
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.2);
          background: rgba(248, 113, 113, 0.05);
        }

        .detected-coords strong {
          display: block;
          margin-bottom: 4px;
          color: #d1d5db;
        }

        .simulation-panel {
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .simulation-note {
          color: #9ca3af;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .btn-simulate {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-simulate:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        }

        .map-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 500px;
          background: rgba(17, 17, 21, 0.6);
          border-radius: 16px;
          color: #9ca3af;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(59, 130, 246, 0.1);
          border-left-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .btn-reset-location {
          margin-top: 16px;
          width: 100%;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .btn-reset-location:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* Tagging Controls */
        .tagging-controls {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          pointer-events: none; /* Let clicks pass through to map */
        }

        .tagging-controls > * {
          pointer-events: auto; /* Re-enable clicks for buttons */
        }

        .btn-tag {
          padding: 12px 24px;
          background: #ffffff;
          color: #111;
          border: none;
          border-radius: 30px;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }

        .btn-tag.active {
          background: #22c55e;
          color: white;
        }

        .tagging-instructions {
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          text-align: center;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .tagging-instructions p {
          margin: 0;
          font-size: 14px;
        }

        .tagging-instructions p:last-child {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
          font-family: monospace;
        }

        .btn-select-area {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .area-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 20px;
        }

        .area-option {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .area-option:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-2px);
        }

        .area-icon {
          font-size: 24px;
          background: rgba(0,0,0,0.3);
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .area-info h4 {
          margin: 0 0 4px 0;
          color: #fff;
          font-size: 15px;
        }

        .area-info p {
          margin: 0;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.4;
        }

        .btn-confirm-tag {
          width: 100%;
          padding: 10px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          margin-top: 12px;
          cursor: pointer;
        }

        .btn-cancel-tag {
          width: 100%;
          padding: 10px;
          background: transparent;
          color: #9ca3af;
          border: 1px solid #374151;
          border-radius: 6px;
          margin-top: 8px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
