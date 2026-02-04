import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, Eye, EyeOff, Upload } from 'lucide-react';

const Settings = () => {
    const { user, updateProfile } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
    const [isVisible, setIsVisible] = useState(user?.is_visible !== false); // Default true
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let finalAvatarUrl = avatarUrl;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `avatar_${user.id}_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('gallery') // Reusing gallery bucket as it is publicly accessible
                    .upload(fileName, avatarFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('gallery')
                    .getPublicUrl(fileName);

                finalAvatarUrl = publicUrl;
            }

            await updateProfile({
                username,
                avatar_url: finalAvatarUrl,
                status_message: statusMessage,
                is_visible: isVisible
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update profile: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">Settings</h2>
                <p className="text-slate-400">Manage your persona & privacy.</p>
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
                            <label className="block text-sm font-medium text-slate-400 mb-2">Profile Picture</label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl transition-colors text-sm font-medium flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Choose Message
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setAvatarFile(file);
                                                setAvatarUrl(URL.createObjectURL(file)); // Preview
                                            }
                                        }}
                                    />
                                </label>
                                <span className="text-xs text-slate-500">
                                    {avatarFile ? avatarFile.name : 'No file chosen'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Privacy</label>
                            <div
                                onClick={() => setIsVisible(!isVisible)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isVisible
                                    ? 'bg-violet-900/10 border-violet-500/30'
                                    : 'bg-slate-800 border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {isVisible ? <Eye className="text-violet-400" /> : <EyeOff className="text-slate-400" />}
                                    <div>
                                        <p className={`font-bold ${isVisible ? 'text-violet-300' : 'text-slate-300'}`}>
                                            {isVisible ? 'Visible on Map' : 'Ghost Mode (Hidden)'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {isVisible ? 'Friends can see your location.' : 'You are invisible on the map.'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${isVisible ? 'bg-violet-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isVisible ? 'left-7' : 'left-1'}`}></div>
                                </div>
                            </div>
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
