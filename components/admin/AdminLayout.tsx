import { Link, Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { Users, FileText, MessageSquare, LogOut, Home, Settings, Newspaper, MessageCircle, Calendar, Layers, Tag, Disc, ShoppingBag, Trophy, ShieldAlert, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


const AdminLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const navItems = [
        { path: '/admin', icon: Home, label: 'Главная' },
        { path: '/admin/users', icon: Users, label: 'Пользователи' },
        { path: '/admin/requests', icon: FileText, label: 'Заявки' },
        { path: '/admin/messages', icon: MessageSquare, label: 'Сообщения' },
        { path: '/admin/news', icon: Newspaper, label: 'Новости' },
        { path: '/admin/directions', icon: Layers, label: 'Направления' },
        { path: '/admin/groups', icon: Users, label: 'Группы' },
        { path: '/admin/achievements', icon: Trophy, label: 'Награды' },
        { path: '/admin/team', icon: Users, label: 'Команда' },
        { path: '/admin/schedule', icon: Calendar, label: 'Расписание' },
        { path: '/admin/comments', icon: MessageCircle, label: 'Модерация' },
        { path: '/admin/promos', icon: Tag, label: 'Промокоды' },
        { path: '/admin/bonus', icon: Disc, label: 'Колесо Фортуны' },
        { path: '/admin/bans', icon: ShieldAlert, label: 'Бан-лист' },
        { path: '/admin/settings', icon: Settings, label: 'Настройки' },
        { path: '/admin/shop', icon: ShoppingBag, label: 'Магазин' },
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-russo text-sparta-gold uppercase">SPARTA</h1>
                    <span className="text-white text-xs block font-manrope opacity-50">Admin Panel</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden text-white/50 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                            ${isActive
                                ? 'bg-sparta-gold text-black font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                : 'text-white/50 hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <item.icon size={18} />
                        <span className="truncate">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                >
                    <LogOut size={18} />
                    <span>Выйти</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020202] flex font-manrope overflow-x-hidden">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-6 z-40">
                <h1 className="text-xl font-russo text-sparta-gold uppercase">SPARTA</h1>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-white/5 rounded-lg text-white"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 bg-[#1a1a1a] border-r border-white/5 flex-col fixed h-full z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
                        />
                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-[#1a1a1a] border-r border-white/5 flex flex-col z-[70] lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? 'blur-sm lg:blur-none' : ''} lg:ml-64 pt-16 lg:pt-0 p-4 lg:p-8`}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
