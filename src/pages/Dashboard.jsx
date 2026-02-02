import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { MapPin, MessageSquare, Video, Clock, Send, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
    const { user, updateProfile } = useAuth();
    const [friends, setFriends] = useState([]);
    const navigate = useNavigate();

    // Status State
    const [statusMsg, setStatusMsg] = useState(user.status_message || '');
    const [locationTxt, setLocationTxt] = useState(user.location_text || '');
    const [isUpdating, setIsUpdating] = useState(false);

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

    // Update Status Logic
    const handleStatusUpdate = async (newStatus) => {
        // If clicking the same status, don't trigger update unless we have text changes pending
        // But here we just update everything for simplicity
        setIsUpdating(true);
        await updateProfile({
            status: newStatus,
            status_message: statusMsg,
            location_text: locationTxt
        });
        setIsUpdating(false);
    };

    const statusOptions = [
        { value: 'Available', color: 'bg-green-500', label: 'Available' },
        { value: 'Busy', color: 'bg-red-500', label: 'Busy' },
        { value: 'Away', color: 'bg-amber-500', label: 'Away' },
        { value: 'Code Red', color: 'bg-purple-600', label: 'Code Red' },
    ];

    const getTimeSince = (dateString) => {
        if (!dateString) return '';
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true }).replace('about ', '');
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header & My Status */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-2">
                    <h1 className="text-3xl font-bold">Welcome back, {user.username}</h1>
                    <p className="text-slate-400">Update your status so friends know what's up.</p>
                </div>

                {/* Rich Status Card */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400">My Status</span>
                        {user.is_visible === false && (
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> Ghost Mode
                            </span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {/* Text Inputs */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Doing what? (e.g. Gaming)"
                                value={statusMsg}
                                onChange={(e) => setStatusMsg(e.target.value)}
                                className="flex-1 bg-slate-800 text-sm text-white rounded-lg px-3 py-2 outline-none border border-transparent focus:border-violet-500 transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Where? (e.g. Starbucks)"
                                value={locationTxt}
                                onChange={(e) => setLocationTxt(e.target.value)}
                                className="flex-1 bg-slate-800 text-sm text-white rounded-lg px-3 py-2 outline-none border border-transparent focus:border-violet-500 transition-colors"
                            />
                        </div>

                        {/* Color Toggles */}
                        <div className="grid grid-cols-4 gap-2 pt-2">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleStatusUpdate(opt.value)}
                                    disabled={isUpdating}
                                    className={clsx(
                                        "h-10 rounded-lg transition-all border-2 flex items-center justify-center",
                                        user.status === opt.value
                                            ? `border-${opt.color.split('-')[1]}-500 bg-${opt.color.split('-')[1]}-500/20`
                                            : "border-transparent bg-slate-800 hover:bg-slate-700"
                                    )}
                                    title={opt.label}
                                >
                                    <div className={`w-3 h-3 rounded-full ${opt.color}`}></div>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">
                            Click a color to save everything.
                        </p>
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
                            <div key={friend.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700 transition-colors group relative overflow-hidden">

                                {/* Status Indicator Bar */}
                                <div className={clsx(
                                    "absolute left-0 top-0 bottom-0 w-1",
                                    friend.status === 'Available' ? "bg-green-500" :
                                        friend.status === 'Busy' ? "bg-red-500" :
                                            friend.status === 'Away' ? "bg-amber-500" :
                                                "bg-purple-600"
                                )}></div>

                                <div className="relative pl-2">
                                    <img
                                        src={friend.avatar_url || 'https://via.placeholder.com/50'}
                                        alt={friend.username}
                                        className="w-14 h-14 rounded-full bg-slate-800 object-cover"
                                    />
                                    {friend.is_visible === false && (
                                        <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-0.5 border border-slate-700" title="Ghost Mode">
                                            <EyeOff className="w-3 h-3 text-slate-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-exhibit font-bold truncate pr-2 text-lg">{friend.username}</h3>
                                        {friend.status_since && (
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {getTimeSince(friend.status_since)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Rich Status Display */}
                                    <div className="text-sm mt-1">
                                        <p className="text-slate-200 font-medium truncate">
                                            {friend.status_message || <span className="text-slate-500 italic">No status</span>}
                                        </p>
                                        {friend.location_text && (
                                            <p className="text-violet-400 text-xs flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" />
                                                {friend.location_text}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate('/lounge')}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/20 hover:text-violet-400 text-slate-400 transition-colors"
                                            title="Message"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        {(friend.location_lat && friend.is_visible !== false) && (
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
