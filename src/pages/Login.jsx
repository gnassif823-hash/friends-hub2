import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            await login(username.trim());
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to join. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid places-items-center bg-slate-950 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent mb-2">
                        Friends Hub
                    </h1>
                    <p className="text-slate-400">Join the circle. No passwords needed.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Who are you?
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full bg-slate-800 border-slate-700 text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span>Connecting...</span>
                            ) : (
                                <>
                                    <span>EnterHub</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-slate-600 text-xs">
                    By entering, you agree to be cool and not spam.
                </p>
            </div>
        </div>
    );
};

export default Login;
