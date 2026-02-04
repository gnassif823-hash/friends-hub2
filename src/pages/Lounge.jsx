import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, User } from 'lucide-react';

const Lounge = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Initial fetch of last 50 messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
                .order('created_at', { ascending: true })
                .limit(50);

            if (!error && data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };

        fetchMessages();

        // Subscribe to new messages
        // Subscribe to new messages and deletions
        const channel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                // Fetch the sender profile for the new message
                const { data: userData } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', payload.new.user_id)
                    .single();

                const messageWithUser = {
                    ...payload.new,
                    profiles: userData
                };

                setMessages((prev) => [...prev, messageWithUser]);
                setTimeout(scrollToBottom, 100);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
                setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage.trim();
        setNewMessage('');

        const { error } = await supabase
            .from('messages')
            .insert([{ user_id: user.id, content }]);

        if (error) {
            console.error('Error sending message:', error);
            // Optional: Show error toast
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!confirm("Delete this message?")) return;
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) console.error("Error deleting message:", error);
    };

    return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 backdrop-blur-md">
                <h2 className="font-bold flex items-center gap-2">
                    The Lounge
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                </h2>
                <p className="text-xs text-slate-400">Where everything happens.</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-2">
                        <p>It's quiet... too quiet.</p>
                        <p className="text-xs">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.user_id === user.id;
                        const isSequential = index > 0 && messages[index - 1].user_id === msg.user_id;

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSequential ? 'mt-1' : 'mt-4'} group`}
                            >
                                {!isSequential && (
                                    <img
                                        src={msg.profiles?.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${msg.user_id}`}
                                        alt="Avatar"
                                        className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 object-cover flex-shrink-0"
                                    />
                                )}
                                {isSequential && <div className="w-8 flex-shrink-0" />}

                                <div className="flex flex-col items-end">
                                    <div
                                        className={`max-w-[70%] sm:max-w-[60%] px-4 py-2 rounded-2xl text-sm break-words relative ${isMe
                                            ? 'bg-violet-600 text-white rounded-br-none'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                            }`}
                                    >
                                        {!isMe && !isSequential && (
                                            <p className="text-xs text-violet-300 mb-1 font-bold">{msg.profiles?.username || 'Unknown'}</p>
                                        )}
                                        {msg.content}
                                        <div className="flex items-center justify-end gap-2 mt-1 opacity-70">
                                            <p className={`text-[10px] ${isMe ? 'text-violet-200' : 'text-slate-500'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    {isMe && (
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Say something..."
                        className="flex-1 bg-slate-900 border-transparent text-slate-100 placeholder-slate-500 rounded-xl px-4 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Lounge;
