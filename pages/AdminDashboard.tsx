import React, { useState, useEffect } from 'react';
import { Users, FileText, ShoppingBag, TrendingUp, Clock, PlusCircle, Edit3, Tag, MessageCircle, ChevronRight, Activity, X, Phone, CheckCircle, ExternalLink, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    // --- State for Stats ---
    const [totalUsers, setTotalUsers] = useState(0);
    const [activeSubscriptions, setActiveSubscriptions] = useState(0);
    const [newRequests, setNewRequests] = useState(0);
    const [shopRevenue, setShopRevenue] = useState(0);

    // --- State for Charts & Feed ---
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State for Event Modal ---
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    useEffect(() => {
        // Initialize 7 days array
        const labels = Array.from({ length: 7 }, (_, i) => {
            return format(subDays(new Date(), 6 - i), 'dd MMM', { locale: ru });
        });

        const revByDay: Record<string, number> = {};
        const reqByDay: Record<string, number> = {};
        labels.forEach(l => { revByDay[l] = 0; reqByDay[l] = 0; });

        let reqsUpdated = false;
        let ordersUpdated = false;

        const maybeUpdateChart = () => {
            if (reqsUpdated && ordersUpdated) {
                const finalData = labels.map(day => ({
                    name: day,
                    Выручка: revByDay[day],
                    Заявки: reqByDay[day] * 1000 // Multiplied just to be visible on same axis as revenue
                }));
                setChartData(finalData);
            }
        };

        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setTotalUsers(snapshot.size);
            let activeCount = 0;
            snapshot.forEach(doc => {
                if (doc.data().subscription?.status === 'active') activeCount++;
            });
            setActiveSubscriptions(activeCount);
        });

        const qRequests = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            let newCount = 0;
            const tempActivity: any[] = [];

            labels.forEach(l => reqByDay[l] = 0);

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'new' || !data.status) newCount++;

                if (data.createdAt?.seconds) {
                    const dayStr = format(new Date(data.createdAt.seconds * 1000), 'dd MMM', { locale: ru });
                    if (reqByDay[dayStr] !== undefined) reqByDay[dayStr]++;
                }

                if (tempActivity.length < 10) {
                    tempActivity.push({
                        type: 'request',
                        id: doc.id,
                        title: 'Новая заявка',
                        desc: `${data.childName || 'Без имени'} (${data.parentPhone || 'Нет телефона'})`,
                        timestamp: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                        icon: FileText,
                        color: 'text-sparta-gold',
                        rawData: data
                    });
                }
            });

            setNewRequests(newCount);
            reqsUpdated = true;
            updateActivityFeed(tempActivity, 'requests');
            maybeUpdateChart();
        });

        const qOrders = query(collection(db, "shop_orders"), orderBy("createdAt", "desc"));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            let totalRev = 0;
            const tempActivity: any[] = [];

            labels.forEach(l => revByDay[l] = 0);

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'completed') {
                    totalRev += (data.totalAmount || 0);

                    if (data.createdAt?.seconds) {
                        const dayStr = format(new Date(data.createdAt.seconds * 1000), 'dd MMM', { locale: ru });
                        if (revByDay[dayStr] !== undefined) revByDay[dayStr] += (data.totalAmount || 0);
                    }
                }

                if (tempActivity.length < 10) {
                    tempActivity.push({
                        type: 'order',
                        id: doc.id,
                        title: `Заказ #${doc.id.slice(0, 6)}`,
                        desc: `${data.totalAmount} ₽ от ${data.buyerEmail || 'Неизвестно'}`,
                        timestamp: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                        icon: ShoppingBag,
                        color: 'text-emerald-400',
                        rawData: data
                    });
                }
            });

            setShopRevenue(totalRev);
            ordersUpdated = true;
            updateActivityFeed(tempActivity, 'orders');
            maybeUpdateChart();
        });

        const feedCache: { requests: any[], orders: any[] } = { requests: [], orders: [] };
        const updateActivityFeed = (newData: any[], source: 'requests' | 'orders') => {
            feedCache[source] = newData;
            const combined = [...feedCache.requests, ...feedCache.orders].sort((a, b) => b.timestamp - a.timestamp);
            setRecentActivity(combined.slice(0, 8));
            setLoading(false);
        };

        return () => {
            unsubUsers();
            unsubRequests();
            unsubOrders();
        };
    }, []);

    const handleUpdateEventStatus = async (id: string, collectionName: string, newStatus: string) => {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, { status: newStatus });
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Ошибка при обновлении статуса");
        }
    };

    const openInAppChat = async (req: any) => {
        if (!req.email) {
            alert("Для открытия чата необходим Email пользователя.");
            return;
        }

        try {
            const q = query(collection(db, "messages"), where("email", "==", req.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                navigate(`/admin/messages?id=${snapshot.docs[0].id}`);
            } else {
                const docRef = await addDoc(collection(db, "messages"), {
                    userId: req.userId || null,
                    name: `${req.childSurname || req.name} ${req.childName || ''}`,
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Контакт из дашборда'}`,
                    message: req.comment || 'Запрос из панели управления',
                    status: 'new',
                    createdAt: serverTimestamp(),
                    thread: [{
                        text: req.comment || `Запрос на программу: ${req.programType || 'Общие вопросы'}`,
                        sender: 'user',
                        senderName: req.childName || req.name,
                        createdAt: Timestamp.now()
                    }]
                });
                navigate(`/admin/messages?id=${docRef.id}`);
            }
        } catch (error) {
            console.error("Error opening chat:", error);
            alert("Ошибка при открытии чата.");
        }
    };

    const stats = [
        { label: 'Всего пользователей', value: totalUsers, icon: Users, color: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]', trend: 'В базе данных' },
        { label: 'Активные подписки', value: activeSubscriptions, icon: TrendingUp, color: 'text-purple-500', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]', trend: 'Конверсия ' + (totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 100) : 0) + '%' },
        { label: 'Новые заявки', value: newRequests, icon: FileText, color: 'text-yellow-500', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]', trend: 'Требуют внимания' },
        { label: 'Выручка (Магазин)', value: `${shopRevenue.toLocaleString()} ₽`, icon: ShoppingBag, color: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]', trend: 'За всё время' },
    ];

    const quickActions = [
        { label: 'Добавить группу', icon: PlusCircle, path: '/admin/groups', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30' },
        { label: 'Создать новость', icon: Edit3, path: '/admin/news', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30' },
        { label: 'Новый промокод', icon: Tag, path: '/admin/promos', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/30' },
        { label: 'Модерация', icon: MessageCircle, path: '/admin/comments', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/30' },
    ];

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Activity size={32} className="text-sparta-gold animate-pulse" />
                <span className="text-white/50 font-manrope">Сбор данных со спутников...</span>
            </div>
        </div>
    );

    return (
        <div className="relative">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-10"
            >
                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-russo text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 mb-2">Обзор клуба</h1>
                        <p className="text-white/40 text-sm font-manrope">Сводка данных и метрики за последние 7 дней</p>
                    </div>
                    <div className="text-right bg-[#111] px-5 py-3 rounded-2xl border border-white/5 shadow-md hidden md:block">
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{format(new Date(), 'eeee', { locale: ru })}</p>
                        <p className="text-white font-russo text-xl tracking-wide">{format(new Date(), 'dd MMMM yyyy', { locale: ru })}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, i) => (
                        <Link key={i} to={action.path} className={`relative flex items-center justify-between p-4 rounded-2xl border ${action.border} bg-gradient-to-br ${action.color} hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all group overflow-hidden`}>
                            <div className="flex items-center gap-3 relative z-10">
                                <action.icon size={20} className="text-white/70 group-hover:text-white transition-colors" />
                                <span className="font-manrope text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{action.label}</span>
                            </div>
                            <ChevronRight size={16} className="text-white/30 group-hover:translate-x-1 group-hover:text-white/70 transition-all relative z-10 mx-2" />
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
                        </Link>
                    ))}
                </motion.div>

                {/* Main Stats */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <div key={index} className="relative bg-[#111] border border-white/5 p-6 rounded-3xl overflow-hidden group hover:border-white/10 transition-colors shadow-lg">
                            {/* Glow effect */}
                            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-current opacity-[0.03] blur-2xl rounded-full group-hover:opacity-[0.08] transition-opacity ${stat.color}`} />

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center ${stat.color} ${stat.glow} transition-all duration-500`}>
                                    <stat.icon size={26} className="drop-shadow-lg" />
                                </div>
                                <span className="text-white/40 text-[10px] font-bold uppercase px-2.5 py-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                                    {stat.trend}
                                </span>
                            </div>
                            <h3 className="text-3xl lg:text-4xl font-bold text-white font-russo mb-2 relative z-10 tracking-wide">{stat.value}</h3>
                            <p className="text-white/40 text-sm font-manrope relative z-10">{stat.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Content Row: Chart & Feed */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Revenue Chart */}
                    <motion.div variants={itemVariants} className="xl:col-span-2 bg-[#111] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-russo text-white mb-1">Динамика заказов</h2>
                                <p className="text-white/40 text-xs font-manrope">Сумма оплаченных заказов за последние 7 дней</p>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                <TrendingUp size={14} />
                                <span className="text-xs font-bold font-manrope">Рост</span>
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#ffffff20', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', padding: '12px' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Manrope' }}
                                        labelStyle={{ color: '#ffffff80', marginBottom: '8px', fontSize: '12px', fontFamily: 'Manrope' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="Выручка"
                                        stroke="#34d399"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorRev)"
                                        activeDot={{ r: 6, fill: '#111', stroke: '#34d399', strokeWidth: 3 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Recent Activity Feed */}
                    <motion.div variants={itemVariants} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col shadow-lg">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                                <Clock size={20} />
                            </div>
                            <h2 className="text-xl font-russo text-white">Лента событий</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mt-2">
                            {recentActivity.length === 0 ? (
                                <div className="text-white/30 text-center py-8 font-manrope text-sm h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl">
                                    Нет недавней активности
                                </div>
                            ) : (
                                recentActivity.map((activity, idx) => {
                                    const Icon = activity.icon;
                                    return (
                                        <div
                                            key={`${activity.type}-${activity.id}-${idx}`}
                                            onClick={() => setSelectedEvent(activity)}
                                            className="flex gap-4 p-4 rounded-2xl bg-[#1a1a1a] border border-white/5 hover:border-white/20 hover:bg-[#222] transition-all group cursor-pointer"
                                        >
                                            <div className={`w-11 h-11 rounded-xl bg-[#111] flex items-center justify-center flex-shrink-0 align-self-start border border-white/5 shadow-inner ${activity.color} group-hover:scale-110 transition-transform`}>
                                                <Icon size={18} className="drop-shadow-md" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-white font-bold text-sm truncate group-hover:text-sparta-gold transition-colors">{activity.title}</h4>
                                                    <span className="text-[10px] text-white/30 whitespace-nowrap ml-2 font-bold px-2 py-0.5 bg-white/5 rounded-full">
                                                        {format(new Date(activity.timestamp), 'HH:mm', { locale: ru })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/50 truncate font-manrope leading-tight">{activity.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                </div>
            </motion.div>

            {/* Interactive Event Details Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvent(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div className={`absolute -top-20 -right-20 w-64 h-64 bg-current opacity-5 blur-3xl rounded-full ${selectedEvent.color}`} />

                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-4 mb-8 relative z-10">
                                <div className={`w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center ${selectedEvent.color} shadow-lg shrink-0`}>
                                    <selectedEvent.icon size={32} />
                                </div>
                                <div className="min-w-0 pr-8">
                                    <h2 className="text-2xl font-russo text-white truncate">{selectedEvent.title}</h2>
                                    <p className="text-white/40 text-sm font-manrope mt-1">
                                        {format(new Date(selectedEvent.timestamp), 'd MMMM yyyy, HH:mm', { locale: ru })}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Основная информация</p>
                                    <p className="text-white/90 font-manrope text-base leading-relaxed">{selectedEvent.desc}</p>

                                    {selectedEvent.type === 'order' && selectedEvent.rawData?.items && (
                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                            {selectedEvent.rawData.items.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-sm font-manrope">
                                                    <span className="text-white/70 truncate mr-2">{item.name} <span className="text-white/30 ml-2">x{item.quantity}</span></span>
                                                    <span className="text-white font-bold whitespace-nowrap">{item.price * item.quantity} ₽</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 text-sm font-manrope">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-white/50">Статус:</span>
                                        <span className="text-white font-bold">{selectedEvent.rawData?.status || (selectedEvent.type === 'request' ? 'new' : 'unknown')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-white/50">ID:</span>
                                        <span className="text-white font-mono">{selectedEvent.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 relative z-10">
                                {selectedEvent.type === 'request' && (
                                    <>
                                        <button
                                            onClick={() => openInAppChat(selectedEvent.rawData)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-sparta-gold/20 hover:bg-sparta-gold/30 text-sparta-gold border border-sparta-gold/30 py-3.5 px-6 rounded-xl font-bold transition-all font-manrope hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                                        >
                                            <MessageSquare size={18} />
                                            Написать
                                        </button>
                                        {(selectedEvent.rawData?.status === 'new' || !selectedEvent.rawData?.status) && (
                                            <button
                                                onClick={() => handleUpdateEventStatus(selectedEvent.id, 'requests', 'contacted')}
                                                className="flex-1 flex items-center justify-center gap-2 bg-sparta-gold text-black py-3.5 px-6 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all font-manrope hover:scale-105"
                                            >
                                                <CheckCircle size={18} />
                                                В работу
                                            </button>
                                        )}
                                    </>
                                )}

                                {selectedEvent.type === 'order' && (
                                    <>
                                        <Link
                                            to="/admin/shop"
                                            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 py-3.5 px-6 rounded-xl font-bold transition-all font-manrope hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        >
                                            <ExternalLink size={18} />
                                            Перейти в магазин
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
