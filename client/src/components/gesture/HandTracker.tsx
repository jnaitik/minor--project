// ============================================================================
// HandTracker.tsx — MediaPipe HandLandmarker with movable & resizable preview
//
// Features:
// 1. Loads MediaPipe HandLandmarker with GPU delegate
// 2. Captures webcam feed with mirror view
// 3. Detects hands and draws skeleton
// 4. Classifies gestures with hysteresis and adaptive smoothing
// 5. Movable / draggable PiP window across canvas
// 6. Resizable preview (compact / standard / large)
// 7. Sensitivity selector (Low, Medium, High)
// ============================================================================

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGestureStore, type GestureSensitivity, type WebcamSize } from '../../store/gestureStore';
import { classifyGesture, smoothPosition } from '../../lib/gestureRecognizer';
import { processGestureInteraction } from '../../hooks/useGesture';
import { Video, VideoOff, Eye, EyeOff, Move, SlidersHorizontal, Maximize2 } from 'lucide-react';

let HandLandmarker: any = null;
let FilesetResolver: any = null;

// MediaPipe Hand Landmark connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const SIZE_CLASSES: Record<WebcamSize, string> = {
  compact: 'w-44 h-32',
  medium: 'w-56 h-40',
  large: 'w-72 h-52',
};

const HandTracker: React.FC = () => {
  const gestureEnabled = useGestureStore(s => s.gestureEnabled);
  const showWebcam = useGestureStore(s => s.showWebcam);
  const toggleWebcam = useGestureStore(s => s.toggleWebcam);
  const setInitialized = useGestureStore(s => s.setInitialized);
  const setDetecting = useGestureStore(s => s.setDetecting);
  const setGesture = useGestureStore(s => s.setGesture);
  const setCursorPosition = useGestureStore(s => s.setCursorPosition);
  const setPalmCenter = useGestureStore(s => s.setPalmCenter);
  const sensitivity = useGestureStore(s => s.sensitivity);
  const setSensitivity = useGestureStore(s => s.setSensitivity);
  const webcamPosition = useGestureStore(s => s.webcamPosition);
  const setWebcamPosition = useGestureStore(s => s.setWebcamPosition);
  const webcamSize = useGestureStore(s => s.webcamSize);
  const setWebcamSize = useGestureStore(s => s.setWebcamSize);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const gestureHistoryRef = useRef<string[]>([]);

  const [status, setStatus] = useState<string>('Loading...');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const isDraggingPipRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const drawHandSkeleton = useCallback((landmarks: any[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const video = videoRef.current;

    if (!canvas || !ctx || !video) return;

    // Match canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set styles
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#06b6d4';
    ctx.fillStyle = '#22c55e';

    // Draw connections (lines)
    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
      ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
      ctx.stroke();
    });

    // Draw landmarks (dots)
    landmarks.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const handLandmarker = handLandmarkerRef.current;
    const canvas = canvasRef.current;

    if (!video || !handLandmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const timestamp = performance.now();

    // Throttle to ~30fps for smooth detection without pegging CPU
    if (timestamp - lastTimestampRef.current >= 33) {
      try {
        const results = handLandmarker.detectForVideo(video, timestamp);
        lastTimestampRef.current = timestamp;

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]; // Process first hand

          setStatus('Hand detected');
          setDetecting(true);

          if (showWebcam && canvas) {
            drawHandSkeleton(landmarks);
          }

          // Screen mapping
          const canvasWidth = window.innerWidth;
          const canvasHeight = window.innerHeight;

          // Classify gesture with hysteresis & smooth cursor with sensitivity
          const isCurrentlyPinching = useGestureStore.getState().isPinching;
          const currentSensitivity = useGestureStore.getState().sensitivity;

          const gestureResult = classifyGesture(landmarks, canvasWidth, canvasHeight, isCurrentlyPinching);
          const smoothed = smoothPosition(
            gestureResult.cursorPosition,
            useGestureStore.getState().cursorPosition,
            currentSensitivity
          );

          // Stabilize gesture with temporal voting (prevents accidental drops mid-drag)
          gestureHistoryRef.current.push(gestureResult.gesture);
          if (gestureHistoryRef.current.length > 4) {
            gestureHistoryRef.current.shift();
          }
          const pinchCount = gestureHistoryRef.current.filter(g => g === 'pinch').length;
          const stabilizedGesture = pinchCount >= 2 ? 'pinch' : gestureResult.gesture;

          setCursorPosition(smoothed);
          setPalmCenter(gestureResult.palmCenter);
          setGesture(stabilizedGesture as any, gestureResult.confidence);

          // Real-time canvas interaction with full telemetry payload
          processGestureInteraction(
            stabilizedGesture as any,
            smoothed,
            gestureResult.palmCenter,
            gestureResult,
            video ? { videoWidth: video.videoWidth, videoHeight: video.videoHeight } : undefined
          );
        } else {
          gestureHistoryRef.current = [];
          setStatus('No hand detected');
          setDetecting(false);
          setGesture('none', 0);
          processGestureInteraction('none', { x: 0, y: 0 }, { x: 0, y: 0 });

          // Clear canvas when no hand
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (error) {
        // Silently catch mid-frame errors
      }
    }

    animationFrameRef.current = requestAnimationFrame(detect);
  }, [showWebcam, drawHandSkeleton, setDetecting, setCursorPosition, setPalmCenter, setGesture]);

  useEffect(() => {
    if (!gestureEnabled) {
      // Cleanup
      cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setStatus('Disabled');
      setDetecting(false);
      return;
    }

    let isMounted = true;
    setStatus('Loading model...');

    const init = async () => {
      try {
        if (!handLandmarkerRef.current) {
          const vision = await import('@mediapipe/tasks-vision');
          HandLandmarker = vision.HandLandmarker;
          FilesetResolver = vision.FilesetResolver;

          const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );

          handLandmarkerRef.current = await HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU', // Smooth GPU acceleration
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          if (isMounted) setInitialized(true);
        }

        if (isMounted) setStatus('Starting camera...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('Show your hand');
        animationFrameRef.current = requestAnimationFrame(detect);

      } catch (err) {
        console.error('Hand tracking error:', err);
        if (isMounted) setStatus('Error accessing camera');
      }
    };

    init();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gestureEnabled, detect, setInitialized, setDetecting]);

  // PiP Drag handlers to position webcam anywhere
  const handleMouseDownPip = (e: React.MouseEvent) => {
    isDraggingPipRef.current = true;
    const currentX = webcamPosition ? webcamPosition.x : window.innerWidth - 250;
    const currentY = webcamPosition ? webcamPosition.y : window.innerHeight - 200;
    dragOffsetRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingPipRef.current) return;
      const nextX = Math.max(10, Math.min(window.innerWidth - 180, moveEvent.clientX - dragOffsetRef.current.x));
      const nextY = Math.max(60, Math.min(window.innerHeight - 140, moveEvent.clientY - dragOffsetRef.current.y));
      setWebcamPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      isDraggingPipRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!gestureEnabled) return null;

  const positionStyle: React.CSSProperties = webcamPosition
    ? { left: webcamPosition.x, top: webcamPosition.y, position: 'fixed' }
    : { right: 16, bottom: 32, position: 'fixed' };

  return (
    <div style={positionStyle} className="z-40 animate-slide-up select-none">
      {showWebcam ? (
        <div className={`relative overflow-hidden rounded-xl border border-dark-600/60 shadow-2xl bg-dark-900 group ${SIZE_CLASSES[webcamSize]}`}>
          {/* Draggable header bar */}
          <div
            onMouseDown={handleMouseDownPip}
            className="absolute top-0 inset-x-0 h-6 bg-dark-950/80 backdrop-blur-md z-30 flex items-center justify-between px-2 cursor-move border-b border-dark-700/50"
            title="Drag to reposition webcam"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-dark-300 font-medium">
              <Move size={11} className="text-electric-cyan" />
              <span>Camera</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Sensitivity toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
                className="p-1 rounded text-dark-400 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                title="Gesture Settings"
              >
                <SlidersHorizontal size={11} />
              </button>

              {/* Size cycle button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextSize: WebcamSize =
                    webcamSize === 'compact' ? 'medium' : webcamSize === 'medium' ? 'large' : 'compact';
                  setWebcamSize(nextSize);
                }}
                className="p-1 rounded text-dark-400 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                title="Change Window Size"
              >
                <Maximize2 size={11} />
              </button>

              {/* Minimize button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWebcam();
                }}
                className="p-1 rounded text-dark-400 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                title="Minimize Webcam"
              >
                <EyeOff size={11} />
              </button>
            </div>
          </div>

          {/* Quick Settings dropdown */}
          {showSettings && (
            <div className="absolute top-7 right-2 z-40 bg-dark-950/95 border border-dark-600/70 rounded-lg p-2 shadow-xl text-[10px] space-y-1.5 backdrop-blur-md">
              <div className="text-dark-400 font-semibold uppercase tracking-wider">Sensitivity</div>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as GestureSensitivity[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSensitivity(s);
                      setShowSettings(false);
                    }}
                    className={`px-2 py-0.5 rounded capitalize font-medium border ${
                      sensitivity === s
                        ? 'bg-electric-blue/20 text-electric-blue border-electric-blue/40'
                        : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-dark-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover pt-6"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
            autoPlay
          />

          {/* Hand Skeleton Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none pt-6"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Status Overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-dark-950/95 via-dark-950/70 to-transparent pt-3 pb-1.5 px-2.5 pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'Hand detected' ? 'bg-electric-green animate-pulse' : 'bg-electric-amber'}`} />
                <span className="text-[10px] font-medium text-white shadow-sm">
                  {status}
                </span>
              </div>
              <div className="text-[9px] font-mono text-electric-cyan">
                {useGestureStore.getState().currentGesture !== 'none'
                  ? `Action: ${useGestureStore.getState().currentGesture}`
                  : ''}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={toggleWebcam}
          className="w-10 h-10 rounded-xl bg-dark-800/90 border border-dark-600/60 flex items-center justify-center shadow-xl backdrop-blur-sm text-electric-blue hover:text-electric-cyan hover:bg-dark-700 transition-all"
          title="Restore Webcam Preview"
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
};

export default HandTracker;
