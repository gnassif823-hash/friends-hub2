import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, AlertCircle } from 'lucide-react';

const Settings = () => {
    const { user, updateProfile } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await updateProfile({
                username,
                avatar_url: avatarUrl,
                status_message: statusMessage
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">Settings</h2>
                <p className="text-slate-400">Manage your persona.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex items-center gap-6 mb-8">
                        <img
                            src={avatarUrl || 'https://via.placeholder.com/80'}
                            alt="Preview"
                            className="w-20 h-20 rounded-full border-4 border-slate-800 object-cover bg-slate-800"
                            onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
                        />
                        <div>
                            <h3 className="font-semibold text-lg">{username || 'User'}</h3>
                            <p className="text-sm text-slate-500">This is how you appear to others.</p>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Display Name</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-slate-100 p-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Avatar URL</label>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-slate-800 border-slate-700 text-slate-100 p-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Tip: Use <a href="https://dicebear.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">DiceBear</a> for cool avatars.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Status Message</label>
                            <input
                                type="text"
                                value={statusMessage}
                                onChange={(e) => setStatusMessage(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full bg-slate-800 border-slate-700 text-slate-100 p-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            <AlertCircle className="w-5 h-5" />
                            {message.text}
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
