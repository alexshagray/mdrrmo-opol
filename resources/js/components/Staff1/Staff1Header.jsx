import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function Staff1Header({ activeSection }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        const staffData = data.filter(n => n.type !== 'report');
        setNotifications(staffData);

        const today = new Date().toISOString().split('T')[0];
        const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
        if (readData.date !== today) {
            readData.date = today;
            readData.ids = [];
            localStorage.setItem('readNotificationsData', JSON.stringify(readData));
        }

        const readIds = readData.ids;
        const unreadAlerts = staffData.filter(n => !readIds.includes(n.id));

        if (unreadAlerts.length > 0) {
          setCurrentNotification(unreadAlerts[0]);
          setShowNotificationModal(true);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    fetchNotifications();

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
    
    setCurrentNotification(n);
    setShowNotificationModal(true);
    setShowNotificationsMenu(false);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      const token = localStorage.getItem('staff1_token');
      if (token) {
        await fetch('/api/logout', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
      localStorage.removeItem('staff1_token');
      window.location.href = '/staff1';
    } catch (err) {
      console.error('Logout failed', err);
      // Fallback redirect even if fetch fails
      localStorage.removeItem('staff1_token');
      window.location.href = '/staff1';
    }
  };

  const sectionTitles = {
    'dashboard': 'Overview Dashboard',
    'inventory': 'Assets & Supplies Management',
    'equipment': 'Assets & Supplies Management',
    'consumption_supplies': 'Consumption Supplies Report',
    'consumption_equipment': 'Equipment Report',
    'pcr': 'Patient Care Records',
    'alerts': 'Inventory Alerts',
    'events': 'Manage Post-Events',
    'trained_personnel': 'Trained Personnel List',
    'reports': 'Inventory Reports',
    'map': 'Map Monitoring'
  };

  return (
    <>
      <div className="flex justify-between items-center px-8 py-6 border-b border-[#1f1f26] bg-[#0c0c10]/80 backdrop-blur-md sticky top-0 z-40">
        <h2 className="m-0 text-2xl font-bold text-white tracking-wide">
          {sectionTitles[activeSection] || 'Dashboard'}
        </h2>
        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
            className="relative bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] text-gray-300 p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="Notifications"
          >
            <span className="text-xl">🔔</span>
              {(() => {
                const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
                const unreadCount = notifications.filter(n => !readData.ids.includes(n.id)).length;
                return unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>;
              })()}
          </button>

          <button
            onClick={handleLogout}
            className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
            title="Sign Out"
          >
            <span>⏻</span> Sign Out
          </button>

          {showNotificationsMenu && (
            <div className="absolute top-14 right-0 w-80 bg-[#111116] border border-[#202028] rounded-xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
              <div className="p-4 border-b border-[#202028] bg-[#0d0d12] flex justify-between items-center">
                <span className="font-bold text-white text-sm">Notifications</span>
                <span className="text-[10px] bg-[#202028] px-2 py-1 rounded-full text-gray-400 font-semibold uppercase tracking-wider">
                  {notifications.length} Total
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map(n => {
                    const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
                    const isUnread = !readData.ids.includes(n.id);
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className={`p-4 border-b border-[#202028] last:border-0 cursor-pointer transition-colors ${isUnread ? 'bg-[rgba(10,132,255,0.05)]' : 'hover:bg-[#181822]'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-white text-sm pr-4">{n.title}</span>
                          {isUnread && <span className="w-2 h-2 shrink-0 bg-[#0a84ff] rounded-full mt-1.5 shadow-[0_0_8px_rgba(10,132,255,0.6)]"></span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <div className="text-[10px] text-gray-500 mt-2.5 font-medium">
                          {new Date(n.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotificationModal && currentNotification && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="bg-[#111116] border border-[#ef4444]/50 rounded-2xl w-[400px] max-w-[90%] shadow-[0_10px_40px_rgba(239,68,68,0.2)] animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]">
            <div className="flex justify-between items-center p-5 border-b border-[#1f1f26] bg-[rgba(239,68,68,0.05)] rounded-t-2xl">
              <h3 className="m-0 text-[#ef4444] text-lg font-bold flex items-center gap-2">
                <span className="text-xl">🚨</span> System Alert
              </h3>
              <button onClick={dismissNotification} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none text-xl cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-6">
              <h4 className="m-0 mb-3 text-white text-base font-semibold">{currentNotification.title}</h4>
              <p className="m-0 text-gray-300 text-sm leading-relaxed">{currentNotification.message}</p>
            </div>
            <div className="p-5 border-t border-[#1f1f26] bg-[#0c0c10] rounded-b-2xl">
              <button 
                onClick={dismissNotification} 
                className="w-full py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] hover:-translate-y-0.5"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
          <div className="bg-[#111116] border border-[#2b2b35] rounded-2xl w-[400px] max-w-[90%] shadow-2xl animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]">
            <div className="flex justify-between items-center p-5 border-b border-[#1f1f26] bg-[rgba(239,68,68,0.05)] rounded-t-2xl">
              <h3 className="m-0 text-[#ef4444] text-lg font-bold flex items-center gap-2">
                <span className="text-xl">⏻</span> Sign Out
              </h3>
              <button onClick={() => setShowLogoutModal(false)} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none text-xl cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="m-0 text-gray-300 text-sm leading-relaxed">
                Are you sure you want to sign out of your account?
              </p>
            </div>
            <div className="p-5 border-t border-[#1f1f26] bg-[#0c0c10] rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="px-5 py-2.5 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout} 
                className="px-5 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
