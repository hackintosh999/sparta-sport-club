import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Zap, Percent, Trophy, ShoppingBag, Star } from 'lucide-react';

interface BonusCardProps {
    type: 'discount_percent' | 'discount_fixed' | 'item' | 'free_training';
    value: string | number;
    description: string;
    // We removed imageSrc, we can infer icon from type or ID, or pass an icon name
    iconName?: string;
    onClaim: () => void;
}

const BonusCard: React.FC<BonusCardProps> = ({ type, value, description, iconName, onClaim }) => {

    const getIcon = () => {
        // Fallback or explicit selection
        if (value === 'personal') return <Trophy className="w-32 h-32 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />;
        if (value === '2 free') return <Zap className="w-32 h-32 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />;
        if (description.includes('экипировку')) return <ShoppingBag className="w-32 h-32 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />;

        switch (type) {
            case 'discount_percent':
                return <Percent className="w-32 h-32 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />;
            case 'discount_fixed':
                return <Star className="w-32 h-32 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />;
            default:
                return <Gift className="w-32 h-32 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />;
        }
    };

    return (
        <motion.div
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.5
            }}
            className="perspective-1000 relative w-72 h-[450px] cursor-pointer group"
            onClick={onClaim}
        >
            <div className="w-full h-full relative preserve-3d transition-transform duration-500 hover:scale-105">
                {/* Gold Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 via-yellow-300 to-yellow-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />

                {/* Card Container */}
                <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl border-2 border-yellow-500/50 overflow-hidden shadow-2xl flex flex-col items-center justify-between p-8 text-center">

                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-br-full" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-yellow-500/10 to-transparent rounded-tl-full" />
                    <div className="absolute inset-0 bg-grid-white/[0.03] bg-[length:20px_20px]" />

                    {/* Logo / Header */}
                    <div className="z-10 mb-4">
                        <h4 className="font-russo text-yellow-500/50 tracking-[0.3em] text-xs">SPARTA CLUB</h4>
                    </div>

                    {/* Icon */}
                    <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        className="z-10"
                    >
                        {getIcon()}
                    </motion.div>

                    {/* Value & Description */}
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="font-russo text-4xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-md">
                            {typeof value === 'number' ? `${value}%` : (value === 'personal' ? 'JACKPOT' : (value === '2 free' ? 'FREE' : value))}
                        </div>
                        <div className="w-12 h-1 bg-yellow-500 mx-auto rounded-full" />
                        <p className="font-manrope text-white/80 font-bold uppercase text-sm tracking-wider leading-relaxed">
                            {description}
                        </p>
                    </div>

                    {/* Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-700 text-black font-russo font-bold uppercase text-lg rounded-lg shadow-[0_4px_14px_0_rgba(234,179,8,0.39)] hover:shadow-[0_6px_20px_rgba(234,179,8,0.23)] hover:bg-yellow-400 transition-all z-10 mt-6"
                    >
                        ЗАБРАТЬ ПРИЗ
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default BonusCard;
