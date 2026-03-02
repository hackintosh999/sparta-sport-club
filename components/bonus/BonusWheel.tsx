import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useAnimation, useTransform, animate } from 'framer-motion';
import { soundManager } from '../../utils/SoundManager';

interface BonusItem {
    id: string;
    label: string;
    color: string;
    probability: number;
    type: 'discount_percent' | 'discount_fixed' | 'item' | 'free_training';
    value: string;
    description?: string;
}

interface BonusWheelProps {
    items: BonusItem[];
    onSpinEnd: (item: BonusItem) => void;
    isSpinning: boolean;
    setIsSpinning: (val: boolean) => void;
    duration?: number;
}

const BonusWheel: React.FC<BonusWheelProps> = ({ items, onSpinEnd, isSpinning, setIsSpinning, duration = 8 }) => {
    const rotation = useMotionValue(0);
    const tickerControls = useAnimation();

    const [gameState, setGameState] = useState<'idle' | 'spinning' | 'stopping'>('idle');

    useEffect(() => {
        if (isSpinning && gameState === 'idle') {
            handleSpin();
        }
    }, [isSpinning]);

    const handleSpin = async () => {
        setGameState('spinning');
        soundManager.playStart();

        // Wind up slightly
        await animate(rotation, rotation.get() - 30, { duration: 0.8, ease: "backIn" });

        // Calculate Winner
        const totalProbability = items.reduce((sum, item) => sum + item.probability, 0);
        let random = Math.random() * totalProbability;
        let winnerIndex = 0;

        for (let i = 0; i < items.length; i++) {
            random -= items[i].probability;
            if (random <= 0) {
                winnerIndex = i;
                break;
            }
        }

        const segmentAngle = 360 / items.length;
        const winnerCenterAngle = (winnerIndex * segmentAngle) + (segmentAngle / 2);

        // Jitter within the winning segment so it doesn't land dead center every time
        const jitter = (Math.random() - 0.5) * (segmentAngle * 0.8);

        // Spin multiple times
        const baseSpins = duration > 5 ? 8 : 5;
        const spins = baseSpins + Math.random() * 2;

        // Calculate target rotation.
        // We want the wheel to land so that `winnerCenterAngle` is at the TOP (0 degrees relative).
        // Since CSS rotation rotates the entire element clockwise, to bring a point at angle A to 0,
        // we must rotate by 360 - A.
        const currentRot = rotation.get();
        const baseTarget = 360 * spins + (360 - winnerCenterAngle) + jitter;

        // Add to current rotation (modulo to keep things clean but framer handles large numbers fine)
        const finalRotation = Math.floor(currentRot / 360) * 360 + baseTarget;

        await animate(rotation, finalRotation, {
            duration: duration,
            ease: [0.1, 0, 0.1, 1], // Explosive start, smooth friction tail
        });

        soundManager.playWin();
        onSpinEnd(items[winnerIndex]);
        setGameState('idle');
    };

    // Ticker Sound Logic
    useEffect(() => {
        if (!items || items.length === 0) return;

        let lastSegment = -1;
        const segmentSize = 360 / items.length;

        const unsubscribe = rotation.on("change", (currentRot) => {
            const normalizedRot = (currentRot % 360 + 360) % 360;
            // The top position (0deg) corresponds to which segment?
            // Since the wheel rotates by `currentRot`, the segment currently at top
            // is (360 - normalizedRot) / segmentSize.
            const currentPositionInDegrees = (360 - normalizedRot) % 360;
            const currentSegment = Math.floor(currentPositionInDegrees / segmentSize);

            if (currentSegment !== lastSegment && lastSegment !== -1 && gameState === 'spinning') {
                soundManager.playTick();
                tickerControls.start({
                    rotate: [0, -30, 0],
                    transition: { duration: 0.15, ease: "easeOut" }
                });
            }
            lastSegment = currentSegment;
        });

        return () => unsubscribe();
    }, [items, rotation, tickerControls, gameState]);

    if (!items || items.length === 0) return null;

    // Conic gradient styling
    const conicGradient = items.map((item, index) => {
        const startAngle = index * (360 / items.length);
        const endAngle = (index + 1) * (360 / items.length);
        return `${item.color} ${startAngle}deg ${endAngle}deg`;
    }).join(', ');

    return (
        <div className="relative w-full aspect-square max-w-[450px] mx-auto filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">

            {/* Outer Premium Ring */}
            <div className="absolute inset-0 rounded-full border-[12px] border-[#111] shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,55,0.2)] z-10 pointer-events-none" />
            <div className="absolute inset-2 rounded-full border-[2px] border-white/10 z-10 pointer-events-none" />

            {/* Glowing Accent Ring */}
            <div className="absolute -inset-4 rounded-full border border-sparta-gold/20 animate-[spin_10s_linear_infinite] pointer-events-none blur-[1px]" />
            <div className="absolute -inset-8 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse] pointer-events-none blur-[2px]" />

            {/* Pointer (Ticker) */}
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]">
                <motion.div
                    animate={tickerControls}
                    style={{ transformOrigin: '50% 10%' }}
                    className="relative"
                >
                    <div className="w-8 h-12 bg-gradient-to-b from-[#ddd] to-white rounded-t-full shadow-inner relative" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}>
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-black/20" />
                    </div>
                </motion.div>
            </div>

            {/* Center Logo Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#111] rounded-full z-20 flex items-center justify-center border-4 border-sparta-gold shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(255,255,255,0.1)]">
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-gradient-to-br from-[#222] to-[#0a0a0a]">
                    <span className="font-russo text-sparta-gold text-lg tracking-wider filter drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">SPARTA</span>
                </div>
            </div>

            {/* The Wheel */}
            <motion.div
                className="w-full h-full rounded-full overflow-hidden relative"
                style={{
                    background: `conic-gradient(${conicGradient})`,
                    rotate: rotation,
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
                }}
            >
                {/* Overlay for glassmorphism segments */}
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />

                {items.map((item, index) => {
                    const segmentAngle = 360 / items.length;
                    // Rotate the text container by half the segment angle + its index offset
                    // so the text is vertically aligned strictly in the middle of each colored slice.
                    const rotationAngle = (index * segmentAngle) + (segmentAngle / 2);

                    return (
                        <div
                            key={item.id}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none select-none flex items-start justify-center"
                            style={{
                                transform: `rotate(${rotationAngle}deg)`,
                            }}
                        >
                            {/* Segment text and internal decoration */}
                            <div className="flex flex-col items-center pt-6 md:pt-8 z-10 w-32 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                <div className="w-8 h-8 md:w-10 md:h-10 mb-1 flex items-center justify-center">
                                    {item.type === 'discount_percent' || item.type === 'discount_fixed' ? (
                                        <img src="/prize_discount_icon.png" alt="Discount" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
                                    ) : item.type === 'item' ? (
                                        <img src="/prize_item_icon.png" alt="Item" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
                                    ) : item.type === 'free_training' ? (
                                        <img src="/prize_training_icon.png" alt="Training" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
                                    ) : null}
                                </div>
                                <span
                                    className="font-russo text-white text-base md:text-lg font-bold tracking-wide select-none"
                                    style={{
                                        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    {item.label}
                                </span>
                                {item.description && items.length <= 8 && (
                                    <span
                                        className="text-white/80 text-[9px] md:text-[10px] font-manrope font-bold mt-0.5 text-center leading-squash drop-shadow-md select-none"
                                        style={{ maxWidth: '90%' }}
                                    >
                                        {item.description}
                                    </span>
                                )}
                            </div>

                            {/* Segment divider lines (Right edge of this segment) */}
                            <div
                                className="absolute top-0 left-1/2 w-[1px] h-1/2 bg-white/20"
                                style={{
                                    transformOrigin: 'bottom center',
                                    transform: `rotate(${segmentAngle / 2}deg)`
                                }}
                            />
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
};

export default BonusWheel;
