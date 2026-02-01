import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapPin, Clock, Phone, Calendar, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import clsx from 'clsx';

const Dashboard = () => {
    const { currentUser, friends, updateStatus } = useAppContext();
    const [isUpdating, setIsUpdating] = useState(false);
    const [tempStatus, setTempStatus] = useState(currentUser.status);
    const [tempLocation, setTempLocation] = useState(currentUser.location);
    const [nextEvent, setNextEvent] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNextEvent = async () => {
            if (!supabase) return;
            try {
                const { data } = await supabase
                    .from('events')
                    .select('*')
                    .gte('event_date', new Date().toISOString())
                    .order('event_date', { ascending: true })
                    .limit(1)
                    .single();

                if (data) setNextEvent(data);
            } catch (error) {
                // Silent fail for notifications if table missing or other error
                console.log('Notification fetch skipped:', error.message);
            }
        };

        fetchNextEvent();
    }, []);

    const handleUpdate = () => {
        updateStatus({ status: tempStatus, location: tempLocation });
        setIsUpdating(false);
    };

    const availableFriends = friends.filter(f => f.status === 'Available');

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-100">Welcome back, {currentUser.username}!</h1>
                <p className="text-slate-400 mt-2">Here's what's happening with your crew today.</p>
            </header>

            {/* Notification Banner */}
            {nextEvent && (
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-purple-900/20 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-500/20 p-3 rounded-full text-purple-300">
                            <Bell size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-100 text-lg">Upcoming: {nextEvent.title}</h3>
                            <p className="text-purple-200 text-sm flex items-center gap-2">
                                <Calendar size={14} />
                                {new Date(nextEvent.event_date).toLocaleDateString()} at {new Date(nextEvent.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/events')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
                    >
                        View Details
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Status Update Widget */}
                <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-100">Quick Update</h2>
                        {!isUpdating && (
                            <button onClick={() => setIsUpdating(true)} className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
                                Edit Status
                            </button>
                        )}
                    </div>

                    {isUpdating ? (
                        <div className="bg-slate-800/50 p-6 rounded-2xl space-y-4 border border-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                                    <select
                                        value={tempStatus}
                                        onChange={(e) => setTempStatus(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border-slate-700 text-slate-100 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 p-2.5"
                                    >
                                        <option>Available</option>
                                        <option>Busy</option>
                                        <option>Offline</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={tempLocation}
                                        onChange={(e) => setTempLocation(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border-slate-700 text-slate-100 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 p-2.5"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsUpdating(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                                <button onClick={handleUpdate} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/40">Update</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6 bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                            <div className="relative">
                                <img src={currentUser.avatar_url || currentUser.avatar} alt="Me" className="w-20 h-20 rounded-full border-4 border-slate-800 shadow-lg object-cover" />
                                <div className={clsx("absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-slate-950",
                                    currentUser.status === 'Available' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                        currentUser.status === 'Busy' ? 'bg-red-500' : 'bg-slate-600'
                                )}></div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-100">{currentUser.status}</div>
                                <div className="text-cyan-400 flex items-center gap-2">
                                    <MapPin size={16} />
                                    {currentUser.location}
                                </div>
                                <div className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                                    <Clock size={14} />
                                    Until {currentUser.availableUntil}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Counts */}
                <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-center">
                    <h2 className="text-xl font-bold mb-4 text-slate-100">Live Status</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span className="font-medium text-green-200">Available</span>
                            </div>
                            <span className="text-2xl font-bold text-green-400">{availableFriends.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="font-medium text-red-200">Busy</span>
                            </div>
                            <span className="text-2xl font-bold text-red-400">{friends.filter(f => f.status === 'Busy').length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100">
                    Availability Feed
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-sm py-0.5 px-2.5 rounded-full">{availableFriends.length} Active</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableFriends.length > 0 ? availableFriends.map((friend) => (
                        <div key={friend.id} className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-900/10 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={friend.avatar_url || friend.avatar} alt={friend.username} className="w-12 h-12 rounded-full border-2 border-slate-700 shadow-sm object-cover" />
                                <div>
                                    <div className="font-bold text-lg text-slate-100">{friend.username}</div>
                                    <div className="text-sm text-slate-500 flex items-center gap-1">
                                        <MapPin size={12} /> {friend.location}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl text-slate-400 text-sm mb-4 italic border border-slate-800">
                                "{friend.message}"
                            </div>
                            <button
                                onClick={() => navigate('/calls')}
                                className="w-full py-2.5 bg-cyan-600/10 text-cyan-400 border border-cyan-500/50 rounded-xl text-sm font-semibold hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 group-hover:shadow-cyan-500/20"
                            >
                                <Phone size={16} />
                                Call {friend.username}
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-3 text-center py-10 text-slate-600">
                            No one is available right now. Be the first!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
