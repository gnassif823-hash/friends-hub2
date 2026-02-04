import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, Plus, X, Film } from 'lucide-react';

const Reels = () => {
    const { user } = useAuth();
    const [reels, setReels] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');

    const fetchReels = async () => {
        const { data } = await supabase
            .from('reels')
            .select('*, profiles:uploader_id(username, avatar_url)')
            .order('created_at', { ascending: false });

        if (data) setReels(data);
    };

    useEffect(() => {
        fetchReels();

        const channel = supabase
            .channel('public:reels')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setReels(prev => prev.filter(r => r.id !== payload.old.id));
                } else {
                    fetchReels();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        // Simple validation
        if (!file.type.startsWith('video/')) {
            alert("Please select a video file.");
            return;
        }

        setUploading(true);
        try {
            // 1. Upload to Storage (reusing gallery bucket)
            const fileExt = file.name.split('.').pop();
            const fileName = `reel_${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(fileName);

            // 2. Insert into DB
            const { error: dbError } = await supabase
                .from('reels')
                .insert([{
                    uploader_id: user.id,
                    video_url: publicUrl,
                    caption: caption
                }]);

            if (dbError) throw dbError;

            setShowUploadModal(false);
            setFile(null);
            setCaption('');
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload Failed: ${error.message || JSON.stringify(error)}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (reel) => {
        if (!confirm("Delete this reel?")) return;

        const { error } = await supabase.from('reels').delete().eq('id', reel.id);
        if (error) {
            alert("Failed to delete reel");
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Reels</h1>
                    <p className="text-slate-400">Share the moments in motion.</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg hover:shadow-cyan-500/20"
                >
                    <Plus className="w-5 h-5" />
                    New Reel
                </button>
            </div>

            <div className="space-y-8">
                {reels.map((reel) => (
                    <div key={reel.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative group">
                        {/* Header */}
                        <div className="p-4 flex items-center gap-3 border-b border-slate-800/50">
                            <img
                                src={reel.profiles?.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${reel.uploader_id}`}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800"
                            />
                            <div>
                                <p className="font-bold text-sm text-slate-200">{reel.profiles?.username}</p>
                                <p className="text-xs text-slate-500">{new Date(reel.created_at).toLocaleDateString()}</p>
                            </div>

                            {reel.uploader_id === user.id && (
                                <button
                                    onClick={() => handleDelete(reel)}
                                    className="ml-auto text-slate-500 hover:text-red-500 p-2 transition-colors"
                                    title="Delete Reel"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Video */}
                        <div className="bg-black aspect-[9/16] max-h-[600px] flex items-center justify-center">
                            <video
                                src={reel.video_url}
                                controls
                                className="w-full h-full object-contain"
                                loop
                                playsInline
                            />
                        </div>

                        {/* Caption */}
                        {reel.caption && (
                            <div className="p-4">
                                <p className="text-sm text-slate-300">{reel.caption}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Film className="w-6 h-6 text-cyan-500" />
                            Upload Reel
                        </h2>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="hidden"
                                    id="video-upload"
                                />
                                <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-cyan-500" />
                                    <span className="text-sm text-slate-300">
                                        {file ? file.name : "Click to select video"}
                                    </span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Caption</label>
                                <input
                                    type="text"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Check this out!"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !file}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Post Reel'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reels;
