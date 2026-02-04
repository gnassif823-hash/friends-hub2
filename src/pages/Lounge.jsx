import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, Trash2, Image as ImageIcon, X } from 'lucide-react';

const Lounge = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
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

        const channel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
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

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || uploading) return;

        setUploading(true);
        try {
            let imageUrl = null;
            const content = newMessage.trim();

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `chat_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('gallery')
                    .upload(fileName, selectedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('gallery')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            const { error } = await supabase
                .from('messages')
                .insert([{
                    user_id: user.id,
                    content: content,
                    image_url: imageUrl
                }]);

            if (error) {
                console.error('Error sending message:', error);
                alert("Failed to send message");
            } else {
                setNewMessage('');
                setSelectedFile(null);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error sending message");
        } finally {
            setUploading(false);
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

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[60%]`}>
                                    <div
                                        className={`px-4 py-2 rounded-2xl text-sm break-words relative w-fit shadow-md ${isMe
                                            ? 'bg-violet-600 text-white rounded-br-none'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                            }`}
                                    >
                                        {!isMe && !isSequential && (
                                            <p className="text-xs text-violet-300 mb-1 font-bold">{msg.profiles?.username || 'Unknown'}</p>
                                        )}

                                        {msg.image_url && (
                                            <img
                                                src={msg.image_url}
                                                alt="Shared content"
                                                className="rounded-lg mb-2 max-h-60 object-cover w-full border border-white/10"
                                            />
                                        )}

                                        {msg.content && <p>{msg.content}</p>}

                                        <div className="flex items-center justify-end gap-2 mt-1 opacity-70">
                                            <p className={`text-[10px] ${isMe ? 'text-violet-200' : 'text-slate-500'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    {isMe && (
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="text-slate-500 hover:text-red-500 transition-colors mt-1 p-1"
                                            title="Delete Message"
                                        >
                                            <Trash2 className="w-3 h-3" />
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
                {selectedFile && (
                    <div className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg mb-2 text-xs">
                        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                    />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-900 border-transparent text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || uploading}
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
