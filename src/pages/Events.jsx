import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { Calendar, MapPin, Plus, Clock, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const Events = () => {
    const { currentUser } = useAppContext();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        fetchEvents();

        // Subscribe to new events
        const channel = supabase
            .channel('public:events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
                setEvents(prev => [...prev, payload.new].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, (payload) => {
                setEvents(prev => prev.filter(e => e.id !== payload.old.id));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', new Date().toISOString()) // Only future events
                .order('event_date', { ascending: true });

            if (data) setEvents(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const eventDateTime = new Date(`${date}T${time}:00`).toISOString();

        const { error } = await supabase.from('events').insert({
            title,
            description,
            event_date: eventDateTime,
            location,
            created_by: currentUser.id
        });

        if (!error) {
            setShowCreateModal(false);
            // Reset form
            setTitle('');
            setDescription('');
            setDate('');
            setTime('');
            setLocation('');
            // Refetch or let subscription handle it (subscription is safer for consistent ID)
            fetchEvents();
        } else {
            alert('Failed to create event: ' + error.message);
        }
        setSubmitting(false);
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Cancel this plan?')) return;

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) {
            alert('Failed to delete plan.');
        }
    };

    return (
        <div className="h-full bg-slate-950 text-slate-100 p-4 overflow-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="text-cyan-400" /> Crew Hangouts
                    </h1>
                    <p className="text-slate-400 text-sm">Upcoming plans with the squad</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
                >
                    <Plus size={20} /> <span className="hidden md:inline">Plan Hangout</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-cyan-400" size={40} /></div>
            ) : events.length === 0 ? (
                <div className="text-center mt-20 p-8 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                    <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300">No upcoming hangouts</h3>
                    <p className="text-slate-500 mb-6">Everyone is free! Why not plan something?</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-cyan-400 font-bold hover:underline"
                    >
                        Create an Event
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {events.map(event => (
                        <div key={event.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/30 transition-all group relative overflow-hidden">
                            {/* Decoration */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-slate-100 pr-8 break-words">{event.title}</h3>
                                {currentUser.id === event.created_by && (
                                    <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                                        title="Cancel Plan"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                <Clock size={16} className="text-cyan-400" />
                                {new Date(event.event_date).toLocaleDateString()} at {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                                <MapPin size={16} className="text-red-400" />
                                {event.location || 'No location set'}
                            </div>

                            {event.description && (
                                <div className="bg-slate-950 p-3 rounded-xl text-sm text-slate-300 mb-4 border border-slate-800/50">
                                    {event.description}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded-full border border-slate-800">
                                    Upcoming
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold mb-6 text-white">Plan a Hangout</h2>

                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-slate-400 text-sm font-bold mb-2">What's the plan?</label>
                                <input
                                    required
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Cinema Night, Beach Day..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-sm font-bold mb-2">Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-bold mb-2">Time</label>
                                    <input
                                        required
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-sm font-bold mb-2">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-500" size={20} />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="Add a location..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-sm font-bold mb-2">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Any details? Who's bringing snacks?"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors h-24"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="animate-spin" size={16} />}
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
