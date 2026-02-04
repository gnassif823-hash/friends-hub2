import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
    Home,
    Map,
    MessageCircle,
    Image,
    Calendar,
    Video,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    // Status Color Logic
    const getStatusColor = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-500';
            case 'Busy': return 'bg-red-500';
            case 'Away': return 'bg-amber-500';
            case 'Code Red': return 'bg-purple-600 animate-pulse';
            default: return 'bg-slate-400';
        }
    };

    const navItems = [
        { name: 'Dashboard', icon: Home, path: '/' },
        { name: 'Live Map', icon: Map, path: '/map' },
        { name: 'The Lounge', icon: MessageCircle, path: '/lounge' },
        { name: 'Photo Gallery', icon: Image, path: '/gallery' },
        { name: 'Reels', icon: Video, path: '/reels' },
        { name: 'Events', icon: Calendar, path: '/events' },
        { name: 'Call Center', icon: Video, path: '/call' },
    ];

    const handleLogout = () => {
        if (confirm('Are you sure you want to leave?')) {
            logout();
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-50 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
                    Friends Hub
                </h1>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar Navigation */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transition-transform transform md:translate-x-0 md:static",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 hidden md:block">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
                            Friends Hub
                        </h1>
                    </div>

                    {/* User Profile Snippet */}
                    <div className="p-4 mx-4 mb-4 rounded-xl bg-slate-800/50 flex items-center gap-3 border border-slate-700/50">
                        <div className="relative">
                            <img
                                src={user?.avatar_url || 'https://via.placeholder.com/40'}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full border-2 border-slate-600 object-cover"
                            />
                            <div className={clsx("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800", getStatusColor(user?.status))}></div>
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{user?.username}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.role === 'admin' ? 'Administrator' : user?.status}</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                    isActive
                                        ? "bg-violet-600/10 text-violet-400 border border-violet-600/20 shadow-[0_0_15px_-5px_var(--color-brand-primary)]"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Settings & Logout */}
                    <div className="p-4 border-t border-slate-800 space-y-1">
                        <NavLink
                            to="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive ? "text-violet-400 bg-violet-600/10" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Settings className="w-5 h-5" />
                            <span>Settings</span>
                        </NavLink>

                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                    <div className="p-2 text-center text-[10px] text-slate-600">
                        v2.2
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative w-full pt-16 md:pt-0">
                <div className="h-full overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;
