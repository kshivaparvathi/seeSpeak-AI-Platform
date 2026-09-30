'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';
import { UploadedFile } from '@/lib/types';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (file: UploadedFile) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    setCapturedImage(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error('Camera error:', err);
      setErrorMsg('Unable to access camera. Please check browser permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    }
  };

  const retakeSnapshot = () => {
    setCapturedImage(null);
  };

  const confirmSnapshot = () => {
    if (!capturedImage) return;

    const file: UploadedFile = {
      id: 'cam_' + Date.now().toString(36),
      name: `Camera_Capture_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.jpg`,
      size: Math.round(capturedImage.length * 0.75),
      type: 'image',
      mimeType: 'image/jpeg',
      base64Data: capturedImage,
      status: 'ready',
      uploadProgress: 100,
    };

    onPhotoCaptured(file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-indigo-400" />
            <h3 className="font-semibold text-white text-sm md:text-base">Capture Image</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center text-xs text-rose-400">
              <p>{errorMsg}</p>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Snapshot" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center gap-4">
          {capturedImage ? (
            <>
              <button
                onClick={retakeSnapshot}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700"
              >
                <RefreshCw size={14} />
                <span>Retake</span>
              </button>
              <button
                onClick={confirmSnapshot}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
              >
                <Check size={14} />
                <span>Attach to Chat</span>
              </button>
            </>
          ) : (
            <button
              onClick={takeSnapshot}
              disabled={Boolean(errorMsg)}
              className="p-4 rounded-full bg-white hover:bg-slate-200 text-black shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
              title="Snap photo"
            >
              <div className="w-4 h-4 rounded-full border-2 border-black" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
