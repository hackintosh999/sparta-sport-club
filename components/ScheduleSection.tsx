import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, SectionHeader } from './UIComponents';
import { ChevronRight } from 'lucide-react';
import { ScheduleDay, ScheduleItem } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const COACH_IMAGES: Record<string, string> = {
    "Сергей Пономарев": "/sergey-ponomarev.png",
    "Антон Глазунов": "/anton-glazunov.png",
    "Аксинья Лебедева": "/aksinya-lebedeva.png",
    "Сергей Кубарь": "/sergey-kubar-gold.png",
    "Павел Якупов": "/pavel-yakupov-gold.png"
};

export const ScheduleSection = () => {
    const [days, setDays] = useState<ScheduleDay[]>([]);
    const [selectedDay, setSelectedDay] = useState<ScheduleDay | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'schedule'), orderBy('order'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const daysData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ScheduleDay));
            setDays(daysData);
            if (daysData.length > 0 && !selectedDay) {
                setSelectedDay(daysData[0]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedDay]);

    if (loading) return null;

    const currentDay = selectedDay || days[0] || null;

    return (
        <section id="schedule" className="py-24 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/bg-schedule-v6.png"
                    alt="Stadium Background"
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-sparta-black via-transparent to-sparta-black opacity-80" />
            </div>

            <Container className="relative z-10">
                <SectionHeader
                    title="РАСПИСАНИЕ"
                    subtitle="Выберите удобное время для тренировок и начните свой путь к вершине."
                />

                <div className="flex flex-col lg:flex-row gap-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden">
                    {/* Days Sidebar */}
                    <div className="lg:w-1/3 bg-black/40 p-6 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible no-scrollbar">
                        {days.length > 0 ? days.map((day) => (
                            <button
                                key={day.id}
                                onClick={() => setSelectedDay(day)}
                                className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 text-left min-w-[200px] lg:min-w-0 border-2 ${currentDay?.id === day.id
                                    ? 'bg-white/10 border-sparta-gold text-sparta-gold shadow-[0_0_20px_rgba(255,183,0,0.2)]'
                                    : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12 shrink-0">
                                        <motion.img
                                            src="/calendar-3d.png"
                                            alt="Calendar"
                                            className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,183,0,0.4)]"
                                            animate={{
                                                y: [0, -4, 0],
                                                rotate: [0, 5, 0]
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />
                                    </div>
                                    <span className="font-russo tracking-wider text-lg">{day.day}</span>
                                </div>
                                <ChevronRight
                                    size={20}
                                    className={`transition-transform duration-300 ${currentDay?.id === day.id ? 'rotate-90 lg:rotate-0' : 'opacity-0'}`}
                                />
                            </button>
                        )) : (
                            <div className="text-white/30 text-center py-8 font-manrope">Пусто</div>
                        )}
                    </div>

                    {/* Schedule Content */}
                    <div className="lg:w-2/3 p-6 lg:p-10">
                        <AnimatePresence mode="wait">
                            {currentDay ? (
                                <motion.div
                                    key={currentDay.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    {currentDay.items.length > 0 ? currentDay.items.map((item, idx) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="group relative flex flex-col md:flex-row md:items-center gap-8 p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-sparta-gold/30 hover:bg-white/10 transition-all"
                                        >
                                            <div className="flex items-center gap-6 md:w-48 shrink-0">
                                                <div className="w-16 h-16 flex items-center justify-center relative overflow-visible">
                                                    <motion.img
                                                        src="/clock-3d.png"
                                                        alt="Time"
                                                        className="w-28 h-28 object-contain drop-shadow-[0_0_20px_rgba(255,183,0,0.5)]"
                                                        animate={{
                                                            y: [0, -6, 0],
                                                            rotate: [0, 8, 0]
                                                        }}
                                                        transition={{
                                                            duration: 5,
                                                            repeat: Infinity,
                                                            delay: idx * 0.2,
                                                            ease: "easeInOut"
                                                        }}
                                                    />
                                                </div>
                                                <span className="font-russo text-white tracking-widest text-xl">{item.time}</span>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="font-russo text-2xl text-white mb-3 group-hover:text-sparta-gold transition-colors">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-4 text-white/50 text-sm font-manrope">
                                                    <div className="w-12 h-12 rounded-full border-2 border-sparta-gold/30 p-0.5 overflow-hidden shrink-0">
                                                        <img
                                                            src={COACH_IMAGES[item.trainer] || "/helmet-3d.png"}
                                                            alt={item.trainer}
                                                            className="w-full h-full object-cover rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-white/80 font-bold">{item.trainer}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-sparta-gold text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                                    <div className="w-6 h-6 flex items-center justify-center">
                                                        <img src="/shield-3d.png" alt="Type" className="w-full h-full object-contain mix-blend-screen brightness-150 contrast-150 [mask-image:radial-gradient(circle,white_70%,transparent_100%)]" />
                                                    </div>
                                                    {item.type}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )) : (
                                        <div className="text-center py-20 text-white/30 font-manrope">
                                            На этот день тренировок пока нет.
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="text-center py-24 text-white/30 font-manrope">
                                    <h3 className="text-2xl font-russo text-white mb-4 uppercase">Расписание обновляется</h3>
                                    <p>Пожалуйста, загляните позже или свяжитесь с нами.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </Container>
        </section>
    );
};
