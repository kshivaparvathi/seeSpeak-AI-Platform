import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseScreenShareReturn {
  isSharing: boolean;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
  captureScreenFrame: () => string | null;
  error: string | null;
}

export const useScreenShare = (): UseScreenShareReturn => {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopScreenShare = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsSharing(false);
  }, [stream]);

  const startScreenShare = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setError('Screen sharing is not supported by this browser.');
      return false;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      // Handle user clicking browser "Stop sharing" bar
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      setStream(mediaStream);
      setIsSharing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User voluntarily cancelled the prompt; no error display needed
        return false;
      }
      console.error('Screen sharing error:', err);
      setError(err.message || 'Failed to start screen sharing.');
      setIsSharing(false);
      return false;
    }
  }, [stopScreenShare]);

  // Capture current frame as high-quality Base64 JPEG data URL
  const captureScreenFrame = useCallback((): string | null => {
    if (!videoRef.current || !isSharing) {
      return null;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      // Scale down large 4K displays to 1280 wide to keep payload lightweight and fast
      const maxWidth = 1280;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch (err) {
      console.error('Failed to capture screen frame:', err);
      return null;
    }
  }, [isSharing]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  return {
    isSharing,
    stream,
    videoRef,
    startScreenShare,
    stopScreenShare,
    captureScreenFrame,
    error,
  };
};
