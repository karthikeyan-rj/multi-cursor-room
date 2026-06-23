import { useState, useRef, useEffect, useCallback } from 'react';

const MAX_RECORDING_SECONDS = 60;

function getRecorderOptions() {
  const base = { audioBitsPerSecond: 32000 };
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return { ...base, mimeType: 'audio/webm;codecs=opus' };
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return { ...base, mimeType: 'audio/webm' };
  }
  return base;
}

export default function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    cancelledRef.current = false;
    chunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Voice recording is not supported in this browser.');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access to record voice messages.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found.');
      } else {
        setError('Voice recording is not supported in this browser.');
      }
      return;
    }

    streamRef.current = stream;
    const options = getRecorderOptions();

    let mediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch {
      const fallback = { ...options };
      delete fallback.audioBitsPerSecond;
      try {
        mediaRecorder = new MediaRecorder(stream, fallback);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
    }

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      if (!cancelledRef.current && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      }
      setIsRecording(false);
      cleanup();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((t) => {
        const next = t + 1;
        if (next >= MAX_RECORDING_SECONDS && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          return MAX_RECORDING_SECONDS;
        }
        return next;
      });
    }, 1000);
  }, [audioUrl, cleanup]);

  const stopRecording = useCallback(() => {
    cancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setIsRecording(false);
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
  }, [audioUrl, cleanup]);

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
    setRecordingTime(0);
    setError(null);
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording, recordingTime, audioBlob, audioUrl, error,
    startRecording, stopRecording, cancelRecording, reset
  };
}
