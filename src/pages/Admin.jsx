import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Shield, Check, Ban, Trash2, Search, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

const Admin = () => {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, active, banned

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAction = async (userId, action) => {
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            let updates = {};
            if (action === 'approve') updates = { account_status: 'active' };
            if (action === 'ban') updates = { account_status: 'banned' };

            if (action === 'delete') {
                const { error } = await supabase.from('profiles').delete().eq('id', userId);
                if (error) throw error;
                setUsers(prev => prev.filter(u => u.id !== userId));
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === userId ? data : u));
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
            alert(`Failed to ${action} user: ` + error.message);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u?.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || u?.account_status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <ErrorBoundary>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 text-red-500">
                            <Shield className="w-8 h-8" />
                            Admin Control
                        </h1>
                        <p className="text-slate-400">Manage access to the Hub.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white px-4 py-2 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Joined</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500">Loading users...</td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500">No users found.</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={u.avatar_url}
                                                        alt={u.username}
                                                        className="w-10 h-10 rounded-full bg-slate-800 border-slate-700 object-cover"
                                                    />
                                                    <span className="font-bold text-white">{u.username}</span>
                                                    {u.id === user.id && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">You</span>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.account_status === 'active' ? 'bg-green-500/10 text-green-400' :
                                                    u.account_status === 'banned' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-yellow-500/10 text-yellow-400'
                                                    }`}>
                                                    {(u.account_status || 'unknown').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-400">
                                                {u.role || 'user'}
                                            </td>
                                            <td className="p-4 text-sm text-slate-500">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {u.account_status === 'pending' && (
                                                        <button
                                                            onClick={() => handleAction(u.id, 'approve')}
                                                            className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {u.account_status !== 'banned' && u.id !== user.id && (
                                                        <button
                                                            onClick={() => handleAction(u.id, 'ban')}
                                                            className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                                                            title="Ban User"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {u.account_status === 'banned' && (
                                                        <button
                                                            onClick={() => handleAction(u.id, 'approve')}
                                                            className="p-2 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600 hover:text-white rounded-lg transition-colors"
                                                            title="Unban (Set Active)"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {u.id !== user.id && (
                                                        <button
                                                            onClick={() => handleAction(u.id, 'delete')}
                                                            className="p-2 bg-slate-700 text-slate-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                                                            title="Delete Data"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default Admin;
