import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Data Load & Persistance
    useEffect(() => {
        // FORCE DEMO MODE
        console.warn('Authentication disabled. App is in Demo Mode.');

        // Fallback Mock Data
        const mockUser = {
            id: 'mock-user-id',
            username: 'Demo User',
            status: 'Available',
            location: 'Demo City',
            availableUntil: '20:00',
            avatar: 'https://i.pravatar.cc/150?u=me',
            notifications: true,
            locationSharing: 'precise'
        };

        setSession({ user: { id: 'mock-user-id' } });
        setCurrentUser(mockUser);

        // Mock Friends
        setFriends([
            {
                id: 1,
                username: 'Sarah',
                status: 'Available',
                location: 'Blue Bottle Coffee',
                availableUntil: '17:30',
                avatar: 'https://i.pravatar.cc/150?u=sarah',
                message: 'Grabbing coffee, come join!',
                coordinates: [40.7128, -74.0060],
            },
            {
                id: 2,
                username: 'Mike',
                status: 'Busy',
                location: 'Work',
                availableUntil: '19:00',
                avatar: 'https://i.pravatar.cc/150?u=mike',
                message: 'In meetings all day.',
                coordinates: [40.7580, -73.9855],
            },
            {
                id: 3,
                username: 'Jessica',
                status: 'Available',
                location: 'City Library',
                availableUntil: '16:00',
                avatar: 'https://i.pravatar.cc/150?u=jessica',
                message: 'Studying for finals.',
                coordinates: [40.7532, -73.9822],
            },
        ]);

        setLoading(false);
    }, []);



    // Realtime Subscription for Friends Status
    useEffect(() => {
        if (!supabase || !session) return;

        const channel = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                // Update local state when any profile changes
                setFriends((prev) => {
                    const index = prev.findIndex(f => f.id === payload.new.id);
                    if (index !== -1) {
                        const newFriends = [...prev];
                        newFriends[index] = { ...prev[index], ...payload.new };
                        return newFriends;
                    } else if (payload.new.id !== currentUser?.id) {
                        // Add new friend if not self
                        return [...prev, payload.new];
                    }
                    return prev;
                });

                // Update self if needed (though usually optimistic)
                if (payload.new.id === currentUser?.id) {
                    setCurrentUser(payload.new);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
                if (payload.new.id !== currentUser?.id) {
                    setFriends(prev => [...prev, payload.new]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, currentUser?.id]);

    const fetchProfile = async (userId) => {
        try {
            const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (data) setCurrentUser(data);
        } catch (e) { console.error(e); }
    };

    const fetchFriends = async () => {
        try {
            const { data } = await supabase.from('profiles').select('*');
            if (data) {
                // Filter out self
                const { data: { user } } = await supabase.auth.getUser();
                setFriends(data.filter(p => p.id !== user?.id));
            }
            setLoading(false);
        } catch (e) { console.error(e); setLoading(false); }
    };

    const updateStatus = async (newStatus) => {
        if (!currentUser || !supabase) return;

        const updatedUser = { ...currentUser, ...newStatus };
        setCurrentUser(updatedUser); // Optimistic

        await supabase.from('profiles').update(newStatus).eq('id', currentUser.id);
    };

    const logout = async () => {
        if (supabase) await supabase.auth.signOut();
        else {
            setSession(null);
            setCurrentUser(null);
        }
    };

    const value = {
        session,
        currentUser,
        friends,
        loading,
        updateStatus,
        logout
    };

    return (
        <AppContext.Provider value={value}>
            {!loading && children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
