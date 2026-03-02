import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    ChevronRight,
    Star,
    Shield,
    Award,
    Users,
    CheckCircle,
    ArrowRight,
    MapPin,
    Phone,
    Instagram,
    Facebook,
    Twitter,
    Menu,
    X,
    Play,
    Mail,
    Flame,
    ChevronDown,
    Check,
    Gift,
    RefreshCw
} from 'lucide-react';

import { Button, GlassCard, SectionHeader, Container } from './UIComponents';
import { NavItem, Feature, Program, Coach, FAQItem } from '../types';
import TermsModal from './TermsModal';
import TrialModal from './TrialModal';
import AuthModal from './AuthModal';
import NewsSection from './NewsSection';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import ProfileSetupModal from './ProfileSetupModal';
import ContactModal from './ContactModal';
import { ScheduleSection } from './ScheduleSection';
import MembershipModal from './MembershipModal';

// --- Data Constants ---

const NAV_ITEMS: NavItem[] = [
    { label: 'О нас', href: '#about' },
    { label: 'Программы', href: '#programs' },
    { label: 'Расписание', href: '#schedule' },
    { label: 'Магазин', href: '/shop' },
    { label: 'Команда', href: '#team' },
    { label: 'Вопросы', href: '#faq' },
];



const FEATURES: Feature[] = [
    {
        id: 1,
        title: 'Pro Оборудование',
        description: 'Тренажеры Technogym и Hammer Strength, которые используют олимпийцы.',
        iconSrc: '/icon-equipment.png'
    },
    {
        id: 2,
        title: 'Топ Тренеры',
        description: 'Чемпионы мира и мастера спорта к вашим услугам.',
        iconSrc: '/icon-trophy.png'
    },
    {
        id: 3,
        title: 'Уникальная Методика',
        description: 'Научно обоснованные циклы тренировок для максимальной силы и роста.',
        iconSrc: '/icon-flame.png'
    },
    {
        id: 4,
        title: 'Комфорт',
        description: 'Доступ 24/7, премиальная сауна для восстановления и частная парковка.',
        iconSrc: '/icon-comfort.png'
    },
];

const PROGRAMS: Program[] = [
    {
        id: 1,
        title: "Новичок",
        prices: { 3: 13100, 6: 23990, 12: 44990 },
        image: "/junior-tariff.png",
        features: ["2 раза в неделю", "Базовая подготовка", "Групповые занятия", "Безопасная среда"]
    },
    {
        id: 2,
        title: "Профессионал",
        prices: { 3: 19550, 6: 34990, 12: 55990 },
        image: "/champion-tariff.png",
        features: ["3 раза в неделю", "Интенсивная подготовка", "Отработка тактики", "Спортивный анализ"]
    },
    {
        id: 3,
        title: "Чемпион",
        prices: { 3: 26150, 6: 46990, 12: 74990 },
        image: "/pro-tariff.png",
        features: ["4 раза в неделю", "Игровая практика", "Путь в сборную", "Полный комплект экипировки"]
    }
];

const COACHES: Coach[] = [
    { id: 1, name: "Сергей Пономарев", role: "Старший тренер по футболу", image: "/sergey-ponomarev.png" },
    { id: 2, name: "Антон Глазунов", role: "Старший тренер по киле", image: "/anton-glazunov.png" },
    { id: 3, name: "Аксинья Лебедева", role: "Директор футбольного клуба", image: "/aksinya-lebedeva.png" },
    { id: 4, name: "Сергей Кубарь", role: "Тренер по футболу", image: "/sergey-kubar-gold.png" },
    { id: 5, name: "Павел Якупов", role: "Тренер по футболу", image: "/pavel-yakupov-gold.png" },
];

const FAQS: FAQItem[] = [
    { id: 1, question: "Что взять на первую тренировку?", answer: "Только удобную спортивную форму и обувь. Мы предоставляем полотенца, воду и средства для душа." },
    { id: 2, question: "Есть ли возрастные ограничения?", answer: "У нас есть программы для возрастов 14+. Для юниоров требуется письменное согласие родителей." },
    { id: 3, question: "Можно ли заморозить абонемент?", answer: "Да, все годовые абонементы включают 30 дней заморозки на случай отпуска или болезни." },
];

// --- Sub-Components ---

import BonusModal from './bonus/BonusModal';
import GroupsSection from './GroupsSection';

const Navbar = ({ onOpenTrial, onOpenAuth, onOpenBonus }: { onOpenTrial: () => void, onOpenAuth: () => void, onOpenBonus: () => void }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center py-6 px-4">
            <motion.div
                className={`flex items-center justify-between px-8 py-3 rounded-full transition-all duration-500 ${isScrolled
                    ? 'bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl w-full max-w-5xl'
                    : 'bg-transparent w-full max-w-7xl'
                    }`}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <motion.div
                    className="flex items-center gap-2 cursor-pointer group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    whileHover={{ scale: 1.05 }}
                >
                    <motion.img
                        src="/sparta-logo.png"
                        alt="SPARTA Logo"
                        className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                        whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
                    />
                    <motion.div
                        className="font-russo text-2xl tracking-widest text-gold-gradient drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
                    >
                        SPARTA
                    </motion.div>
                </motion.div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={(e) => {
                                if (item.href.startsWith('/')) {
                                    e.preventDefault();
                                    navigate(item.href);
                                }
                            }}
                            className="font-manrope text-sm font-medium text-white/70 hover:text-sparta-gold transition-colors cursor-pointer"
                        >
                            {item.label}
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10 hover:border-sparta-gold/50 transition-all group backdrop-blur-sm"
                            >
                                <span className="text-white/50 text-xs font-bold uppercase tracking-wider group-hover:text-white/70 transition-colors">Баланс:</span>
                                <span className="font-russo text-sparta-gold text-lg drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                                    {userProfile?.walletBalance || 0} ₽
                                </span>
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sparta-gold hover:bg-white/20 transition-all border border-sparta-gold/30 shrink-0"
                            >
                                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full rounded-full object-cover" /> : <span className="font-bold text-lg">{user.displayName?.[0] || 'U'}</span>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={onOpenAuth}
                                className="text-white/70 hover:text-white text-sm font-bold transition-colors"
                            >
                                Войти
                            </button>
                            <Button className="px-6 py-2 text-sm" onClick={onOpenTrial}>Вступить</Button>
                        </>
                    )}

                    {/* Bonus Wheel Trigger */}
                    <motion.button
                        onClick={onOpenBonus}
                        className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-purple-500/50 transition-shadow"
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Gift className="w-5 h-5 text-white" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                    </motion.button>
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </motion.div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-24 left-4 right-4 bg-[#111] border border-white/10 rounded-[32px] p-8 flex flex-col gap-6 items-center shadow-2xl"
                    >
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                onClick={(e) => {
                                    if (item.href.startsWith('/')) {
                                        e.preventDefault();
                                        navigate(item.href);
                                    }
                                    setMobileMenuOpen(false);
                                }}
                                className="font-manrope text-xl text-white cursor-pointer"
                            >
                                {item.label}
                            </a>
                        ))}
                        {user ? (
                            <>
                                <div className="w-full flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/10">
                                    <span className="text-white/50 text-sm font-bold uppercase tracking-wider">Ваш Баланс</span>
                                    <span className="font-russo text-sparta-gold text-xl drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                                        {userProfile?.walletBalance || 0} ₽
                                    </span>
                                </div>
                                <a onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="font-manrope text-xl text-sparta-gold cursor-pointer">Личный кабинет</a>
                            </>
                        ) : (
                            <>
                                <a onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }} className="font-manrope text-xl text-white cursor-pointer">Войти</a>
                                <Button className="w-full" onClick={onOpenTrial}>Вступить</Button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

const Hero = ({ onOpenTrial }: { onOpenTrial: () => void }) => {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 200]);

    return (
        <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-32 pb-20">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sparta-gold/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
            </div>

            <Container className="relative z-10 text-center flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sparta-gold text-xs font-bold tracking-widest uppercase mb-6">
                        <Flame size={14} className="fill-sparta-gold" />
                        Элитный спортивный комплекс
                    </div>

                    <h1 className="font-russo text-5xl md:text-7xl lg:text-9xl leading-tight mb-6">
                        ЗДЕСЬ <br className="md:hidden" />
                        <span className="text-gold-gradient">ЗАРОЖДАЮТСЯ</span>
                        <br />
                        ЧЕМПИОНЫ
                    </h1>

                    <p className="font-manrope text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Создайте свое наследие в среде, созданной для элиты.
                        Современное оборудование, тренеры мирового класса и сообщество победителей.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Button className="group" onClick={onOpenTrial}>
                            Записаться на пробное
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const el = document.getElementById('schedule');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Расписание
                        </Button>
                    </div>
                </motion.div>
            </Container>

            <motion.div style={{ y }} className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sparta-black to-transparent z-10" />
        </section>
    );
};

const Marquee = () => {
    return (
        <div className="bg-sparta-gold py-4 overflow-hidden relative z-20 rotate-1 scale-105 border-y-4 border-black">
            <motion.div
                className="whitespace-nowrap flex gap-12"
                animate={{ x: "-50%" }}
                transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            >
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="flex items-center gap-12">
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">ДИСЦИПЛИНА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">СИЛА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">ПОБЕДА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">СПАРТА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

const WhyUs = () => {
    return (
        <section id="about" className="py-24 relative">
            <Container>
                <SectionHeader
                    title="ПОЧЕМУ МЫ"
                    subtitle="Мы предлагаем не просто зал, а экосистему трансформации, движимую совершенством."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURES.map((feature, idx) => (
                        <motion.div
                            key={feature.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <GlassCard className="h-full flex flex-col items-center text-center hover:bg-white/10 transition-colors group">
                                <div className="w-24 h-24 mb-6 relative flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                                    <div className="absolute inset-0 bg-sparta-gold/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <img src={feature.iconSrc} alt={feature.title} className="w-full h-full object-contain drop-shadow-2xl relative z-10" />
                                    {/* Reflection for icons other than equipment (id: 1) */}
                                    {feature.id !== 1 && (
                                        <div
                                            className="absolute top-[80%] left-0 w-full h-full -scale-y-100 opacity-40 pointer-events-none z-0"
                                            style={{
                                                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 40%)',
                                                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 40%)'
                                            }}
                                        >
                                            <img src={feature.iconSrc} alt="" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-russo text-xl text-white mb-3">{feature.title}</h3>
                                <p className="font-manrope text-white/50 text-sm leading-relaxed">{feature.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

const getPriceInfo = (program: any, duration: number, userProfile?: any) => {
    if (!program || !program.prices) return { monthly: '0', total: '0', originalTotal: null };
    const priceMap = program.prices || {};
    let total = priceMap[duration] || 0;
    let originalTotal = null;

    if (userProfile?.activePromoDiscount) {
        const applicableTo = userProfile.activePromoApplicableTo || 'all';
        if (applicableTo === 'all' || applicableTo === 'subscriptions') {
            originalTotal = total.toLocaleString('ru-RU');
            total = Math.floor(total * (1 - userProfile.activePromoDiscount / 100));
        }
    }

    const monthly = Math.round(total / duration);

    return {
        monthly: monthly.toLocaleString('ru-RU'),
        total: total.toLocaleString('ru-RU'),
        originalTotal
    };
};

const Programs = ({
    duration,
    setDuration,
    onOpenMembership
}: {
    duration: number;
    setDuration: (d: 3 | 6 | 12) => void;
    onOpenMembership: (program: Program, mode?: 'purchase' | 'renew') => void
}) => {
    const { userProfile } = useAuth();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "directions"), (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setPrograms(data);
            setLoading(false);
        }, (error) => {
            console.error("Directions fetch error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getDurationLabel = (d: number) => {
        if (d === 1) return 'Месяц';
        if (d >= 2 && d <= 4) return 'Месяца';
        return 'Месяцев';
    };

    const displayPrograms = (loading || programs.length === 0) ? PROGRAMS : programs;

    return (
        <section id="programs" className="py-24 relative overflow-hidden">
            {/* Decorative BG */}
            <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-sparta-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <Container>
                <SectionHeader title="НАПРАВЛЕНИЯ" subtitle="Выберите путь, который приведет вас к победе." />

                {/* Duration Selector */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white/5 p-1 rounded-full border border-white/10 flex relative">
                        {[3, 6, 12].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDuration(d as 3 | 6 | 12)}
                                className={`relative px-8 py-2 rounded-full font-bold text-sm transition-all duration-300 z-10 ${duration === d ? 'text-black' : 'text-white/50 hover:text-white'}`}
                            >
                                {d} {getDurationLabel(d)}
                            </button>
                        ))}
                        {/* Sliding Background */}
                        <div
                            className="absolute top-1 bottom-1 bg-sparta-gold rounded-full transition-all duration-300 ease-out"
                            style={{
                                left: duration === 3 ? '4px' : duration === 6 ? 'calc(33.33% + 4px)' : 'calc(66.66% + 4px)',
                                width: 'calc(33.33% - 8px)'
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {displayPrograms.map((program, idx) => {
                        const prices = getPriceInfo(program, duration, userProfile);
                        const isPurchased = userProfile?.subscription?.planId === program.id;

                        return (
                            <motion.div
                                key={program.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.2 }}
                                viewport={{ once: true }}
                                className="relative group"
                            >
                                <GlassCard className={`h-full p-0 flex flex-col border-white/5 hover:border-sparta-gold/30 transition-colors ${isPurchased ? 'ring-2 ring-sparta-gold/50' : ''}`}>
                                    {/* Image Area */}
                                    <div className="h-64 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                        <img
                                            src={program.image}
                                            alt={program.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute bottom-4 left-6 z-20">
                                            <h3 className="font-russo text-2xl text-white">{program.title}</h3>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <span className="text-3xl font-russo text-sparta-gold">
                                                    {prices.total}
                                                </span>
                                                <span className="text-white/40 text-sm">₽</span>
                                            </div>
                                            {prices.originalTotal ? (
                                                <p className="text-white/30 text-sm mt-1 line-through">{prices.originalTotal} ₽</p>
                                            ) : (
                                                <p className="text-transparent text-sm mt-1 select-none">Spacer</p>
                                            )}
                                        </div>
                                        {isPurchased && (
                                            <div className="absolute top-4 right-4 z-20 bg-sparta-gold text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                                                Мой план
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-8 flex-1 flex flex-col">
                                        <ul className="space-y-4 mb-8 flex-1">
                                            {program.features.map((feat, i) => (
                                                <li key={i} className="flex items-center gap-3 text-white/70 font-manrope text-sm">
                                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                                        <Check size={10} className="text-sparta-gold" />
                                                    </div>
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="pt-4 border-t border-white/5">
                                            {isPurchased ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-center gap-2 text-sparta-gold font-bold text-xs bg-sparta-gold/10 py-2 rounded-xl border border-sparta-gold/20">
                                                        <Star size={12} />
                                                        <span>ПРИОБРЕТЕНО</span>
                                                    </div>
                                                    <Button
                                                        className="w-full group"
                                                        onClick={() => onOpenMembership(program, 'renew')}
                                                    >
                                                        <span>Продлить</span>
                                                        <RefreshCw className="ml-2 group-hover:rotate-180 transition-transform duration-500" size={16} />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    className="w-full group-hover:bg-sparta-gold group-hover:text-black group-hover:border-sparta-gold"
                                                    onClick={() => onOpenMembership(program, 'purchase')}
                                                >
                                                    Выбрать план
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        )
                    })}
                </div>
            </Container>
        </section >
    );
};

const Team = () => {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "coaches"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Coach[];

            setCoaches(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fallback: If DB is empty, show default coaches. If DB has data, show DB data.
    const displayCoaches = (loading || coaches.length === 0) ? COACHES : coaches;

    return (
        <section id="team" className="py-24 bg-gradient-to-b from-transparent to-black/50">
            <Container>
                <SectionHeader title="НАША КОМАНДА" />

                <div className="flex flex-wrap justify-center gap-12">
                    {displayCoaches.map((coach, idx) => (
                        <motion.div
                            key={coach.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="group flex flex-col items-center text-center"
                        >
                            <div className="relative mb-6">
                                <div className="w-48 h-48 rounded-full p-1 bg-gradient-to-br from-sparta-gold to-transparent">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-black">
                                        <img
                                            src={coach.image}
                                            alt={coach.name}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                        />
                                    </div>
                                </div>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-sparta-gold text-black text-xs font-bold px-4 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    ЗАПИСАТЬСЯ
                                </div>
                            </div>
                            <h4 className="font-russo text-xl text-white group-hover:text-sparta-gold transition-colors">{coach.name}</h4>
                            <p className="font-manrope text-white/50 text-sm">{coach.role}</p>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-24">
            <Container className="max-w-3xl">
                <SectionHeader title="ВОПРОСЫ" subtitle="Ответы на популярные вопросы о вашем пути." />

                <div className="space-y-4">
                    {FAQS.map((faq, idx) => (
                        <motion.div
                            key={faq.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="rounded-[24px] bg-white/5 border border-white/10 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-white/5 transition-colors"
                            >
                                <span className="font-manrope font-semibold text-lg text-white">{faq.question}</span>
                                <ChevronDown
                                    className={`text-sparta-gold transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <AnimatePresence>
                                {openIndex === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 pt-0 text-white/60 font-manrope leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

const Footer = ({ onOpenTerms, onOpenContact }: { onOpenTerms: () => void, onOpenContact: () => void }) => {
    return (
        <footer className="bg-[#020202] pt-24 pb-12 border-t border-white/5 relative overflow-hidden">
            {/* Subtle glow at footer bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-sparta-gold/5 blur-[80px]" />

            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <div className="mb-6">
                            <img src="/sparta-logo.png" alt="SPARTA" className="h-16 w-auto object-contain" />
                        </div>
                        <p className="font-manrope text-white/50 max-w-md mb-8">
                            Конечный пункт назначения для чемпионов. Присоединяйтесь к сообществу, стремящемуся к величию.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://vk.com/sparta_fk" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#0077FF] hover:scale-110 hover:shadow-[0_0_15px_rgba(0,119,255,0.4)] transition-all duration-300 group">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.013-.384 0-1.067 0-1.067.7 0 1.334.248 1.83.612.492.358 1.246 1.103 1.246 1.103.522.38 1.144.267 1.144.267h2.162s.874-.031.54-.741c-.02-.046-.421-.837-2.144-2.316-1.571-1.341-1.366-1.124-.349-2.392 1.012-1.258 2.219-3.13 2.219-3.13.25-.395.148-.718-.148-.718h-2.164c-.251 0-.465.114-.582.327 0 0-1.102 2.766-2.583 4.545-.482.576-.7.76-.957.76-.129 0-.316-.184-.316-.71V9.22c0-.528-.153-.718-.6-.718h-3.39c-.156 0-.314.07-.468.148-.306.155-.544.5-.327.528.274.035.892.16 1.14 1 .306.815.251 2.651.251 2.651s.055.684-.11 1.055c-.113.253-.331.328-.564.328-.483 0-1.666-1.516-2.336-3.235-.24-.62-.435-1.291-.435-1.291-.07-.251-.252-.321-.504-.321H4.334c-.251 0-.306.114-.306.241 0 .226.29.957 1.346 2.457 1.761 2.493 3.65 4.606 7.788 4.606v.003z" />
                                </svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#2AABEE] hover:text-white transition-all group">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-[-2px]">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-russo text-lg text-white mb-6">Разделы</h4>
                        <ul className="space-y-4 font-manrope text-white/50">
                            <li><a href="#" className="hover:text-sparta-gold transition-colors">О нас</a></li>
                            <li><a href="#" className="hover:text-sparta-gold transition-colors">Программы</a></li>
                            <li><a href="#" className="hover:text-sparta-gold transition-colors">Наша команда</a></li>
                            <li><a href="#" className="hover:text-sparta-gold transition-colors">Цены</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-russo text-lg text-white mb-6">Контакты</h4>
                        <ul className="space-y-4 font-manrope text-white/50">
                            <li className="flex items-start gap-3">
                                <MapPin className="text-sparta-gold shrink-0" size={20} />
                                <a
                                    href="https://2gis.ru/chelyabinsk/firm/70000001038666964/tab/reviews?m=61.284612%2C55.168134%2F16"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-sparta-gold transition-colors"
                                >
                                    ОЦ "Ньютон", <br />ул. 250-летия Челябинска, 46
                                </a>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone className="text-sparta-gold shrink-0 mt-1" size={20} />
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-white hover:text-sparta-gold transition-colors whitespace-nowrap">+7 (351) 230-12-69</span>
                                        <span className="text-xs text-white/30">Администратор</span>
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-white hover:text-sparta-gold transition-colors whitespace-nowrap">+7 (919) 339-33-99</span>
                                        <span className="text-xs text-white/30">Директор</span>
                                    </div>
                                </div>
                            </li>
                            <li className="pt-2">
                                <button
                                    onClick={onOpenContact}
                                    className="flex items-center gap-2 text-sm text-sparta-gold hover:text-white transition-colors group"
                                >
                                    <Mail size={16} />
                                    <span className="border-b border-sparta-gold/30 group-hover:border-white/30">Связаться с администратором</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-white/30 text-sm font-manrope">
                    <p>© {new Date().getFullYear()} Sparta Sports Center. Все права защищены.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-white transition-colors">Политика конфиденциальности</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onOpenTerms(); }} className="hover:text-white transition-colors">Условия использования</a>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isTrialOpen, setIsTrialOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
    const [isProductSetupOpen, setIsProductSetupOpen] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isBonusOpen, setIsBonusOpen] = useState(false);
    const [duration, setDuration] = useState<3 | 6 | 12>(3);
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [isMembershipOpen, setIsMembershipOpen] = useState(false);

    const getPriceInfo = (program: Program | null) => {
        if (!program) return { total: 0, monthly: 0 };
        const priceMap = program.prices || {};
        const total = priceMap[duration] || 0;
        const monthly = Math.round(total / duration);
        return {
            monthly: monthly.toLocaleString('ru-RU'),
            total: total.toLocaleString('ru-RU')
        };
    };

    const handleAuthSuccess = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists() && userDoc.data()?.profileCompleted) {
                    navigate('/dashboard');
                } else {
                    setIsProfileSetupOpen(true);
                }
            } catch (error) {
                console.error("Error checking profile:", error);
                setIsProfileSetupOpen(true);
            }
        } else {
            setIsProfileSetupOpen(true);
        }
    };

    return (
        <div className="bg-sparta-black min-h-screen text-white font-manrope overflow-hidden relative selection:bg-sparta-gold selection:text-black">
            <Navbar
                onOpenTrial={() => setIsTrialOpen(true)}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenBonus={() => setIsBonusOpen(true)}
            />
            <main>
                {/* Hero Section - Stadium Entrance */}
                <div className="bg-hero-bg bg-fixed bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/60 pointer-events-none z-0"></div>
                    <div className="relative z-10">
                        <Hero onOpenTrial={() => setIsTrialOpen(true)} />
                        <Marquee />
                    </div>
                </div>

                {/* WHY US with custom bg */}
                <div className="relative bg-why-us-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/85 z-0"></div>
                    <div className="relative z-10">
                        <WhyUs />
                    </div>
                </div>

                {/* PROGRAMS with custom bg */}
                <div className="relative bg-programs-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/75 z-0"></div>
                    <div className="relative z-10">
                        <Programs
                            duration={duration}
                            setDuration={setDuration}
                            onOpenMembership={(p) => {
                                setSelectedProgram(p);
                                setIsMembershipOpen(true);
                            }}
                        />
                    </div>
                </div>

                {/* GROUPS LIST SECTION */}
                <GroupsSection />

                {/* SCHEDULE SECTION */}
                <ScheduleSection />

                {/* TEAM with custom bg */}
                <div className="relative bg-team-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/80 z-0"></div>
                    <div className="relative z-10">
                        <Team />
                    </div>
                    {/* Smooth transition to News */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent z-20 pointer-events-none" />
                </div>

                {/* NEWS SECTION */}
                <NewsSection />

                {/* FAQ with custom bg */}
                <div className="relative bg-faq-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/85 z-0"></div>
                    <div className="relative z-10">
                        <FAQ />
                    </div>
                </div>
            </main>
            <Footer onOpenTerms={() => setIsTermsOpen(true)} onOpenContact={() => setIsContactOpen(true)} />
            <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
            <BonusModal isOpen={isBonusOpen} onClose={() => setIsBonusOpen(false)} />
            <TrialModal isOpen={isTrialOpen} onClose={() => setIsTrialOpen(false)} />
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
            <ProfileSetupModal isOpen={isProfileSetupOpen} onClose={() => setIsProfileSetupOpen(false)} />
            <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
            <MembershipModal
                isOpen={isMembershipOpen}
                onClose={() => setIsMembershipOpen(false)}
                program={selectedProgram}
                duration={duration}
                price={selectedProgram?.prices?.[duration] || 0}
            />
        </div>
    );
};

export default LandingPage;
