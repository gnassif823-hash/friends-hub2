import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for persisted session on load
    useEffect(() => {
        const checkSession = async () => {
            const savedUser = localStorage.getItem('friends_hub_user');
            if (savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    // Verify user still exists in DB
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', parsedUser.id)
                        .single();

                    if (data && !error) {
                        setUser(data);
                        // Optionally update last_seen here
                    } else {
                        localStorage.removeItem('friends_hub_user');
                    }
                } catch (e) {
                    console.error("Session parse error", e);
                    localStorage.removeItem('friends_hub_user');
                }
            }
            setLoading(false);
        };

        checkSession();
    }, []);

    const login = async (username) => {
        try {
            // Check if user exists
            let { data: existingUser, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            let currentUser = existingUser;

            if (!existingUser) {
                // Create new user
                const { data: newUser, error: createError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            username,
                            avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
                            status: 'Available'
                        }
                    ])
                    .select()
                    .single();

                if (createError) throw createError;
                currentUser = newUser;
            }

            setUser(currentUser);
            localStorage.setItem('friends_hub_user', JSON.stringify(currentUser));
            return currentUser;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('friends_hub_user');
    };

    const updateProfile = async (updates) => {
        if (!user) return;

        try {
            // If status is changing, update the timestamp
            if (updates.status && updates.status !== user.status) {
                updates.status_since = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            setUser(data);
            localStorage.setItem('friends_hub_user', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error("Profile update error:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
