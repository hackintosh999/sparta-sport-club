class SoundManager {
    private sounds: { [key: string]: HTMLAudioElement } = {};
    private isMuted: boolean = false;

    constructor() {
        this.preloadSounds();
    }

    private preloadSounds() {
        // PROFESSIONAL MECHANICAL / UI SOUNDS
        const soundUrls = {
            // Start: "Whoosh" type sound or subtle mechanism engage
            // Using a clean, high-quality transition sound
            start: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', // Camera shutter winding / fast mechanical

            // Spin: "Heavy Ratchet" / "High-end Switch"
            // Mixkit Camera Shutter Click - clear, distinct, mechanical. 
            // Better than generic "tick".
            tick: 'https://assets.mixkit.co/active_storage/sfx/1430/1430-preview.mp3', // Hard Click (Camera Shutter)

            // Win: "Elegant Success"
            // Not a cartoon fanfare. A pleasant, major notification or success chime.
            // Mixkit "Positive Interface Notification"
            win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Success chime / Bell
        };

        Object.entries(soundUrls).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            audio.volume = 0.5;
            this.sounds[key] = audio;
        });
    }

    playStart() {
        this.playSound('start', 0.4);
    }

    playTick() {
        // Low volume, crisp mechanical click
        this.playSound('tick', 0.3);
    }

    playWin() {
        // Clear, pleasant, avoiding "gamey" distortion
        this.playSound('win', 0.5);
    }

    playTension() {
        // Optional
    }

    private playSound(key: string, volume: number = 0.5) {
        if (this.isMuted || !this.sounds[key]) return;

        const sound = this.sounds[key];

        if (key === 'tick') {
            // For rapid ticks, we need high concurrency
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = volume;
            clone.play().catch(() => { });
        } else {
            sound.currentTime = 0;
            sound.volume = volume;
            sound.play().catch((e) => console.error("Sound play failed", e));
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
    }
}

export const soundManager = new SoundManager();
