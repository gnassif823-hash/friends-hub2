import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, Plus, X } from 'lucide-react';

const Gallery = () => {
    const { user } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');

    const fetchPhotos = async () => {
        const { data } = await supabase
            .from('photos')
            .select('*, profiles:uploader_id(username, avatar_url)')
            .order('created_at', { ascending: false });

        if (data) setPhotos(data);
    };

    useEffect(() => {
        fetchPhotos();

        const channel = supabase
            .channel('public:photos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
                } else {
                    fetchPhotos();
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

        setUploading(true);
        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            // 2. Insert into DB
            const { error: dbError } = await supabase
                .from('photos')
                .insert([{
                    uploader_id: user.id,
                    url: publicUrl,
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

    const handleDelete = async (photo) => {
        if (!confirm("Delete this photo?")) return;

        // Try to delete from storage (best effort, relies on url parsing)
        try {
            const path = photo.url.split('/').pop(); // simplistic, works for our flat structure
            if (path) {
                await supabase.storage.from('gallery').remove([path]);
            }
        } catch (e) {
            console.error("Storage delete fail", e);
        }

        const { error } = await supabase.from('photos').delete().eq('id', photo.id);
        if (error) {
            alert("Failed to delete photo");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Photo Gallery</h1>
                    <p className="text-slate-400">Memories from the hangouts.</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Photo
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                        <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <p className="text-white font-medium text-sm truncate">{photo.caption}</p>
                            <p className="text-slate-400 text-xs">by {photo.profiles?.username}</p>

                            {photo.uploader_id === user.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(photo);
                                    }}
                                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded-full"
                                    title="Delete Photo"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
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

                        <h2 className="text-xl font-bold mb-4">Upload a Memory</h2>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-violet-500" />
                                    <span className="text-sm text-slate-300">
                                        {file ? file.name : "Click to select photo"}
                                    </span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Caption</label>
                                <input
                                    type="text"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="#GoodTimes"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !file}
                                className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Post Photo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
