import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Plus, X, Clock } from 'lucide-react';

const Events = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // New Event State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('events')
            .select(`
        *,
        profiles:creator_id (username, avatar_url),
        participants:event_participants (
           status,
           profiles:user_id (username, avatar_url)
        )
      `)
            .order('date_time', { ascending: true });

        if (data) setEvents(data);
    };

    useEffect(() => {
        fetchEvents();

        const channel = supabase
            .channel('public:events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => fetchEvents())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const createEvent = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('events')
                .insert([{
                    creator_id: user.id,
                    title,
                    description: desc,
                    date_time: date,
                    location_name: location
                }])
                .select()
                .single();

            if (error) throw error;

            // Auto-join creator
            await supabase
                .from('event_participants')
                .insert([{ event_id: data.id, user_id: user.id, status: 'going' }]);

            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error(err);
            alert('Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    const rsvp = async (eventId, status) => {
        // Check if already participant
        // Simplest: upsert logic if we had unique constraint on (event_id, user_id) which we do in schema
        const { error } = await supabase
            .from('event_participants')
            .upsert([{ event_id: eventId, user_id: user.id, status }]);

        if (error) {
            console.error(error);
            alert("Error joining event. Check console.");
        } else {
            // Optional: Provide visual feedback if needed, but Realtime update should handle the UI
            // fetchEvents(); // Realtime listener handles this
        }
    };

    const resetForm = () => {
        setTitle('');
        setDesc('');
        setDate('');
        setLocation('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Events Planner</h1>
                    <p className="text-slate-400">Don't miss the next hang.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Event
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                    <div key={event.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-colors flex flex-col">
                        <div className="p-5 flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold line-clamp-2">{event.title}</h3>
                                <div className="flex text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                                    {new Date(event.date_time).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-300">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-violet-400" />
                                    <span>{new Date(event.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {event.location_name && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-pink-400" />
                                        <span>{event.location_name}</span>
                                    </div>
                                )}
                            </div>

                            {event.description && (
                                <p className="text-sm text-slate-500 line-clamp-3">{event.description}</p>
                            )}

                            {/* Participants */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Who's Coming</p>
                                <div className="flex -space-x-2 overflow-hidden py-1">
                                    {event.participants?.filter(p => p.status === 'going').map((p, idx) => (
                                        <img
                                            key={idx}
                                            src={p.profiles?.avatar_url || 'https://via.placeholder.com/30'}
                                            alt={p.profiles?.username}
                                            title={p.profiles?.username}
                                            className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 bg-slate-800 object-cover"
                                        />
                                    ))}
                                    {(!event.participants || event.participants.length === 0) && (
                                        <span className="text-xs text-slate-600 italic">No one yet... be the first!</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-slate-800/50 border-t border-slate-800 flex gap-2">
                            <button
                                onClick={() => rsvp(event.id, 'going')}
                                className="flex-1 py-2 bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                Count Me In
                            </button>
                            <button
                                onClick={() => rsvp(event.id, 'maybe')}
                                className="flex-1 py-2 bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 rounded-lg text-sm font-bold transition-colors"
                            >
                                Maybe
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* New Event Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-xl font-bold mb-6">Plan a Hangout</h2>

                        <form onSubmit={createEvent} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                                <input
                                    required
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 mt-1" // minimal styling for date input
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                <textarea
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    rows="3"
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 mt-1 resize-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-2"
                            >
                                {loading ? 'Creating...' : 'Create Event'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
