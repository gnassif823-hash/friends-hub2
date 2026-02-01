import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { Image as ImageIcon, Upload, X, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const Gallery = () => {
    const { currentUser } = useAppContext();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        fetchPhotos();

        const channel = supabase
            .channel('public:gallery_posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery_posts' }, (payload) => {
                setPhotos(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gallery_posts' }, (payload) => {
                setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
                if (selectedPhoto && selectedPhoto.id === payload.old.id) {
                    setSelectedPhoto(null);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [selectedPhoto]);

    const fetchPhotos = async () => {
        try {
            const { data, error } = await supabase
                .from('gallery_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) setPhotos(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            // 3. Insert into Database
            const { error: dbError } = await supabase.from('gallery_posts').insert({
                image_url: publicUrl,
                caption: '',
                uploaded_by: currentUser.id
            });

            if (dbError) throw dbError;

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    // Note: We are just deleting the DB record. Strict implementation would also delete from storage bucket.
    const handleDeletePhoto = async (photoId, e) => {
        if (e) e.stopPropagation();

        if (!confirm('Are you sure you want to delete this photo?')) return;

        const { error } = await supabase
            .from('gallery_posts')
            .delete()
            .eq('id', photoId);

        if (error) {
            console.error(error);
            alert('Failed to delete photo');
        } else {
            if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
        }
    };

    return (
        <div className="h-full bg-slate-950 text-slate-100 p-4 overflow-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ImageIcon className="text-purple-400" /> Shared Memories
                    </h1>
                    <p className="text-slate-400 text-sm">Best moments with the crew</p>
                </div>

                <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2">
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                    <span className="hidden md:inline">Upload Photo</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </label>
            </div>

            {loading ? (
                <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-purple-400" size={40} /></div>
            ) : photos.length === 0 ? (
                <div className="text-center mt-20 p-8 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                    <ImageIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300">No photos yet</h3>
                    <p className="text-slate-500 mb-6">Share the first memory!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map(photo => (
                        <div
                            key={photo.id}
                            onClick={() => setSelectedPhoto(photo)}
                            className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-slate-800 hover:border-purple-500/50 transition-colors"
                        >
                            <img
                                src={photo.image_url}
                                alt="Memory"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 justify-between">
                                <span className="text-xs text-white/90">
                                    {new Date(photo.created_at).toLocaleDateString()}
                                </span>
                                {currentUser.id === photo.uploaded_by && (
                                    <button
                                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                                        className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-50">
                        <X size={32} />
                    </button>
                    {/* Delete button in lightbox too */}
                    {currentUser.id === selectedPhoto.uploaded_by && (
                        <button
                            onClick={(e) => handleDeletePhoto(selectedPhoto.id, e)}
                            className="absolute top-4 right-20 text-white/70 hover:text-red-400 p-2 z-50 flex items-center gap-2"
                        >
                            <Trash2 size={24} />
                        </button>
                    )}

                    <img
                        src={selectedPhoto.image_url}
                        alt="Full size"
                        className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default Gallery;
