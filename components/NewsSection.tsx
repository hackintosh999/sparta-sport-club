import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, where, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowRight, Search, Heart, MessageCircle, Clock, Tag, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Container } from './UIComponents';
import { useAuth } from '../context/AuthContext';
import NewsModal from './NewsModal';
import { useSearchParams } from 'react-router-dom';

const CATEGORIES = [
    { id: 'all', label: 'Все' },
    { id: 'competitions', label: 'Соревнования' },
    { id: 'club_life', label: 'Жизнь клуба' },
    { id: 'tips', label: 'Советы' },
    { id: 'announcements', label: 'Объявления' }
];

const stripHtml = (html: string) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const NewsSection = () => {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();
    const [selectedNews, setSelectedNews] = useState<any | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Deep linking
    useEffect(() => {
        const newsId = searchParams.get('newsId');
        if (newsId) {
            const fetchLinkedNews = async () => {
                try {
                    const docSnap = await getDoc(doc(db, "news", newsId));
                    if (docSnap.exists()) {
                        setSelectedNews({ id: docSnap.id, ...docSnap.data() });

                        // Scroll to news section
                        setTimeout(() => {
                            const newsSection = document.getElementById('news');
                            if (newsSection) {
                                newsSection.scrollIntoView({ behavior: 'smooth' });
                            }
                        }, 500);

                        // Clear the query param so it doesn't reopen on refresh
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('newsId');
                        setSearchParams(newParams, { replace: true });
                    }
                } catch (error) {
                    console.error("Error fetching linked news:", error);
                }
            };
            fetchLinkedNews();
        }
    }, [searchParams, setSearchParams]);

    // Fetch News
    useEffect(() => {
        const q = query(
            collection(db, "news"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Filter published news client-side to avoid Firestore Index issues
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((item: any) => item.status === 'published');

            // Sort: Pinned first
            data.sort((a: any, b: any) => {
                if (a.isPinned === b.isPinned) return 0;
                return a.isPinned ? -1 : 1;
            });
            setNews(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter Logic
    const filteredNews = useMemo(() => {
        return news.filter(item => {
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [news, activeCategory, searchQuery]);

    const handleLike = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (!currentUser) {
            alert("Войдите, чтобы оценить!");
            return;
        }

        const newsRef = doc(db, "news", item.id);
        const isLiked = item.likedBy?.includes(currentUser.uid);

        try {
            if (isLiked) {
                await updateDoc(newsRef, {
                    likedBy: arrayRemove(currentUser.uid),
                    likes: increment(-1)
                });
            } else {
                await updateDoc(newsRef, {
                    likedBy: arrayUnion(currentUser.uid),
                    likes: increment(1)
                });
            }
        } catch (error) {
            console.error("Error liking:", error);
        }
    };

    return (
        <section id="news" className="py-24 bg-[#050505] relative min-h-screen overflow-hidden">
            {/* 3D Generated Cinematic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                {/* Background Image with Parallax-ready feel */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
                    style={{ backgroundImage: 'url("/bg-news-v8.png")' }}
                />

                {/* Cinematic Overlays for Depth and Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] opacity-40" />
                {/* <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" /> */}

                {/* Animated Particles for life */}
                <div className="absolute inset-0 opacity-30">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                x: Math.random() * 100 + "%",
                                y: Math.random() * 100 + "%",
                                opacity: Math.random() * 0.5
                            }}
                            animate={{
                                y: [null, (Math.random() * -100 - 50) + "px"],
                                opacity: [0, 0.5, 0]
                            }}
                            transition={{
                                duration: Math.random() * 10 + 10,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="absolute w-1 h-1 bg-sparta-gold rounded-full blur-[1px]"
                        />
                    ))}
                </div>

                {/* Grainy Texture */}
                <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                    }}
                />

                {/* Horizontal Divider Line */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <Container className="relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div>
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-sparta-gold font-bold tracking-wider uppercase text-sm mb-2 block"
                        >
                            Медиа-центр
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-5xl font-russo text-white"
                        >
                            Блог <span className="text-transparent bg-clip-text bg-gradient-to-r from-sparta-gold to-yellow-600">Спарты</span>
                        </motion.h2>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative group w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Поиск новостей..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:border-sparta-gold/50 outline-none transition-all group-hover:bg-white/10"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-hover:text-sparta-gold transition-colors" size={18} />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap gap-2 mb-10 pb-4 border-b border-white/5">
                    {CATEGORIES.map((cat, idx) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 relative overflow-hidden group ${activeCategory === cat.id
                                ? 'text-black bg-sparta-gold scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                                : 'text-white/60 bg-white/5 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
                    {filteredNews.length === 0 ? (
                        <div className="col-span-3 py-20 text-center borderBorder border-white/10 rounded-3xl bg-white/5">
                            <Search size={48} className="mx-auto text-white/20 mb-4" />
                            <p className="text-xl font-bold text-white mb-2">Ничего не найдено</p>
                            <p className="text-white/40">Попробуйте изменить параметры поиска</p>
                        </div>
                    ) : (
                        filteredNews.map((item, index) => {
                            // Hero card logic updates
                            const isHero = index === 0 && activeCategory === 'all' && !searchQuery && item.isPinned;

                            return (
                                <motion.article
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => setSelectedNews(item)}
                                    className={`group cursor-pointer relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111] hover:border-sparta-gold/30 transition-all duration-500 hover:shadow-2xl hover:shadow-sparta-gold/5 ${isHero ? 'md:col-span-2 lg:col-span-2 md:h-[500px]' : 'h-[400px]'}`}
                                >
                                    {/* Image Container */}
                                    <div className={`relative overflow-hidden w-full ${isHero ? 'h-full absolute inset-0 z-0' : 'h-1/2'}`}>
                                        {item.image || item.imageUrl ? (
                                            <img
                                                src={item.image || item.imageUrl}
                                                alt={item.title}
                                                className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ${isHero ? 'opacity-60' : 'opacity-100'}`}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                <span className="text-white/10 font-russo text-xl">SPARTA</span>
                                            </div>
                                        )}

                                        {/* Overlays */}
                                        {isHero ? (
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80" />
                                        )}

                                        {/* Category Badge */}
                                        <div className="absolute top-4 left-4 z-20">
                                            {item.category && item.category !== 'all' && (
                                                <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-wide shadow-lg">
                                                    {CATEGORIES.find(c => c.id === item.category)?.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Container */}
                                    <div className={`relative z-10 flex flex-col ${isHero ? 'h-full justify-end p-8 md:p-10' : 'flex-1 p-6'}`}>

                                        {/* Meta Data */}
                                        <div className="flex items-center gap-3 text-xs text-white/60 mb-3">
                                            <span className="flex items-center gap-1.5 text-sparta-gold font-medium">
                                                <Calendar size={12} />
                                                {item.createdAt?.seconds ? format(new Date(item.createdAt.seconds * 1000), 'd MMM', { locale: ru }) : 'Недавно'}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-white/30" />
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={12} />
                                                {item.readingTime || 1} мин
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className={`font-bold text-white mb-3 group-hover:text-sparta-gold transition-colors font-russo leading-tight ${isHero ? 'text-2xl md:text-4xl max-w-2xl' : 'text-lg line-clamp-2'}`}>
                                            {item.title}
                                        </h3>

                                        {/* Preview Text */}
                                        <p className={`text-white/50 text-sm leading-relaxed mb-6 font-manrope ${isHero ? 'text-base max-w-xl line-clamp-2' : 'line-clamp-3 flex-1'}`}>
                                            {stripHtml(item.content)}
                                        </p>

                                        {/* Footer Actions */}
                                        <div className={`flex items-center justify-between pt-4 ${isHero ? 'border-t border-white/10 w-full mt-auto' : 'border-t border-white/5 mt-auto'}`}>
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={(e) => handleLike(e, item)}
                                                    className="flex items-center gap-2 group/like"
                                                >
                                                    <Heart
                                                        size={isHero ? 20 : 16}
                                                        className={`transition-all ${item.likedBy?.includes(currentUser?.uid)
                                                            ? 'fill-red-500 text-red-500 scale-110'
                                                            : 'text-white/40 group-hover/like:text-red-500'
                                                            }`}
                                                    />
                                                    <span className={`font-medium transition-colors ${isHero ? 'text-base' : 'text-xs'} ${item.likedBy?.includes(currentUser?.uid) ? 'text-white' : 'text-white/40 group-hover/like:text-white'}`}>
                                                        {item.likes || 0}
                                                    </span>
                                                </button>

                                                <div className="flex items-center gap-2 text-white/40 group-hover/card:text-white transition-colors">
                                                    <MessageCircle size={isHero ? 20 : 16} />
                                                    <span className={`${isHero ? 'text-sm' : 'text-xs'} font-medium`}>
                                                        {/* We don't have comment count in list view yet, showing placeholder or just icon */}
                                                        Обсудить
                                                    </span>
                                                </div>
                                            </div>

                                            {isHero ? (
                                                <span className="inline-flex items-center gap-2 text-sparta-gold font-bold uppercase tracking-wider text-xs md:text-sm border-b border-sparta-gold/30 pb-1 group-hover:border-sparta-gold transition-all">
                                                    Читать <ArrowRight size={16} />
                                                </span>
                                            ) : (
                                                <span className="text-white/30 text-xs font-medium flex items-center gap-1 group-hover:text-sparta-gold transition-colors">
                                                    <ArrowRight size={14} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.article>
                            );
                        })
                    )}
                </div>

                <div className="mt-16 text-center">
                    <button className="px-8 py-3 rounded-full border border-white/10 text-white font-bold hover:bg-white/5 hover:border-sparta-gold transition-all">
                        Загрузить еще
                    </button>
                </div>
            </Container>

            {/* News Detail Modal */}
            <AnimatePresence>
                {selectedNews && (
                    <NewsModal
                        news={selectedNews}
                        onClose={() => setSelectedNews(null)}
                    />
                )}
            </AnimatePresence>
        </section >
    );
};

export default NewsSection;
