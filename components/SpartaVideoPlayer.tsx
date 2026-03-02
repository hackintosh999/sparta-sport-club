import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Download, MoreVertical, X, SkipBack, SkipForward, PictureInPicture, BoxSelect } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';

interface SpartaVideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
}

const SpartaVideoPlayer: React.FC<SpartaVideoPlayerProps> = ({ src, poster, className = '', autoPlay = false }) => {
    const playerRef = useRef<any>(null);
    const Player = ReactPlayer as any;
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLooping, setIsLooping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [objectFit, setObjectFit] = useState<'cover' | 'contain'>('cover');
    const [isWaiting, setIsWaiting] = useState(false);


    // Auto-hide controls
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isPlaying && showControls && !showSettings) {
            timeout = setTimeout(() => setShowControls(false), 3000);
        }
        return () => clearTimeout(timeout);
    }, [isPlaying, showControls, showSettings]);

    const handleMouseLeave = () => {
        if (isPlaying) setShowControls(false);
        setShowSettings(false);
    };

    // Play/Pause
    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsPlaying(!isPlaying);
    };

    // Fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Time Formatting
    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Seek
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setProgress(val);
        const newTime = (val / 100) * duration;
        setCurrentTime(newTime);
        playerRef.current?.seekTo(val / 100, 'fraction');
    };

    // Progress Update
    const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
        if (!showSettings) { // Optimize: skip updates if settings open
            setProgress(state.played * 100);
            setCurrentTime(state.playedSeconds);
        }
    };

    // Duration
    const handleDuration = (duration: number) => {
        setDuration(duration);
    };

    // Custom Actions
    const skipForward = () => playerRef.current?.seekTo(playerRef.current.getCurrentTime() + 10);
    const skipBackward = () => playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 10);
    const toggleMute = () => setIsMuted(!isMuted);
    const changePlaybackRate = (rate: number) => setPlaybackRate(rate);
    const toggleLoop = () => setIsLooping(!isLooping);
    const togglePip = () => {
        // ReactPlayer doesn't expose generic PiP API easily, but we can try generic DOM method on internal element
        // Note: ReactPlayer's internal player might be an iframe (YouTube) or video tag (File).
        // YouTube iframe doesn't support programmatic PiP via external JS usually.
        // File player does.
        const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement;
        if (internalPlayer && internalPlayer.requestPictureInPicture) {
            internalPlayer.requestPictureInPicture().catch(e => console.log('PiP not supported or failed', e));
        } else {
            console.log('PiP only supported on native file players');
        }
    };
    const toggleObjectFit = () => setObjectFit(prev => prev === 'cover' ? 'contain' : 'cover');

    const downloadVideo = (e: React.MouseEvent) => {
        e.preventDefault();
        const link = document.createElement('a');
        link.href = src;
        link.download = src.split('/').pop() || 'video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowSettings(false);
    };

    // VK Embed Helper
    const getVKEmbedUrl = (url: string) => {
        const vkRegExp = /vk\.com\/video(-?\d+)_(\d+)/;
        const match = url.match(vkRegExp);
        if (match) {
            return `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}&hd=2`;
        }
        return url;
    };

    const isVK = src.includes('vk.com');

    // VK Player (Iframe)
    if (isVK) {
        return (
            <div
                ref={containerRef}
                className={`relative group bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
                onMouseMove={() => setShowControls(true)}
                onMouseLeave={handleMouseLeave}
            >
                {/* Branded Border */}
                <div className="absolute inset-0 rounded-xl border border-white/10 transition-colors z-20 pointer-events-none" />

                <iframe
                    src={getVKEmbedUrl(src)}
                    className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                    title="VK Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                />
            </div>
        );
    }

    // Unified Player (YouTube & Files) - Custom Controls
    return (
        <div
            ref={containerRef}
            className={`relative group bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={handleMouseLeave}
        >
            {/* Branded Border */}
            <div className="absolute inset-0 rounded-xl border border-white/10 transition-colors z-20 pointer-events-none" />

            <Player
                ref={playerRef}
                url={src}
                width="100%"
                height="100%"
                playing={isPlaying}
                volume={volume}
                muted={isMuted}
                loop={isLooping}
                playbackRate={playbackRate}
                onProgress={(state: any) => handleProgress(state)}
                onDuration={handleDuration}
                onEnded={() => setIsPlaying(false)}
                onBuffer={() => setIsWaiting(true)}
                onBufferEnd={() => setIsWaiting(false)}
                config={{
                    youtube: {
                        rel: 0,
                        disablekb: 1,
                        modestbranding: 1
                    },
                    file: {
                        attributes: {
                            style: { objectFit: objectFit, width: '100%', height: '100%' },
                            poster: poster
                        }
                    }
                } as any}
                style={{ objectFit: objectFit }}
            />

            {/* Buffer Spinner */}
            <AnimatePresence>
                {isWaiting && isPlaying && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none"
                    >
                        <div className="w-12 h-12 border-4 border-white/20 border-t-sparta-gold rounded-full animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click Overlay (To toggle play/pause) */}
            <div
                className="absolute inset-0 z-10"
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
            />

            {/* Center Play Button (Big) - Show on Pause */}
            <AnimatePresence>
                {!isPlaying && !isWaiting && (
                    <motion.button
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        onClick={togglePlay}
                        className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center bg-sparta-gold/90 text-black rounded-full shadow-[0_0_30px_rgba(212,175,55,0.6)] backdrop-blur-sm hover:scale-110 transition-transform z-30 group/play"
                    >
                        <Play size={40} fill="currentColor" className="ml-2 group-hover/play:scale-110 transition-transform" />
                        <div className="absolute inset-0 rounded-full border-2 border-sparta-gold animate-ping opacity-50" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Controls Bar */}
            <motion.div
                animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
                className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30"
                onClick={(e) => e.stopPropagation()} // Prevent accidental click on video when clicking controls bg
            >
                {/* Progress Bar */}
                <div className="group/progress relative h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer hover:h-2.5 transition-all">
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-sparta-gold rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
                    </motion.div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button onClick={togglePlay} className="text-white hover:text-sparta-gold transition-colors p-1" title={isPlaying ? "Пауза (Space)" : "Воспроизвести (Space)"}>
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>

                        {/* Skip Buttons */}
                        <button onClick={skipBackward} className="text-white/80 hover:text-white transition-colors hidden sm:block" title="-10 сек (←)">
                            <SkipBack size={20} />
                        </button>
                        <button onClick={skipForward} className="text-white/80 hover:text-white transition-colors hidden sm:block" title="+10 сек (→)">
                            <SkipForward size={20} />
                        </button>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/vol">
                            <button onClick={toggleMute} className="text-white hover:text-sparta-gold transition-colors p-1" title={isMuted ? "Включить звук (M)" : "Без звука (M)"}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        const vol = parseFloat(e.target.value);
                                        setVolume(vol);
                                        setIsMuted(vol === 0);
                                    }}
                                    className="w-full h-1 bg-white/20 rounded-lg accent-sparta-gold"
                                />
                            </div>
                        </div>

                        {/* Time */}
                        <span className="text-xs text-white/60 font-mono min-w-[80px]">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <div className="relative">
                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                        className="absolute bottom-12 right-0 w-48 bg-black/90 border border-white/10 rounded-xl backdrop-blur-xl p-4 shadow-2xl z-50 overflow-hidden"
                                    >
                                        <div className="text-white text-sm font-bold mb-3 border-b border-white/10 pb-2">Настройки</div>

                                        {/* Playback Speed */}
                                        <div className="mb-4">
                                            <div className="text-white/60 text-xs mb-2 flex items-center gap-2">
                                                <span>Скорость</span>
                                                <span className="text-sparta-gold font-mono">{playbackRate}x</span>
                                            </div>
                                            <div className="flex justify-between gap-1">
                                                {[0.5, 1, 1.5, 2].map((rate) => (
                                                    <button
                                                        key={rate}
                                                        onClick={() => changePlaybackRate(rate)}
                                                        className={`px-2 py-1 rounded text-xs transition-colors ${playbackRate === rate
                                                            ? 'bg-sparta-gold text-black font-bold'
                                                            : 'bg-white/10 text-white hover:bg-white/20'
                                                            }`}
                                                    >
                                                        {rate}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Additional Tools */}
                                        <div className="space-y-2">
                                            {/* Loop Toggle */}
                                            <div className="flex items-center justify-between group cursor-pointer" onClick={toggleLoop}>
                                                <span className="text-white/80 text-xs group-hover:text-white transition-colors">Повтор видео</span>
                                                <div
                                                    className={`w-8 h-4 rounded-full relative transition-colors ${isLooping ? 'bg-sparta-gold' : 'bg-white/20'
                                                        }`}
                                                >
                                                    <div
                                                        className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isLooping ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Scale Toggle */}
                                            <button
                                                onClick={toggleObjectFit}
                                                className="w-full flex items-center justify-between text-left group"
                                            >
                                                <span className="text-white/80 text-xs group-hover:text-white transition-colors flex items-center gap-2">
                                                    <BoxSelect size={14} />
                                                    Масштаб
                                                </span>
                                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60 group-hover:bg-white/20 transition-colors">
                                                    {objectFit === 'contain' ? 'Вписать' : 'Заполнить'}
                                                </span>
                                            </button>

                                            {/* PiP Toggle */}
                                            <button
                                                onClick={togglePip}
                                                className="w-full flex items-center justify-between text-left group"
                                            >
                                                <span className="text-white/80 text-xs group-hover:text-white transition-colors flex items-center gap-2">
                                                    <PictureInPicture size={14} />
                                                    PiP режим
                                                </span>
                                            </button>

                                            {/* Download */}
                                            <button
                                                onClick={downloadVideo}
                                                className="w-full flex items-center justify-between text-left group pt-2 border-t border-white/5"
                                            >
                                                <span className="text-white/80 text-xs group-hover:text-sparta-gold transition-colors flex items-center gap-2">
                                                    <Download size={14} />
                                                    Скачать
                                                </span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`transition-colors p-1 ${showSettings ? 'text-sparta-gold rotate-45' : 'text-white/60 hover:text-white'}`}
                                title="Настройки"
                            >
                                <Settings size={20} className="transition-transform duration-300" />
                            </button>
                        </div>
                        <button onClick={toggleFullscreen} className="text-white hover:text-sparta-gold transition-colors p-1" title="Полноэкранный режим (F)">
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SpartaVideoPlayer;
