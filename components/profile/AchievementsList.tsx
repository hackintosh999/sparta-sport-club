import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Trophy, Calendar, X, Box, CheckCircle, Star } from 'lucide-react';
import { UserAchievement, AchievementDefinition } from '../../types/shop';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import Viewer3D from '../Viewer3D';

interface AchievementsListProps {
    userAchievements?: UserAchievement[];
}

// --- 3D Card Component ---
const AchievementCard = ({
    achievement,
    def,
    onClick
}: {
    achievement: UserAchievement,
    def: AchievementDefinition,
    onClick: () => void
}) => {
    const ref = useRef<HTMLDivElement>(null);

    // Mouse position state for tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXFromCenter = e.clientX - rect.left - width / 2;
        const mouseYFromCenter = e.clientY - rect.top - height / 2;
        x.set(mouseXFromCenter / width);
        y.set(mouseYFromCenter / height);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Rarity Visuals
    const isLegendary = def.rarity === 'legendary';
    const isRare = def.rarity === 'rare';

    const bgGradient = isLegendary
        ? "bg-gradient-to-br from-[#2a2a2a] via-[#3a2e15] to-[#1a1a1a]"
        : isRare
            ? "bg-gradient-to-br from-[#1a2a3a] via-[#1a3a4a] to-[#1a1a1a]"
            : "bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]";

    const borderClass = isLegendary
        ? "border-yellow-500/50"
        : isRare
            ? "border-blue-500/50"
            : "border-white/10";

    const glowColor = isLegendary ? "rgba(234, 179, 8, 0.3)" : isRare ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)";

    return (
        <motion.div
            ref={ref}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 1000
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={`relative w-full aspect-[3/4] rounded-2xl cursor-pointer group select-none`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Card Container */}
            <div className={`absolute inset-0 rounded-2xl border-2 ${borderClass} ${bgGradient} overflow-hidden shadow-2xl transition-colors duration-300`}>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`
                    }}
                />

                {/* Holographic Shine Overlay */}
                <div className="absolute inset-0 rounded-2xl mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                        background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.2) 50%, transparent 54%)`,
                        // We could animate this position based on mouse for extra realism
                    }}
                />

                {/* Content Layer (elevated in 3D) */}
                <div className="relative z-10 w-full h-full flex flex-col p-4" style={{ transform: "translateZ(20px)" }}>

                    {/* Header: Rarity & Date */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`
                            px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border
                            ${isLegendary ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' :
                                isRare ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                                    'bg-white/10 border-white/20 text-white/50'}
                        `}>
                            {def.rarity}
                        </div>
                        {isLegendary && <Star size={12} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                    </div>

                    {/* Image / Icon Area */}
                    <div className="flex-1 flex items-center justify-center relative my-2">
                        {/* Circle/Shield Background behind image */}
                        <div className={`absolute w-28 h-28 rounded-full blur-2xl opacity-40 ${isLegendary ? 'bg-yellow-500' : isRare ? 'bg-blue-500' : 'bg-white'}`} />

                        <div className="relative transform transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                            {def.mediaUrl ? (
                                def.type === '3d' ? (
                                    <div className="w-24 h-24 flex items-center justify-center bg-black/40 rounded-full border border-white/10 backdrop-blur-sm">
                                        <Box className={isLegendary ? "text-sparta-gold" : "text-white"} size={40} />
                                        <div className="absolute -bottom-2 px-2 py-0.5 bg-black/80 text-[8px] font-bold rounded-full border border-white/20">3D MODEL</div>
                                    </div>
                                ) : (
                                    <img src={def.mediaUrl} className="w-32 h-32 object-contain" alt={def.title} />
                                )
                            ) : (
                                <Trophy className={isLegendary ? "text-yellow-500" : isRare ? "text-blue-400" : "text-white/20"} size={64} />
                            )}
                        </div>
                    </div>

                    {/* Footer: Title & Date */}
                    <div className="mt-auto text-center">
                        <h3 className={`font-russo text-lg leading-tight mb-2 ${isLegendary ? 'text-white drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-white'}`}>
                            {def.title}
                        </h3>
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/40 font-mono">
                            <Calendar size={10} />
                            {new Date(achievement.date).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


const AchievementsList: React.FC<AchievementsListProps> = ({ userAchievements = [] }) => {
    const [definitions, setDefinitions] = useState<Record<string, AchievementDefinition>>({});
    const [loading, setLoading] = useState(true);
    const [selectedAchievement, setSelectedAchievement] = useState<UserAchievement | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "achievement_definitions"), (snapshot) => {
            const defs: Record<string, AchievementDefinition> = {};
            snapshot.docs.forEach(doc => {
                defs[doc.id] = { id: doc.id, ...doc.data() } as AchievementDefinition;
            });
            setDefinitions(defs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getDefinition = (id: string) => definitions[id];

    if (loading) return <div className="text-center text-white/50 py-10">Загрузка наград...</div>;

    if (userAchievements.length === 0) {
        return (
            <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
                    <Trophy size={32} />
                </div>
                <h3 className="text-xl text-white font-russo mb-2">Пока нет наград</h3>
                <p className="text-white/50 max-w-sm">
                    Тренируйтесь усердно, и ваши достижения появятся здесь!
                </p>
            </div>
        );
    }

    const sorted = [...userAchievements].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 p-4">
                {sorted.map(achievement => {
                    const def = getDefinition(achievement.definitionId);
                    if (!def) return null;
                    return (
                        <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                            def={def}
                            onClick={() => setSelectedAchievement(achievement)}
                        />
                    );
                })}
            </div>

            {/* Detail Modal (Unchanged essentially, but ensuring clean overlay) */}
            <AnimatePresence>
                {selectedAchievement && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedAchievement(null)} />

                        <motion.div
                            layoutId={selectedAchievement.id} // Keeps the layout animation connection if possible
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden relative z-10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
                        >
                            <button
                                onClick={() => setSelectedAchievement(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 text-white/60 hover:text-white rounded-full z-20 backdrop-blur-sm"
                            >
                                <X size={24} />
                            </button>

                            {(() => {
                                const def = getDefinition(selectedAchievement.definitionId);
                                if (!def) return null;

                                return (
                                    <>
                                        {/* Visual Side */}
                                        <div className="w-full md:w-1/2 bg-gradient-to-br from-black to-[#1a1a1a] relative flex items-center justify-center h-[300px] md:h-auto border-b md:border-b-0 md:border-r border-white/5">
                                            <div className="absolute inset-0 bg-sparta-gold/5 blur-[50px] rounded-full" />
                                            {def.type === '3d' && def.mediaUrl ? (
                                                <div className="w-full h-full absolute inset-0">
                                                    <Viewer3D url={def.mediaUrl} height="100%" />
                                                    <div className="absolute bottom-4 left-0 w-full text-center text-white/20 text-xs pointer-events-none">
                                                        Крутите модель мышкой
                                                    </div>
                                                </div>
                                            ) : def.mediaUrl ? (
                                                <img src={def.mediaUrl} className="w-3/4 h-3/4 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]" alt="" />
                                            ) : (
                                                <Trophy size={100} className="text-white/10 relative z-10" />
                                            )}
                                        </div>

                                        {/* Info Side */}
                                        <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto">
                                            <div className="mb-6">
                                                <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded mb-3
                                                    ${def.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        def.rarity === 'rare' ? 'bg-purple-500/20 text-purple-500' : 'bg-white/10 text-white/40'}`}>
                                                    {def.rarity}
                                                </span>
                                                <h2 className="text-3xl font-bold text-white font-russo mb-2">{def.title}</h2>
                                                <p className="text-white/60 leading-relaxed text-sm">{def.description}</p>
                                            </div>

                                            <div className="mt-auto space-y-4">
                                                {selectedAchievement.reason && (
                                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <h5 className="text-white/40 text-xs font-bold uppercase mb-1">За что получена</h5>
                                                        <p className="text-white italic">"{selectedAchievement.reason}"</p>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-xs text-white/30 pt-4 border-t border-white/5">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={14} />
                                                        {new Date(selectedAchievement.date).toLocaleDateString()}
                                                    </span>
                                                    {selectedAchievement.grantedBy && (
                                                        <span className="flex items-center gap-1.5">
                                                            <CheckCircle size={14} />
                                                            Выдано тренером
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AchievementsList;
