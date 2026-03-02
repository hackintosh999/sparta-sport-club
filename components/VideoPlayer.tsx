import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings } from 'lucide-react';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    autoPlay?: boolean;
    className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, autoPlay = false, className = '' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(1);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial AutoPlay
    useEffect(() => {
        if (autoPlay && videoRef.current) {
            videoRef.current.play().catch(() => {
                // Autoplay policy prevented playback
                console.log('Autoplay prevented');
            });
        }
    }, [autoPlay]);

    // Handle Time Update
    const onTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration) {
                setProgress((current / duration) * 100);
            }
        }
    };

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Sync fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Show/Hide Controls on Hover
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 2500);
    };

    return (
        <div
            ref={containerRef}
            className={`relative group rounded-2xl overflow-hidden bg-black aspect-video select-none ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onClick={togglePlay}
        >
            {/* 3D Border Effects */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] z-20" />
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-sparta-gold/10 opacity-50 z-20 mix-blend-overlay" />

            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-contain"
                onTimeUpdate={onTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={(e) => e.stopPropagation()} // Let container handle click? Or explicit double click?
                playsInline
            />

            {/* Big Play Button Overlay */}
            <AnimatePresence>
                {!isPlaying && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px]"
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-sparta-gold text-black flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                        >
                            <Play fill="currentColor" size={28} className="ml-1" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Progress Bar */}
                        <div
                            className="relative h-1 bg-white/20 rounded-full mb-4 cursor-pointer group/progress overflow-hidden"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pos = (e.clientX - rect.left) / rect.width;
                                if (videoRef.current) {
                                    videoRef.current.currentTime = pos * videoRef.current.duration;
                                }
                            }}
                        >
                            <div
                                className="absolute top-0 left-0 bottom-0 bg-sparta-gold rounded-full transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                            <div className="absolute top-0 left-0 bottom-0 w-full hover:bg-white/10 transition-colors" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={togglePlay}
                                    className="text-white hover:text-sparta-gold transition-colors"
                                >
                                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                </button>

                                <div className="flex items-center gap-2 group/vol">
                                    <button
                                        onClick={toggleMute}
                                        className="text-white/70 hover:text-white transition-colors"
                                    >
                                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setVolume(val);
                                            if (videoRef.current) videoRef.current.volume = val;
                                            setIsMuted(val === 0);
                                        }}
                                        className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 accent-sparta-gold h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={toggleFullscreen}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VideoPlayer;
