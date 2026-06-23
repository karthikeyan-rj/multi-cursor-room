import { useState, useRef, useEffect, useCallback } from 'react';

let currentPlayingAudio = null;

export default function VoiceMessagePlayer({ src, duration: propDuration, isOwn }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  const formatTime = (t) => {
    if (!t || t === Infinity) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (currentPlayingAudio && currentPlayingAudio !== audio) {
        currentPlayingAudio.pause();
      }
      audio.play().catch(() => {});
      currentPlayingAudio = audio;
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration && audio.duration !== Infinity) {
      setDuration(audio.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (currentPlayingAudio === audioRef.current) currentPlayingAudio = null;
  }, []);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    const el = progressRef.current;
    if (!audio || !el || !duration) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = fraction * duration;
  }, [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = handleEnded;
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', onEnd);
      if (currentPlayingAudio === audio) currentPlayingAudio = null;
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayTime = isPlaying ? currentTime : (propDuration || duration);

  return (
    <div className={`voice-player ${isOwn ? 'voice-player-own' : ''}`}>
      <button
        className={`voice-play-btn ${isPlaying ? 'is-playing' : ''}`}
        onClick={handlePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        )}
      </button>

      <div className="voice-waveform" ref={progressRef} onClick={handleSeek}>
        <div className="voice-waveform-progress" style={{ width: `${progress}%` }} />
      </div>

      <span className="voice-duration">{formatTime(displayTime)}</span>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
