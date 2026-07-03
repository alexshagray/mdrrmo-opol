import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function UserManagement({ token, handleLogout }) {
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'approved'
    const queryClient = useQueryClient();

    const { data: usersData, isLoading: loading, error: queryError, refetch: fetchUsers } = useQuery({
        queryKey: ['adminUsers', page],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users?page=${page}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    handleLogout();
                    throw new Error('Session expired or unauthorized.');
                }
                throw new Error('Failed to retrieve user accounts.');
            }
            return res.json();
        },
        enabled: !!token
    });

    const error = queryError?.message || null;
    const users = usersData?.data || [];
    const totalUsers = usersData?.total || 0;

    const approveMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/admin/users/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Approval failed.');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
        onError: (e) => alert(e.message),
        onSettled: () => setActionLoadingId(null)
    });

    const rejectMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Rejection failed.');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
        onError: (e) => alert(e.message),
        onSettled: () => setActionLoadingId(null)
    });

    const handleApprove = (id) => {
        setActionLoadingId(id);
        approveMutation.mutate(id);
    };

    const handleReject = (id) => {
        if (!confirm('Are you sure you want to reject and delete this registration request?')) return;
        setActionLoadingId(id);
        rejectMutation.mutate(id);
    };

    // Derived State Filters
    const pendingUsers = users.filter(u => !u.approved && u.role !== 'admin' && u.role !== 'resident');
    const approvedResponders = users.filter(u => u.approved && u.role !== 'admin' && u.role !== 'resident');

    const filteredUsers = users.filter(user => {
        if (user.role === 'admin' || user.role === 'resident') return false;
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterTab === 'pending') return matchesSearch && !user.approved;
        if (filterTab === 'approved') return matchesSearch && user.approved;
        return matchesSearch;
    });

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 relative z-10">
            {/* Stats Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#111116] border border-[#202028] p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(10,132,255,0.05),transparent_70%)]" />
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Total Registrations</div>
                    <div className="text-3xl font-black text-white">{totalUsers}</div>
                    <div className="text-xs text-gray-500 mt-2">All submitted accounts</div>
                </div>

                <div className="bg-[#111116] border border-[#202028] p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.05),transparent_70%)]" />
                    <div className="text-xs font-semibold text-[#f59e0b] uppercase tracking-widest mb-2">Pending Approvals</div>
                    <div className="text-3xl font-black text-[#f59e0b]">{pendingUsers.length}</div>
                    <div className="text-xs text-amber-500/70 mt-2">Action required by admin</div>
                </div>

                <div className="bg-[#111116] border border-[#202028] p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_70%)]" />
                    <div className="text-xs font-semibold text-[#10b981] uppercase tracking-widest mb-2">Approved Responders</div>
                    <div className="text-3xl font-black text-[#10b981]">{approvedResponders.length}</div>
                    <div className="text-xs text-emerald-500/70 mt-2">Active Responder App clients</div>
                </div>
            </div>

            {/* Dashboard Operations Section */}
            <div className="bg-[#111116] border border-[#202028] rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-[#202028] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d12]">
                    <div>
                        <h3 className="text-xl font-bold text-white">Manage User Accounts</h3>
                        <p className="text-xs text-gray-400 mt-1">Review, approve, or reject first responder registrations</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search name or email..."
                                className="w-full sm:w-64 bg-[#181822] border border-[#2b2b35] pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#0a84ff] transition-all text-white placeholder-gray-500"
                            />
                        </div>

                        <button
                            onClick={fetchUsers}
                            className="bg-[#181822] hover:bg-[#20202b] border border-[#2b2b35] p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            title="Refresh list"
                        >
                            <svg className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 12H18" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-[#202028] bg-[#0c0c10] px-6 py-2 gap-2">
                    <button
                        onClick={() => setFilterTab('all')}
                        className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer ${filterTab === 'all' ? 'bg-[#1c1c24] text-white border border-[#2c2c36]' : 'text-gray-400 hover:text-white'}`}
                    >
                        All ({totalUsers})
                    </button>
                    <button
                        onClick={() => setFilterTab('pending')}
                        className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer ${filterTab === 'pending' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40' : 'text-gray-400 hover:text-white'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilterTab('approved')}
                        className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer ${filterTab === 'approved' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'text-gray-400 hover:text-white'}`}
                    >
                        Approved
                    </button>
                </div>

                <div className="p-6">
                    {loading && users.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-gray-600 border-t-[#0a84ff] rounded-full animate-spin" />
                            <span className="text-sm text-gray-400 font-medium">Fetching accounts...</span>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <p className="text-red-400 font-semibold mb-4">{error}</p>
                            <button
                                onClick={fetchUsers}
                                className="bg-[#0a84ff] hover:bg-[#0070df] text-white font-semibold px-6 py-2 rounded-xl transition-all cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-16 text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-sm font-semibold">No registrations found</p>
                            <p className="text-xs text-gray-600 mt-1">Try adjusting your filters or search terms</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#202028] text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="pb-4">Name / Role</th>
                                        <th className="pb-4">Email</th>
                                        <th className="pb-4">Registration Date</th>
                                        <th className="pb-4">Status</th>
                                        <th className="pb-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#181822]">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="text-sm group hover:bg-[#15151b]/40 transition-colors">
                                            <td className="py-4.5 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-[#181822] border border-[#2b2b35] flex items-center justify-center font-bold text-gray-300">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white group-hover:text-[#0a84ff] transition-colors">{user.name}</div>
                                                        <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4.5 pr-4 text-gray-300 font-mono text-xs">{user.email}</td>
                                            <td className="py-4.5 pr-4 text-gray-400 text-xs">
                                                {new Date(user.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="py-4.5 pr-4">
                                                {user.approved ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Approved
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/50 text-amber-400 border border-amber-800/40">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                        Pending Approval
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4.5 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    {!user.approved && (
                                                        <button
                                                            onClick={() => handleApprove(user.id)}
                                                            disabled={actionLoadingId === user.id}
                                                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md hover:shadow-emerald-600/10 cursor-pointer flex items-center gap-1"
                                                        >
                                                            {actionLoadingId === user.id ? (
                                                                <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                'Approve'
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleReject(user.id)}
                                                        disabled={actionLoadingId === user.id}
                                                        className="bg-red-650 hover:bg-red-500/80 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all border border-red-500/30 cursor-pointer flex items-center gap-1"
                                                    >
                                                        {actionLoadingId === user.id ? (
                                                            <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            user.approved ? 'Delete' : 'Reject'
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-[#202028] flex justify-between items-center bg-[#0d0d12]">
                    <span className="text-sm text-gray-400">
                        Showing page {usersData?.current_page || 1} of {usersData?.last_page || 1}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={!usersData?.prev_page_url}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 bg-[#181822] border border-[#2b2b35] rounded-xl text-sm disabled:opacity-50 hover:bg-[#20202b]"
                        >
                            Previous
                        </button>
                        <button 
                            disabled={!usersData?.next_page_url}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-[#181822] border border-[#2b2b35] rounded-xl text-sm disabled:opacity-50 hover:bg-[#20202b]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
