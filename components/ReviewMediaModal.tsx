import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Review } from '../types/shop';
import VideoPlayer from './VideoPlayer';

interface ReviewMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    review: Review | null;
    initialMediaUrl?: string;
}

const ReviewMediaModal: React.FC<ReviewMediaModalProps> = ({ isOpen, onClose, review, initialMediaUrl }) => {
    const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(initialMediaUrl || null);

    if (!review) return null;

    // Combine all media into one list for navigation
    const allMedia = [
        ...(review.video ? [{ type: 'video', url: review.video }] : []),
        ...(review.photos?.map(url => ({ type: 'image', url })) || [])
    ];

    const currentIndex = allMedia.findIndex(m => m.url === (currentMediaUrl || initialMediaUrl));

    const handleNext = () => {
        const nextIndex = (currentIndex + 1) % allMedia.length;
        setCurrentMediaUrl(allMedia[nextIndex].url);
    };

    const handlePrev = () => {
        const prevIndex = (currentIndex - 1 + allMedia.length) % allMedia.length;
        setCurrentMediaUrl(allMedia[prevIndex].url);
    };

    const currentMedia = allMedia[currentIndex] || allMedia[0];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-6xl h-full max-h-[85vh] bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                    >
                        {/* Media Section */}
                        <div className="flex-1 bg-black flex items-center justify-center relative group min-h-[300px]">
                            {currentMedia?.type === 'video' ? (
                                <div className="w-full h-full p-4 flex items-center justify-center">
                                    <VideoPlayer
                                        src={currentMedia.url}
                                        autoPlay
                                        className="max-h-full max-w-full"
                                    />
                                </div>
                            ) : (
                                <img
                                    src={currentMedia?.url}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Review media"
                                />
                            )}

                            {/* Navigation Arrows */}
                            {allMedia.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="w-full md:w-[400px] border-l border-white/10 flex flex-col bg-[#0f0f0f]">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex items-center justify-center border border-white/10">
                                        {review.userAvatar ? (
                                            <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-xl text-gray-500">{review.userName?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{review.userName}</h4>
                                        <div className="flex gap-1 mt-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} size={14} fill={i < review.rating ? "#eab308" : "none"} className={i < review.rating ? "text-yellow-500" : "text-gray-700"} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-6">
                                    {review.comment}
                                </p>

                                <div className="text-xs text-gray-600 mb-8 pb-8 border-b border-white/5">
                                    Отзыв оставлен: {review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Недавно'}
                                </div>

                                {/* Replies Section */}
                                {review.replies && review.replies.length > 0 && (
                                    <div className="space-y-6">
                                        <h5 className="text-white font-bold text-sm flex items-center gap-2">
                                            Ответы ({review.replies.length})
                                        </h5>
                                        <div className="space-y-4">
                                            {review.replies.map((reply) => (
                                                <div key={reply.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center border border-white/5">
                                                            {reply.userAvatar ? (
                                                                <img src={reply.userAvatar} alt={reply.userName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="font-bold text-xs text-gray-500">{reply.userName?.[0]?.toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm leading-none">{reply.userName}</div>
                                                            <div className="text-[10px] text-gray-500 mt-1">{new Date(reply.createdAt).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-400 text-sm leading-relaxed">
                                                        {reply.comment}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Stats (Optional) */}
                            <div className="p-4 bg-white/5 border-t border-white/10 flex justify-center text-xs text-gray-500">
                                {currentIndex + 1} / {allMedia.length}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReviewMediaModal;
