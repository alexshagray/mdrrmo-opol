import React, { useState } from 'react';

export default function AdminNavbar({ adminUser, notifications, showNotificationsMenu, setShowNotificationsMenu, handleLogout, onNotificationClick }) {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    return (
        <nav className="border-b border-[#1f1f26] bg-[#0c0c10]/80 backdrop-blur-md sticky top-0 z-[100]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#181822] p-2 rounded-xl border border-[#2b2b35]">
                            <img src="/images/mdrrmo_logo.png" alt="MDRRMO Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <span className="text-lg font-black text-white tracking-wider">MDRRMO Management System</span>
                            <span className="text-xs block text-gray-400 font-medium">Emergency Control Dashboard</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right mr-4">
                            <div className="text-sm font-semibold text-white">{adminUser?.name || 'Admin'}</div>
                            <div className="text-xs text-gray-400">System Administrator</div>
                        </div>
                        <div className="relative mr-4" style={{display: 'flex', alignItems: 'center'}}>
                            <button 
                                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                                className="bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] text-gray-300 p-2 rounded-xl transition-all cursor-pointer relative"
                            >
                                🔔
                                {(() => {
                                    const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
                                    const unreadCount = notifications.filter(n => !readData.ids.includes(n.id)).length;
                                    return unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>;
                                })()}
                            </button>
                            {showNotificationsMenu && (
                                <div className="absolute top-12 right-0 w-80 bg-[#111116] border border-[#202028] rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-[#202028] bg-[#0d0d12] font-bold text-white text-sm flex justify-between items-center">
                                        <span>Notifications</span>
                                        <span className="text-xs bg-[#202028] px-2 py-0.5 rounded-full text-gray-400">{notifications.length} Total</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-gray-500 text-xs">No notifications yet</div>
                                        ) : (
                                            notifications.map(n => {
                                                const readData = JSON.parse(localStorage.getItem('readNotificationsData') || '{"date":"","ids":[]}');
                                                const isUnread = !readData.ids.includes(n.id);
                                                return (
                                                    <div 
                                                        key={n.id} 
                                                        onClick={() => onNotificationClick && onNotificationClick(n)}
                                                        className={`p-4 border-b border-[#202028] last:border-0 cursor-pointer transition-colors ${isUnread ? 'bg-[rgba(10,132,255,0.05)]' : 'hover:bg-[#181822]'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-semibold text-white text-sm">{n.title}</span>
                                                            {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full mt-1"></span>}
                                                        </div>
                                                        {n.title === 'Inventory Report Submission' ? (
                                                            <p className="text-xs text-[#0a84ff] mt-1 font-semibold">📄 Tap to download PDF Report</p>
                                                        ) : (
                                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                                        )}
                                                        <div className="text-[10px] text-gray-500 mt-2">{new Date(n.created_at).toLocaleString()}</div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className="bg-[#181822] hover:bg-red-950/30 border border-[#2b2b35] hover:border-red-800/50 text-gray-300 hover:text-red-400 text-sm px-4 py-2 rounded-xl transition-all cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <div className="bg-[#111116] border border-[#1f1f26] rounded-2xl w-full max-w-sm shadow-2xl animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)] overflow-hidden">
                        <div className="flex flex-col items-center p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                                <span className="text-red-500 text-3xl">🚪</span>
                            </div>
                            <h3 className="text-white text-lg font-bold mb-2">Sign Out</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Are you sure you want to log out of the Admin Control Center?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 py-2.5 bg-[#181822] border border-[#2b2b35] text-gray-300 rounded-lg font-semibold hover:bg-[#20202b] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowLogoutModal(false);
                                        handleLogout();
                                    }}
                                    className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Yes, Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
