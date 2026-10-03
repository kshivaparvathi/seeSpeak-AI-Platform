import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseScreenShareReturn {
  isSharing: boolean;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  bindVideoRef: (node: HTMLVideoElement | null) => void;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
  captureScreenFrame: () => string | null;
  resolution: { width: number; height: number };
  error: string | null;
}

export const useScreenShare = (): UseScreenShareReturn => {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestFrameRef = useRef<string | null>(null);

  // Stop sharing and clean up all media tracks and element bindings
  const stopScreenShare = useCallback(() => {
    const activeStream = streamRef.current || stream;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (_) {}
    }

    streamRef.current = null;
    latestFrameRef.current = null;
    setStream(null);
    setIsSharing(false);
    setResolution({ width: 0, height: 0 });
  }, [stream]);

  // Guaranteed ref attachment callback for <video> mounting
  const bindVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    const activeStream = streamRef.current;
    if (node && activeStream) {
      if (node.srcObject !== activeStream) {
        node.srcObject = activeStream;
      }
      node.play().catch((err) => {
        console.warn('Video auto-play interrupted:', err);
      });
    }
  }, []);

  // Ensure video element always binds to active stream on stream or sharing change
  useEffect(() => {
    const video = videoRef.current;
    const activeStream = streamRef.current || stream;
    if (video && activeStream) {
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream;
      }
      video.play().catch((err) => {
        console.warn('Video auto-play check:', err);
      });
    }
  }, [stream, isSharing]);

  // Start real browser screen capture
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
          frameRate: { ideal: 20, max: 30 },
        },
        audio: false,
      });

      // Handle user clicking browser native "Stop sharing" floating bar
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };

        const settings = videoTrack.getSettings();
        if (settings.width && settings.height) {
          setResolution({ width: settings.width, height: settings.height });
        }
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsSharing(true);

      // Connect to video element immediately if already present
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => {
          console.warn('Initial video play error:', e);
        });
      }

      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled picker dialog
        return false;
      }
      console.error('Screen sharing error:', err);
      setError(err.message || 'Failed to start screen sharing.');
      setIsSharing(false);
      return false;
    }
  }, [stopScreenShare]);

  // Capture current high-clarity Base64 JPEG data URL from the active screen stream
  const captureScreenFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const activeStream = streamRef.current || stream;

    if (!isSharing && !activeStream) {
      return null;
    }

    try {
      // 1. Capture from live playing video element
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement('canvas');
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
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          latestFrameRef.current = dataUrl;
          return dataUrl;
        }
      }

      // 2. Return cached latest valid frame if video is in mid-buffer
      if (latestFrameRef.current) {
        return latestFrameRef.current;
      }
    } catch (err) {
      console.error('Failed to capture screen frame:', err);
    }

    return null;
  }, [isSharing, stream]);

  // Lightweight frame refresher: keeps latestFrameRef synchronized every 1000ms
  // so whatever window or tab the user switches to, the AI immediately has fresh context
  useEffect(() => {
    if (!isSharing || !stream) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          const canvas = document.createElement('canvas');
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
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            latestFrameRef.current = canvas.toDataURL('image/jpeg', 0.82);

            if (video.videoWidth !== resolution.width || video.videoHeight !== resolution.height) {
              setResolution({ width: video.videoWidth, height: video.videoHeight });
            }
          }
        } catch (_) {}
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSharing, stream, resolution.width, resolution.height]);

  // Clean up all tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (_) {}
        });
      }
    };
  }, []);

  return {
    isSharing,
    stream,
    videoRef,
    bindVideoRef,
    startScreenShare,
    stopScreenShare,
    captureScreenFrame,
    resolution,
    error,
  };
};
