import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { MapPin, MessageSquare, Video, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const Dashboard = () => {
    const { user, updateProfile } = useAuth();
    const [friends, setFriends] = useState([]);
    const navigate = useNavigate();

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        const fetchFriends = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id) // Exclude self
                .order('last_seen', { ascending: false });

            if (data) setFriends(data);
        };

        fetchFriends();

        const channel = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                if (payload.new.id === user.id) return; // Ignore self updates if any

                if (payload.eventType === 'INSERT') {
                    setFriends(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setFriends(prev => prev.map(f => f.id === payload.new.id ? payload.new : f));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user.id]);

    // Update own status
    const handleStatusChange = async (newStatus) => {
        await updateProfile({ status: newStatus });
    };

    const statusOptions = [
        { value: 'Available', color: 'bg-green-500', label: 'Available' },
        { value: 'Busy', color: 'bg-red-500', label: 'Busy' },
        { value: 'Away', color: 'bg-amber-500', label: 'Away' },
        { value: 'Code Red', color: 'bg-purple-600', label: 'Code Red' },
    ];

    return (
        <div className="space-y-8">
            {/* Header & My Status */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-2">
                    <h1 className="text-3xl font-bold">Welcome back, {user.username}</h1>
                    <p className="text-slate-400">Here's what's happening with the crew.</p>
                </div>

                {/* Status Card */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400">My Status</span>
                        <div className={clsx(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-opacity-20 flex items-center gap-2",
                            user.status === 'Available' && "bg-green-500 text-green-400",
                            user.status === 'Busy' && "bg-red-500 text-red-400",
                            user.status === 'Away' && "bg-amber-500 text-amber-400",
                            user.status === 'Code Red' && "bg-purple-600 text-purple-400 animate-pulse"
                        )}>
                            <span className={clsx("w-2 h-2 rounded-full",
                                user.status === 'Available' ? "bg-green-400" :
                                    user.status === 'Busy' ? "bg-red-400" :
                                        user.status === 'Away' ? "bg-amber-400" :
                                            "bg-purple-400"
                            )}></span>
                            {user.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {statusOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleStatusChange(opt.value)}
                                className={clsx(
                                    "h-10 rounded-lg transition-all border-2",
                                    user.status === opt.value
                                        ? `border-${opt.color.split('-')[1]}-500 bg-${opt.color.split('-')[1]}-500/20`
                                        : "border-transparent bg-slate-800 hover:bg-slate-700"
                                )}
                                title={opt.label}
                            >
                                <div className={`w-3 h-3 rounded-full mx-auto ${opt.color}`}></div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Friends Grid */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    Friend List
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full">{friends.length}</span>
                </h2>

                {friends.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        No friends found yet. Invite them to join!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {friends.map((friend) => (
                            <div key={friend.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700 transition-colors group">
                                <div className="relative">
                                    <img
                                        src={friend.avatar_url || 'https://via.placeholder.com/50'}
                                        alt={friend.username}
                                        className="w-14 h-14 rounded-full bg-slate-800 object-cover"
                                    />
                                    <div className={clsx(
                                        "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900",
                                        friend.status === 'Available' ? "bg-green-500" :
                                            friend.status === 'Busy' ? "bg-red-500" :
                                                friend.status === 'Away' ? "bg-amber-500" :
                                                    "bg-purple-600 animate-pulse"
                                    )}></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold truncate pr-2">{friend.username}</h3>
                                        <span className="text-xs text-slate-500 whitespace-nowrap bg-slate-800 px-1.5 py-0.5 rounded">
                                            {new Date(friend.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 truncate">
                                        {friend.status_message ||
                                            (friend.status === 'Available' ? 'Ready to hang?' : friend.status)}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate('/lounge')}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/20 hover:text-violet-400 text-slate-400 transition-colors"
                                            title="Message"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate('/call')}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-pink-600/20 hover:text-pink-400 text-slate-400 transition-colors"
                                            title="Call"
                                        >
                                            <Video className="w-4 h-4" />
                                        </button>
                                        {friend.location_lat && (
                                            <button
                                                onClick={() => navigate('/map')}
                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 text-slate-400 transition-colors"
                                                title="Locate"
                                            >
                                                <MapPin className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
