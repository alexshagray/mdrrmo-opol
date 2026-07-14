import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import AdminNavbar from './Admin/AdminNavbar';
import UserManagement from './Admin/UserManagement';
import EventsManager from './Staff1/EventsManager';
import AdminDashboard from './Admin/AdminDashboard';
import ReportsTable from './Admin/ReportsTable';

export default function AdminApp() {
    const [token, setToken] = useState(localStorage.getItem('admin_token') || null);
    const [adminUser, setAdminUser] = useState(null);
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState(() => {
        const path = window.location.pathname;
        if (path.startsWith('/admin/')) {
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
            window.history.pushState(null, '', `/admin/${urlSection}`);
        }
    }, [activeSection, token]);

    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path.startsWith('/admin/')) {
                const section = path.split('/')[2];
                setActiveSection(section ? section.replace(/-/g, '_') : 'dashboard');
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Global Notifications
    const [notifications, setNotifications] = useState([]);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [currentNotification, setCurrentNotification] = useState(null);
    const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [showReportsMenu, setShowReportsMenu] = useState(false);
    const reportsDropdownRef = useRef(null);

    // Close reports menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target)) {
                setShowReportsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch notifications and listen to socket for updates
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setNotifications(data);

                const today = new Date().toISOString().split('T')[0];
                const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
                if (readData.date !== today) {
                    readData.date = today;
                    readData.ids = [];
                    localStorage.setItem('readNotificationsData', JSON.stringify(readData));
                }

                const readIds = readData.ids;
                const unreadAlerts = data.filter(n => !readIds.includes(n.id));
                
                if (unreadAlerts.length > 0) {
                    setCurrentNotification(unreadAlerts[0]);
                    setShowNotificationModal(true);
                }
            } catch (err) {
                console.error('Failed to fetch notifications', err);
            }
        };
        
        if (token) fetchNotifications();
        
        const socket = io(`http://${window.location.hostname}:3000`);
        socket.on('new_notification', fetchNotifications);
        socket.on('incoming_emergency_call', fetchNotifications);

        return () => {
            socket.disconnect();
        };
    }, []);

    const dismissNotification = () => {
        if (currentNotification) {
            const today = new Date().toISOString().split('T')[0];
            const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
            if (readData.date !== today) {
                readData.date = today;
                readData.ids = [];
            }
            
            if (!readData.ids.includes(currentNotification.id)) {
                readData.ids.push(currentNotification.id);
                localStorage.setItem('readNotificationsData', JSON.stringify(readData));
            }

            // Find next unread notification
            const nextUnread = notifications.find(n => !readData.ids.includes(n.id));
            if (nextUnread) {
                setCurrentNotification(nextUnread);
            } else {
                setShowNotificationModal(false);
                setCurrentNotification(null);
            }
        } else {
            setShowNotificationModal(false);
            setCurrentNotification(null);
        }
    };



    const handleNotificationClick = (n) => {
        const today = new Date().toISOString().split('T')[0];
        const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
        if (readData.date !== today) {
            readData.date = today;
            readData.ids = [];
        }

        if (!readData.ids.includes(n.id)) {
            readData.ids.push(n.id);
            localStorage.setItem('readNotificationsData', JSON.stringify(readData));
        }

        if (n.type === 'report' && n.payload?.url) {
            setPdfPreviewUrl(n.payload.url);
        } else {
            setCurrentNotification(n);
            setShowNotificationModal(true);
        }
        setShowNotificationsMenu(false);
    };

    // Login Form State
    const [email, setEmail] = useState(() => localStorage.getItem('admin_remember_email') || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('admin_remember_email'));
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);

    // On Load: fetch profile if token exists
    useEffect(() => {
        if (token) {
            fetchAdminProfile();
        }
    }, [token]);

    const fetchAdminProfile = async () => {
        try {
            const res = await fetch('/api/user', {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setAdminUser(data);
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

            if (data.user.role !== 'admin') {
                throw new Error('Access denied. Admin privileges required.');
            }

            if (rememberMe) {
                localStorage.setItem('admin_remember_email', email);
            } else {
                localStorage.removeItem('admin_remember_email');
            }

            localStorage.setItem('admin_token', data.access_token);
            setToken(data.access_token);
            setAdminUser(data.user);
        } catch (e) {
            setLoginError(e.message);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setToken(null);
        setAdminUser(null);
        queryClient.clear();
    };

    // Render Login Interface if no token
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
                                <span className="text-[10px] font-bold tracking-widest text-[#0a84ff] uppercase">Admin Control Center</span>
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
                                        placeholder="admin@mdrrmo.com"
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
        <div className="min-h-screen bg-[#08080a] text-gray-100 font-sans pb-12">
            {/* Header banner glow */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-[radial-gradient(circle_at_top,rgba(10,132,255,0.08),transparent_70%)] pointer-events-none" />

            {/* Navbar */}
            <AdminNavbar 
                adminUser={adminUser} 
                notifications={notifications} 
                showNotificationsMenu={showNotificationsMenu}
                setShowNotificationsMenu={setShowNotificationsMenu}
                handleLogout={handleLogout} 
                onNotificationClick={handleNotificationClick}
            />

            {/* Admin Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-4 relative z-50">
                <div className="flex flex-wrap gap-2 p-1 bg-[#111116] border border-[#1f1f26] rounded-xl w-fit">
                    <button
                        onClick={() => setActiveSection('dashboard')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeSection === 'dashboard' 
                                ? 'bg-gradient-to-r from-[#0a84ff] to-[#005bb5] text-white shadow-lg shadow-[#0a84ff]/20' 
                                : 'text-gray-400 hover:text-white hover:bg-[#181822]'
                        }`}
                    >
                        Overview Dashboard
                    </button>
                    <button
                        onClick={() => setActiveSection('users')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeSection === 'users' 
                                ? 'bg-gradient-to-r from-[#0a84ff] to-[#005bb5] text-white shadow-lg shadow-[#0a84ff]/20' 
                                : 'text-gray-400 hover:text-white hover:bg-[#181822]'
                        }`}
                    >
                        User Management
                    </button>

                    <button
                        onClick={() => setActiveSection('events')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeSection === 'events' 
                                ? 'bg-gradient-to-r from-[#0a84ff] to-[#005bb5] text-white shadow-lg shadow-[#0a84ff]/20' 
                                : 'text-gray-400 hover:text-white hover:bg-[#181822]'
                        }`}
                    >
                        Events & Announcements
                    </button>
                    
                    {/* Reports Dropdown Tab */}
                    <div className="relative group" ref={reportsDropdownRef}>
                        <button
                            onClick={() => {
                                if (!activeSection.startsWith('reports')) {
                                    setActiveSection('reports-inventory');
                                }
                                setShowReportsMenu(!showReportsMenu);
                            }}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                activeSection.startsWith('reports')
                                    ? 'bg-gradient-to-r from-[#0a84ff] to-[#005bb5] text-white shadow-lg shadow-[#0a84ff]/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-[#181822]'
                            }`}
                        >
                            Reports ▾
                        </button>
                        
                        {showReportsMenu && (
                            <div className="absolute left-0 top-full mt-1 w-48 bg-[#111116] border border-[#1f1f26] rounded-xl shadow-xl z-50 overflow-hidden transform origin-top transition-all">
                                <button
                                    onClick={() => {
                                        setActiveSection('reports-inventory');
                                        setShowReportsMenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                                        activeSection === 'reports-inventory' ? 'bg-[#0a84ff]/10 text-[#0a84ff]' : 'text-gray-300 hover:bg-[#181822] hover:text-white'
                                    }`}
                                >
                                    Inventory Reports
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveSection('reports-incident');
                                        setShowReportsMenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                                        activeSection === 'reports-incident' ? 'bg-[#0a84ff]/10 text-[#0a84ff]' : 'text-gray-300 hover:bg-[#181822] hover:text-white'
                                    }`}
                                >
                                    Incident Reports
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                {activeSection === 'dashboard' && <AdminDashboard setActiveSection={setActiveSection} />}
                {activeSection === 'users' && <UserManagement token={token} handleLogout={handleLogout} />}

                {activeSection === 'events' && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mt-2">
                            <EventsManager role="Admin" />
                        </div>
                    </div>
                )}
                {activeSection === 'reports-inventory' && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
                        <ReportsTable type="inventory" />
                    </div>
                )}
                {activeSection === 'reports-incident' && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
                        <ReportsTable type="incident" />
                    </div>
                )}
            </div>

            {/* Global Notification Modal */}
            {showNotificationModal && currentNotification && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-[#1e212b] border-2 border-red-500 rounded-xl w-full max-w-md shadow-[0_10px_40px_rgba(239,68,68,0.2)] animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                        <div className="flex justify-between items-center p-5 border-b border-[#2d3748] bg-red-500/10 rounded-t-lg">
                            <h3 className="m-0 text-red-500 text-lg font-bold">🚨 New System Alert</h3>
                            <button onClick={dismissNotification} className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xl">✖</button>
                        </div>
                        <div className="p-6">
                            <h4 className="m-0 mb-2.5 text-white text-base font-semibold">{currentNotification.title}</h4>
                            {currentNotification.type === 'report' ? (
                                <p className="m-0 text-slate-300 text-sm leading-relaxed">
                                    A new report has been submitted by Staff. You can download and view the details in PDF format.
                                </p>
                            ) : (
                                <p className="m-0 text-slate-300 text-sm leading-relaxed">{currentNotification.message}</p>
                            )}
                        </div>
                        <div className="p-5 border-t border-[#2d3748]">
                            {currentNotification.type === 'report' ? (
                                <button onClick={() => { setPdfPreviewUrl(currentNotification.payload?.url); dismissNotification(); }} className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg cursor-pointer">
                                    📄 View PDF Report
                                </button>
                            ) : (
                                <button onClick={dismissNotification} className="w-full bg-[#0a84ff] hover:bg-[#0070df] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg cursor-pointer">
                                    Acknowledge
                                </button>
                            )}
                        </div>
                    </div>
                    <style>{`
                        @keyframes popIn {
                            0% { transform: scale(0.8); opacity: 0; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}

            {/* PDF Viewer Modal */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[2000] p-4">
                    <div className="w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden flex flex-col shadow-2xl animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                        <div className="bg-[#181822] border-b border-[#2b2b35] p-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg m-0 flex items-center gap-2">
                                <span>📄</span> Inventory Report Viewer
                            </h3>
                            <button onClick={() => setPdfPreviewUrl(null)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors cursor-pointer">
                                Close Viewer
                            </button>
                        </div>
                        <iframe 
                            src={pdfPreviewUrl} 
                            title="PDF Preview"
                            className="w-full flex-1 border-0 bg-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
