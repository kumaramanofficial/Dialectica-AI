import { useRef, useState, useCallback } from 'react';

export const useVoiceRecorder = () => {
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);

    const start = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunksRef.current = [];
            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            mr.start();
            mediaRecorderRef.current = mr;
            setIsRecording(true);
        } catch (e) {
            setError(e?.message || 'Microphone access denied');
            throw e;
        }
    }, []);

    const stop = useCallback(() => {
        return new Promise((resolve) => {
            const mr = mediaRecorderRef.current;
            if (!mr) return resolve(null);
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                mediaRecorderRef.current = null;
                setIsRecording(false);
                resolve(blob);
            };
            mr.stop();
        });
    }, []);

    return { start, stop, isRecording, error };
};
