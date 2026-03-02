import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Calendar, MapPin, ChevronRight, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

import { Group } from '../types/shop';

// Map coach IDs to Names (mock or fetch)
const COACH_NAMES: Record<string, string> = {
    'coach_1': 'Иван Иванов',
    'coach_2': 'Петр Петров',
    // ... better to fetch from 'coaches' collection if available
};

const GroupsSection = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'kids' | 'teens' | 'adults'>('all');
    // Force re-render every minute to update "Live" status
    const [, setTick] = useState(0);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const q = query(collection(db, "groups"), orderBy("ageRange.min"));
                const snapshot = await getDocs(q);
                setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
            } catch (err) {
                console.error("Error fetching groups:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();

        // Timer for real-time updates
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const isLessonActive = (group: Group): boolean => {
        if (group.currentStatus === 'cancelled') return false;

        const now = new Date();
        const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon
        const daysMap = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const currentDayName = daysMap[currentDayIndex];

        return group.schedule?.some(s => {
            if (s.day !== currentDayName) return false;

            // Parse time "18:00"
            const [hours, minutes] = s.time.split(':').map(Number);
            const lessonStart = new Date(now);
            lessonStart.setHours(hours, minutes, 0);

            // Assume lesson is 1.5 hours ? Or standard 60 mins? 
            // Better to add Duration to schedule, but for now assume 90 mins
            const lessonEnd = new Date(lessonStart);
            lessonEnd.setMinutes(lessonStart.getMinutes() + 90);

            return now >= lessonStart && now <= lessonEnd;
        }) || false;
    };

    const filteredGroups = groups.filter(g => {
        if (filter === 'all') return true;
        if (filter === 'kids') return g.ageRange.max <= 10;
        if (filter === 'teens') return g.ageRange.min >= 10 && g.ageRange.max < 18;
        if (filter === 'adults') return g.ageRange.min >= 18;
        return true;
    });

    return (
        <section id="groups" className="py-20 bg-black relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sparta-gold/5 blur-[100px] rounded-full users-none pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-russo text-white mb-6">
                        Наши <span className="text-transparent bg-clip-text bg-gradient-to-r from-sparta-gold to-yellow-600">Группы</span>
                    </h2>
                    <p className="text-white/60 text-lg max-w-2xl mx-auto">
                        Профессиональные тренировки для всех возрастов и уровней подготовки.
                        Выберите свою команду и начните путь к победам!
                    </p>
                </div>

                {/* Filters */}
                <div className="flex justify-center gap-4 mb-12 flex-wrap">
                    {[
                        { id: 'all', label: 'Все группы' },
                        { id: 'kids', label: 'Дети (3-10)' },
                        { id: 'teens', label: 'Подростки (10-18)' },
                        { id: 'adults', label: 'Взрослые (18+)' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${filter === f.id
                                    ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20 scale-105'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-white/40">Загрузка групп...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map((group, idx) => {
                            const active = isLessonActive(group);
                            const isCancelled = group.currentStatus === 'cancelled';
                            const isSubstitute = group.currentStatus === 'substitute';

                            return (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    viewport={{ once: true }}
                                    className={`group relative bg-[#121212] border rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl ${active
                                            ? 'border-green-500/50 hover:shadow-green-500/10'
                                            : isCancelled
                                                ? 'border-red-500/50 hover:shadow-red-500/10 opacity-70'
                                                : isSubstitute
                                                    ? 'border-yellow-500/50 hover:shadow-yellow-500/10'
                                                    : 'border-white/10 hover:border-sparta-gold/30 hover:shadow-sparta-gold/10'
                                        }`}
                                >
                                    {/* Status Badges */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {active && (
                                            <div className="bg-green-500/20 text-green-500 border border-green-500/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                ИДЕТ ЗАНЯТИЕ
                                            </div>
                                        )}
                                        {isCancelled && (
                                            <div className="bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                                                ОТМЕНА
                                            </div>
                                        )}
                                        {isSubstitute && (
                                            <div className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                                                ЗАМЕНА
                                            </div>
                                        )}
                                        {!active && !isCancelled && !isSubstitute && (
                                            <div className="bg-white/5 text-white/40 px-3 py-1 rounded-lg text-xs font-bold border border-white/10">
                                                {group.ageRange.min}-{group.ageRange.max} лет
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${isCancelled ? 'bg-red-500/10 text-red-500' : 'bg-sparta-gold/10 text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black'
                                            }`}>
                                            <Users size={24} />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2 font-russo group-hover:text-sparta-gold transition-colors">
                                            {group.name}
                                        </h3>

                                        <div className="text-white/40 text-sm flex items-center gap-2 mb-2">
                                            <Users size={14} /> 10 мест в группе
                                        </div>

                                        {/* Status Message */}
                                        {group.statusMessage && (isCancelled || isSubstitute) && (
                                            <div className={`p-3 rounded-lg text-sm border font-medium ${isCancelled
                                                    ? 'bg-red-900/10 border-red-500/20 text-red-400'
                                                    : 'bg-yellow-900/10 border-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {isSubstitute && <span className="block text-xs uppercase opacity-70 mb-1">Замена тренера</span>}
                                                {group.statusMessage}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        {group.schedule && group.schedule.length > 0 ? (
                                            group.schedule.slice(0, 3).map((s, i) => (
                                                <div key={i} className="flex items-center gap-3 text-sm text-white/60 bg-white/5 p-2 rounded-lg">
                                                    <Calendar size={14} className={active && s.day === ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][new Date().getDay()] ? "text-green-500" : "text-sparta-gold"} />
                                                    <span className="font-bold text-white">{s.day}:</span>
                                                    <span>{s.time}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-white/30 text-sm italic">Расписание уточняется</div>
                                        )}
                                    </div>

                                    <button
                                        disabled={isCancelled}
                                        className={`w-full py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${isCancelled
                                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                : 'bg-white/5 text-white hover:bg-sparta-gold hover:text-black'
                                            }`}
                                    >
                                        {isCancelled ? 'Запись закрыта' : 'Записаться'}
                                        {!isCancelled && <ChevronRight size={16} />}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default GroupsSection;
