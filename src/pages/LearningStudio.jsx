import { useEffect, useRef, useState } from 'react';
import Button from '../components/Button.jsx';

// ==========================================
// 1. MediaPipe Setup
// ==========================================
const CAMERA_PREVIEW_TARGET_FPS = 60;
const CAMERA_PREVIEW_FRAME_INTERVAL_MS = 1000 / CAMERA_PREVIEW_TARGET_FPS;
const MEDIAPIPE_TARGET_FPS = 15;
const MEDIAPIPE_FRAME_INTERVAL_MS = 1000 / MEDIAPIPE_TARGET_FPS;
const LANDMARK_PREVIEW_SMOOTHING = 0.35;
const MEDIAPIPE_CONFIDENCE_THRESHOLD = 0.5;
const PHASE3_SWITCH_UNLOCK_SCORE = 50;
const POSE_CONFIDENCE_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24];

function getPoseConfidenceScore(poseLandmarks) {
  if (!poseLandmarks) return 0;
  const visibleScores = POSE_CONFIDENCE_LANDMARKS
    .map(idx => poseLandmarks[idx]?.visibility)
    .filter(score => typeof score === 'number');

  if (visibleScores.length === 0) return 1;
  return visibleScores.reduce((sum, score) => sum + score, 0) / visibleScores.length;
}

function filterHandsByConfidence(multiHandLandmarks, multiHandedness) {
  if (!Array.isArray(multiHandLandmarks)) return [];
  return multiHandLandmarks.filter((_, idx) => {
    const confidence = multiHandedness?.[idx]?.score;
    return typeof confidence !== 'number' || confidence >= MEDIAPIPE_CONFIDENCE_THRESHOLD;
  });
}

function smoothLandmarkPoint(previous, next) {
  if (!previous || !next) return next;
  const alpha = LANDMARK_PREVIEW_SMOOTHING;
  return {
    ...next,
    x: previous.x + ((next.x - previous.x) * alpha),
    y: previous.y + ((next.y - previous.y) * alpha),
    z: typeof next.z === 'number' && typeof previous.z === 'number'
      ? previous.z + ((next.z - previous.z) * alpha)
      : next.z,
    visibility: typeof next.visibility === 'number' && typeof previous.visibility === 'number'
      ? previous.visibility + ((next.visibility - previous.visibility) * alpha)
      : next.visibility,
  };
}

function smoothLandmarks(previousLandmarks, nextLandmarks) {
  if (!nextLandmarks) return null;
  if (!previousLandmarks || previousLandmarks.length !== nextLandmarks.length) return nextLandmarks;
  return nextLandmarks.map((landmark, idx) => smoothLandmarkPoint(previousLandmarks[idx], landmark));
}

function smoothMultiHandLandmarks(previousHands, nextHands) {
  if (!Array.isArray(nextHands)) return [];
  if (!Array.isArray(previousHands) || previousHands.length !== nextHands.length) return nextHands;
  return nextHands.map((hand, idx) => smoothLandmarks(previousHands[idx], hand));
}

// ==========================================
// 2. UI Components ( ปรับขนาดปุ่ม )

const LearningStudio = ({ selectedPose, setCurrentPage, setFinalAverageScore }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [calibState, _setCalibState] = useState('detecting'); 
  const calibStateRef = useRef('detecting');
  const setCalibState = (val) => { calibStateRef.current = val; _setCalibState(val); };
  
  const [countdown, setCountdown] = useState(3);
  const [currentScore, setCurrentScore] = useState(0);
  
  const [feedbackMessages, setFeedbackMessages] = useState([]);

  // Refs สำหรับการควบคุมดีเลย์ (Throttle) ของ Feedback เพื่อไม่ให้ข้อความสลับรัวเกินไป
  const lastFeedbackUpdateTimeRef = useRef(0);
  const cachedFeedbackRef = useRef([]);

  // --- Tutorial States & Refs ---
  const [tutorialPhase, setTutorialPhase] = useState(1);
  const phaseRef = useRef(1);
  const [tutorialMsg, setTutorialMsg] = useState('PHASE 1: Train Hands 🤚 Pinch hands and form a clear circle (Score >= 80%)');
  const [holdDisplay, setHoldDisplay] = useState(0);
  const holdStartTimeRef = useRef(null);
  const phase3SuccessCountRef = useRef(0);
  const phase3AwaitingSwitchRef = useRef(false);
  
  // ประวัติบันทึกคะแนนแต่ละรอบใน Phase 3
  const [phase3Loops, setPhase3Loops] = useState([]);

  // Pop-up states
  const [showAccuracyPopup, setShowAccuracyPopup] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState(0);
  const [nextPhaseNumber, setNextPhaseNumber] = useState(2);
  const [isHoldingThreshold, setIsHoldingThreshold] = useState(false);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);

  const latestPose = useRef(null);
  const latestHands = useRef(null);
  const displayPoseRef = useRef(null);
  const displayHandsRef = useRef([]);
  const poseEngineRef = useRef(null);
  const handsEngineRef = useRef(null);
  const poseConnectionsRef = useRef(null);
  const handConnectionsRef = useRef(null);
  const drawConnectorsRef = useRef(null);
  const drawLandmarksRef = useRef(null);
  const animationRef = useRef(null);
  const mediaPipeTimerRef = useRef(null);
  const hasPaintedCameraFrameRef = useRef(false);
  const mediaPipeDetectionReadyRef = useRef(false);
  const lastPreviewFrameTimeRef = useRef(0);
  const isPoseProcessingRef = useRef(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
      } catch {
        setDevices([]);
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
    };
    loadDevices();
  }, []);

  useEffect(() => {
    let pose;
    let hands;
    let isCancelled = false;

    const onResults = (results, isHand = false) => {
      const poseConfidence = !isHand ? getPoseConfidenceScore(results.poseLandmarks) : 0;
      const hasConfidentPose = !isHand && results.poseLandmarks && poseConfidence >= MEDIAPIPE_CONFIDENCE_THRESHOLD;
      const confidentHands = isHand ? filterHandsByConfidence(results.multiHandLandmarks, results.multiHandedness) : [];
      const hasConfidentHands = isHand && confidentHands.length > 0;

      // Phase 1: Show ONLY hands
      if (phaseRef.current === 1) {
        if (isHand) {
          if (hasConfidentHands && calibStateRef.current === 'detecting') {
            mediaPipeDetectionReadyRef.current = true;
            setCalibState('ready');
          }
          latestHands.current = confidentHands;
          displayHandsRef.current = smoothMultiHandLandmarks(displayHandsRef.current, confidentHands);
        }
      }
      // Phase 2: Show ONLY pose joints
      else if (phaseRef.current === 2) {
        if (hasConfidentPose) {
          if (calibStateRef.current === 'detecting') {
            mediaPipeDetectionReadyRef.current = true;
            setCalibState('ready');
          }
          latestPose.current = results.poseLandmarks;
          displayPoseRef.current = smoothLandmarks(displayPoseRef.current, results.poseLandmarks);
        } else if (!isHand) {
          latestPose.current = null;
          displayPoseRef.current = null;
        }
      }
      // Phase 3: Show BOTH hands and pose
      else if (phaseRef.current === 3) {
        if (hasConfidentPose) {
          latestPose.current = results.poseLandmarks;
          displayPoseRef.current = smoothLandmarks(displayPoseRef.current, results.poseLandmarks);
        } else if (!isHand) {
          latestPose.current = null;
          displayPoseRef.current = null;
        }
        if (isHand) {
          latestHands.current = confidentHands;
          displayHandsRef.current = smoothMultiHandLandmarks(displayHandsRef.current, confidentHands);
        }
        if (calibStateRef.current === 'detecting' && latestPose.current && latestHands.current?.length > 0) {
          mediaPipeDetectionReadyRef.current = true;
          setCalibState('ready');
        }
      }

      const shouldEvaluate =
        calibStateRef.current === 'playing' && (
          (phaseRef.current === 1 && isHand && latestHands.current?.length > 0) ||
          (phaseRef.current === 2 && !isHand && latestPose.current) ||
          (phaseRef.current === 3 && isHand && latestPose.current && latestHands.current?.length > 0)
        );

      if (shouldEvaluate) {
        if (selectedPose && selectedPose.evaluator) {
          const evaluation = selectedPose.evaluator.length <= 3
            ? selectedPose.evaluator(latestPose.current, latestHands.current, phaseRef.current)
            : selectedPose.evaluator(latestPose.current, latestHands.current, selectedPose.models?.pose, selectedPose.models?.hand, phaseRef.current);
          const now = performance.now() / 1000;
          let displayScore = 0;
          
          let feedback = [];
          if (selectedPose.feedbackFormatter) {
            feedback = selectedPose.feedbackFormatter(evaluation, phaseRef.current) || [];
          }

          // --- LOGIC CONTROL DELAY (THROTTLE) FEEDBACK ---
          const currentTimeMs = Date.now();
          // ตั้งค่า Delay ไว้ที่ 1.5 วินาที (1500ms) เพื่อป้องกันข้อความกะพริบรัวๆ เปลี่ยนสลับเร็วเกินไป อ่านง่ายสบายตาขึ้น
          if (currentTimeMs - lastFeedbackUpdateTimeRef.current >= 1500) {
            setFeedbackMessages(feedback);
            cachedFeedbackRef.current = feedback;
            lastFeedbackUpdateTimeRef.current = currentTimeMs;
          } else {
            // ถ้าเวลาจริงยังไม่ถึงกำหนดล็อก 1.5 วินาที ให้ใช้ข้อมูลชุดล่าสุดที่แคชไว้ไปก่อนเพื่อความเสถียรของหน้าจอ
            if (feedback.length === 0 && cachedFeedbackRef.current.length > 0) {
              setFeedbackMessages([]);
              cachedFeedbackRef.current = [];
            }
          }

          // คำนวณคะแนนพื้นฐานตามเฟส
          if (phaseRef.current === 1) displayScore = evaluation.handScore || 0;
          else if (phaseRef.current === 2) displayScore = evaluation.poseScore || 0;
          else if (phaseRef.current === 3) displayScore = evaluation.totalScore || 0;

          if (phaseRef.current === 3 && phase3AwaitingSwitchRef.current) {
            holdStartTimeRef.current = null;
            setHoldDisplay(0);
            setIsHoldingThreshold(false);
            setCurrentScore(displayScore);

            if (displayScore < PHASE3_SWITCH_UNLOCK_SCORE) {
              phase3AwaitingSwitchRef.current = false;
              setTutorialMsg(`✓ PHASE 3: Full Dance 🎭 Loop ${phase3SuccessCountRef.current + 1}/3 - Keep pose steady! (Score >= 80%)`);
            } else {
              setTutorialMsg(`↔️ Switch sides before Loop ${phase3SuccessCountRef.current + 1}/3 - move out of the held pose first`);
              return;
            }
          }

          // --- Unified Hold & Countdown Logic ---
          if (displayScore >= 80) {
            if (!holdStartTimeRef.current) {
              holdStartTimeRef.current = now;
              setIsHoldingThreshold(true);
            }
            const holdElapsed = now - holdStartTimeRef.current;
            setHoldDisplay(Math.min(holdElapsed, 3.0));
            
            if (holdElapsed >= 3.0 && !showAccuracyPopup) {
              if (phaseRef.current === 3) {
                // สำหรับ Phase 3 บันทึกประวัติ Loop
                phase3SuccessCountRef.current += 1;
                if (phase3SuccessCountRef.current < 3) {
                  phase3AwaitingSwitchRef.current = true;
                }
                setPhase3Loops(prev => {
                  const updated = [...prev, displayScore];
                  if (updated.length >= 3) {
                    phase3AwaitingSwitchRef.current = false;
                    setAccuracyScore(Math.max(...updated));
                    setNextPhaseNumber(3);
                    setShowAccuracyPopup(true);
                  }
                  return updated;
                });
              } else {
                // สำหรับ Phase 1 และ Phase 2 เปิดประเมินผ่านไปสเต็ปถัดไป
                setAccuracyScore(displayScore);
                setNextPhaseNumber(phaseRef.current === 1 ? 2 : 3);
                setShowAccuracyPopup(true);
              }
              
              // ล้างค่าเมื่อนับจบ Loop
              holdStartTimeRef.current = null;
              setHoldDisplay(0);
              setIsHoldingThreshold(false);
            }
          } else {
            // คะแนนหลุดเกณฑ์ Reset ทันที
            if (holdStartTimeRef.current !== null) {
              holdStartTimeRef.current = null;
              setHoldDisplay(0);
              setIsHoldingThreshold(false);
            }
          }

          // จัดการข้อความไกด์ไลน์บนจอภาพ
          if (phaseRef.current === 1 && displayScore < 80) {
            setTutorialMsg('PHASE 1: Train Hands 🤚 Pinch hands and form a clear circle (Score >= 80%)');
          } else if (phaseRef.current === 2 && displayScore < 80) {
            setTutorialMsg('PHASE 2: Train Body 💪 Elbows and shoulders positioned correctly (Score >= 80%)');
          } else if (phaseRef.current === 3) {
            const currentLoopCount = phase3SuccessCountRef.current;
            if (phase3AwaitingSwitchRef.current) {
              setTutorialMsg(`↔️ Switch sides before Loop ${currentLoopCount + 1}/3 - move out of the held pose first`);
            } else if (currentLoopCount < 3) {
              setTutorialMsg(`✓ PHASE 3: Full Dance 🎭 Loop ${currentLoopCount + 1}/3 - Keep pose steady! (Score >= 80%)`);
            } else {
              setTutorialMsg(`✓ PHASE 3: Complete! Calculating results...`);
            }
          }

          setCurrentScore(displayScore);
        }
      }
    };

    const loadMediaPipeEngines = async () => {
      const [mpPose, mpHands, mpDrawing] = await Promise.all([
        import('@mediapipe/pose'),
        import('@mediapipe/hands'),
        import('@mediapipe/drawing_utils'),
      ]);
      if (isCancelled) return;

      const Pose = mpPose.Pose || window.Pose;
      const Hands = mpHands.Hands || window.Hands;
      poseConnectionsRef.current = mpPose.POSE_CONNECTIONS || window.POSE_CONNECTIONS;
      handConnectionsRef.current = mpHands.HAND_CONNECTIONS || window.HAND_CONNECTIONS;
      drawConnectorsRef.current = mpDrawing.drawConnectors || window.drawConnectors;
      drawLandmarksRef.current = mpDrawing.drawLandmarks || window.drawLandmarks;

      pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      
      hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
      hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

      pose.onResults((res) => onResults(res, false));
      hands.onResults((res) => onResults(res, true));
      poseEngineRef.current = pose;
      handsEngineRef.current = hands;
    };

    loadMediaPipeEngines();

    return () => {
      isCancelled = true;
      pose?.close();
      hands?.close();
      poseEngineRef.current = null;
      handsEngineRef.current = null;
    };
  }, [selectedPose, showAccuracyPopup]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    let stream;
    let isStreamActive = true;
    hasPaintedCameraFrameRef.current = false;
    lastPreviewFrameTimeRef.current = 0;
    displayPoseRef.current = null;
    displayHandsRef.current = [];
    mediaPipeDetectionReadyRef.current = false;
    const resetPreviewTimer = setTimeout(() => {
      setCameraPreviewReady(false);
      mediaPipeDetectionReadyRef.current = false;
    }, 0);

    const drawLivePreview = () => {
      const video = videoRef.current;
      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement?.getContext('2d');
      if (!video || !canvasElement || !canvasCtx || video.readyState < 2) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      if (!mediaPipeDetectionReadyRef.current && calibStateRef.current === 'detecting') {
        canvasCtx.fillStyle = '#000000';
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.restore();
        return;
      }

      canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      if (!hasPaintedCameraFrameRef.current) {
        hasPaintedCameraFrameRef.current = true;
        setCameraPreviewReady(true);
      }

      if (phaseRef.current === 1) {
        if (displayHandsRef.current && drawConnectorsRef.current && drawLandmarksRef.current && handConnectionsRef.current) {
          for (const landmarks of displayHandsRef.current) {
            drawConnectorsRef.current(canvasCtx, landmarks, handConnectionsRef.current, { color: '#00FF0080', lineWidth: 2 });
            drawLandmarksRef.current(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
          }
        }
      } else if (phaseRef.current === 2) {
        if (displayPoseRef.current && drawConnectorsRef.current && drawLandmarksRef.current && poseConnectionsRef.current) {
          const importantJoints = [0, 11, 12, 13, 14, 15, 16, 23, 24];
          const filteredLandmarks = displayPoseRef.current.filter((_, idx) => importantJoints.includes(idx));
          drawConnectorsRef.current(canvasCtx, displayPoseRef.current, poseConnectionsRef.current, { color: '#FFFFFF80', lineWidth: 2 });
          drawLandmarksRef.current(canvasCtx, filteredLandmarks, { color: '#FFA500', lineWidth: 1, radius: 3 });
        }
      } else if (phaseRef.current === 3) {
        if (displayPoseRef.current && drawConnectorsRef.current && drawLandmarksRef.current && poseConnectionsRef.current) {
          drawConnectorsRef.current(canvasCtx, displayPoseRef.current, poseConnectionsRef.current, { color: '#FFFFFF80', lineWidth: 2 });
          drawLandmarksRef.current(canvasCtx, displayPoseRef.current, { color: '#D4AF37', lineWidth: 1, radius: 3 });
        }
        if (displayHandsRef.current && drawConnectorsRef.current && drawLandmarksRef.current && handConnectionsRef.current) {
          for (const landmarks of displayHandsRef.current) {
            drawConnectorsRef.current(canvasCtx, landmarks, handConnectionsRef.current, { color: '#00FF0080', lineWidth: 2 });
            drawLandmarksRef.current(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
          }
        }
      }

      canvasCtx.restore();
    };

    const startStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId }, width: 1280, height: 720 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            videoRef.current.play();
            const processPreview = (timestamp = performance.now()) => {
              if (timestamp - lastPreviewFrameTimeRef.current >= CAMERA_PREVIEW_FRAME_INTERVAL_MS) {
                lastPreviewFrameTimeRef.current = timestamp;
                drawLivePreview();
              }
              if (isStreamActive) animationRef.current = requestAnimationFrame(processPreview);
            };

            const processMediaPipe = () => {
              if (!isStreamActive) return;
              const startedAt = performance.now();
              const activePhase = phaseRef.current;
              const shouldProcessPose = activePhase === 2 || activePhase === 3;
              const shouldProcessHands = activePhase === 1 || activePhase === 3;

              if (
                videoRef.current &&
                videoRef.current.readyState >= 2 &&
                (!shouldProcessPose || poseEngineRef.current) &&
                (!shouldProcessHands || handsEngineRef.current) &&
                !isPoseProcessingRef.current
              ) {
                isPoseProcessingRef.current = true;
                let processing = Promise.resolve();
                if (shouldProcessPose) {
                  processing = processing.then(() => poseEngineRef.current.send({ image: videoRef.current }));
                }
                if (shouldProcessHands) {
                  processing = processing.then(() => handsEngineRef.current.send({ image: videoRef.current }));
                }
                processing
                  .catch(() => {})
                  .finally(() => {
                    isPoseProcessingRef.current = false;
                    if (isStreamActive) {
                      const elapsed = performance.now() - startedAt;
                      mediaPipeTimerRef.current = setTimeout(processMediaPipe, Math.max(0, MEDIAPIPE_FRAME_INTERVAL_MS - elapsed));
                    }
                  });
              } else {
                mediaPipeTimerRef.current = setTimeout(processMediaPipe, MEDIAPIPE_FRAME_INTERVAL_MS);
              }
            };

            processPreview();
            processMediaPipe();
          };
        }
      } catch {
        setCameraPreviewReady(false);
        // Keep the current camera selection if the stream cannot be opened.
      }
    };
    startStream();
    return () => {
      clearTimeout(resetPreviewTimer);
      isStreamActive = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (mediaPipeTimerRef.current) clearTimeout(mediaPipeTimerRef.current);
      isPoseProcessingRef.current = false;
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    if (calibState === 'counting' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (calibState === 'counting' && countdown === 0) {
      const timer = setTimeout(() => setCalibState('playing'), 0);
      return () => clearTimeout(timer);
    }
  }, [calibState, countdown]);

  const maxLoopScore = phase3Loops.length > 0 ? Math.max(...phase3Loops) : 0;
  const selectedPoseIcon = selectedPose?.icon || '🌸';

  return (
    <div className="w-full min-h-screen lg:h-screen overflow-x-hidden lg:overflow-hidden bg-[#05070A] text-white flex flex-col font-sans relative selection:bg-[#D4AF37] selection:text-black">
      
      {/* Accuracy Pop-up */}
      {showAccuracyPopup && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121826] border border-green-500/50 p-6 sm:p-10 lg:p-12 rounded-2xl shadow-2xl flex flex-col items-center max-w-lg w-full">
            <h2 className="text-4xl font-serif text-green-400 mb-6 flex items-center gap-2">✅ Evaluation</h2>
            
            {tutorialPhase === 3 ? (
              <div className="w-full flex flex-col gap-4 mb-8">
                <p className="text-sm text-gray-400 uppercase tracking-widest text-center mb-1">Performance Results (3 Loops)</p>
                <div className="flex flex-col gap-3 w-full">
                  {phase3Loops.map((score, index) => {
                    const isBest = score === maxLoopScore && score > 0;
                    return (
                      <div 
                        key={index} 
                        className={`rounded-xl border flex items-center justify-between px-6 py-4 transition-all ${
                          isBest 
                            ? 'bg-gradient-to-r from-yellow-950/40 to-amber-900/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]' 
                            : 'bg-black/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isBest ? 'text-yellow-400' : 'text-gray-400'}`}>
                            Loop {index + 1}
                          </span>
                          {isBest && <span className="animate-bounce text-xl">👑</span>}
                        </div>
                        <span className={`text-2xl font-bold ${isBest ? 'text-yellow-400 text-3xl' : 'text-gray-200'}`}>
                          {score}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-green-400 flex flex-col items-center justify-center bg-black/40 mb-10">
                <p className="text-sm text-gray-400 uppercase">Score</p>
                <span className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-green-300">{accuracyScore}%</span>
              </div>
            )}

            <div className="flex w-full gap-4 flex-col">
              {tutorialPhase === 3 ? (
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button onClick={() => {
                    setFinalAverageScore(maxLoopScore);
                    setShowAccuracyPopup(false);
                    setCurrentPage('feedback');
                  }} variant="primary" className="flex-1 py-4 rounded-xl">⏭️ Complete Studio</Button>
                  
                  <Button onClick={() => {
                    setShowAccuracyPopup(false);
                    phaseRef.current = 3;
                    setTutorialPhase(3);
                    setPhase3Loops([]);
                    phase3SuccessCountRef.current = 0;
                    phase3AwaitingSwitchRef.current = false;
                    setHoldDisplay(0);
                    setIsHoldingThreshold(false);
                    setTutorialMsg('✓ PHASE 3: Full Dance 🎭 Loop 1/3 - Keep pose steady! (Score >= 80%)');
                  }} variant="outline" className="flex-1 py-4 rounded-xl">🔄 Retry loops</Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button onClick={() => {
                    setShowAccuracyPopup(false);
                    phaseRef.current = nextPhaseNumber;
                    setTutorialPhase(nextPhaseNumber);
                    if (nextPhaseNumber === 3) {
                      setPhase3Loops([]);
                      phase3SuccessCountRef.current = 0;
                      phase3AwaitingSwitchRef.current = false;
                      setTutorialMsg('✓ PHASE 3: Full Dance 🎭 Loop 1/3 - Keep pose steady! (Score >= 80%)');
                    } else if (nextPhaseNumber === 2) {
                      setTutorialMsg('✓ PHASE 2: Train Body 💪 Elbows and shoulders positioned correctly (Score >= 80%)');
                    }
                  }} variant="primary" className="flex-1 py-4 rounded-xl">⏭️ Continue</Button>
                  
                  <Button onClick={() => {
                    setShowAccuracyPopup(false);
                    phaseRef.current = tutorialPhase;
                    holdStartTimeRef.current = null;
                    setHoldDisplay(0);
                    setIsHoldingThreshold(false);
                  }} variant="outline" className="flex-1 py-4 rounded-xl">🔄 Try Again</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {calibState !== 'playing' && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 transition-colors duration-500 ${cameraPreviewReady ? 'bg-[#05070A]/55 backdrop-blur-[2px]' : 'bg-[#0B0F19]/95 backdrop-blur-md'}`}>
          <div className="bg-[#121826]/95 border border-[#D4AF37]/30 p-6 sm:p-10 rounded-xl shadow-2xl flex flex-col items-center max-w-lg w-full text-center">
            {calibState === 'detecting' && (
              <>
                <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-6" />
                <h2 className="text-2xl font-serif text-[#D4AF37] mb-2">
                  {cameraPreviewReady ? 'Camera Calibration' : 'Starting Camera'}
                </h2>
                <p className="text-gray-400">
                  {cameraPreviewReady
                    ? 'Pose detected. Camera preview is ready.'
                    : 'Connecting to your camera before pose detection starts...'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage('select-pose')}
                  className="mt-7 px-7 py-2.5 rounded-lg text-xs"
                >
                  Back
                </Button>
              </>
            )}
            {calibState === 'ready' && (
              <><div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6 text-3xl">✓</div><h2 className="text-2xl font-serif text-[#D4AF37] mb-4">Pose Detected!</h2><p className="text-gray-400 mb-8">You are in position. Ready to start?</p><Button onClick={() => setCalibState('counting')} className="w-full px-8 py-4">Start Lesson</Button></>
            )}
            {calibState === 'counting' && <h1 className="text-9xl font-serif text-[#D4AF37] animate-pulse">{countdown}</h1>}
          </div>
        </div>
      )}

      <div className="min-h-[65px] flex justify-between items-center gap-4 px-4 sm:px-8 md:px-16 py-3 border-b border-white/5 bg-[#0B0F19] z-40 relative shadow-md">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="text-xl p-2.5 bg-yellow-900/40 text-[#D4AF37] rounded-lg border border-[#D4AF37]/30">{selectedPoseIcon}</div>
          <h2 className="min-w-0 text-base sm:text-xl font-serif text-[#D4AF37] uppercase tracking-wider sm:tracking-widest flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 font-bold">
            {selectedPose?.name}
            {calibState === 'playing' && <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full animate-pulse border border-red-500/30 flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full" /> Live Phase {tutorialPhase}</span>}
          </h2>
        </div>
        <Button variant="outline" onClick={() => setCurrentPage('select-pose')} className="text-xs px-4 sm:px-6 py-2.5 rounded-xl shrink-0">Exit</Button>
      </div>
      
      <div className="flex-1 lg:h-[calc(100vh-65px)] flex flex-col xl:flex-row p-3 sm:p-4 gap-4 relative overflow-y-auto lg:overflow-hidden">
        <div className="xl:flex-[7] flex flex-col gap-4 min-h-0">
            <div className="flex-1 flex flex-col md:flex-row gap-4 relative min-h-0">
                <div className="flex-1 min-h-[260px] md:min-h-[360px] xl:min-h-0 bg-[#0B0F19] rounded-xl overflow-hidden border border-white/5 relative flex flex-col">
                  <div className="bg-[#121826] py-2 text-center border-b border-white/5"><h3 className="text-xs text-gray-400 uppercase tracking-widest font-bold">Instructor (Tutorial)</h3></div>
                  <div className="flex-1 relative bg-black flex items-center justify-center">
                    {tutorialPhase < 3 ? (
                      selectedPose?.picture && <img src={selectedPose.picture} alt="Tutorial" className="w-full h-full object-contain" />
                    ) : (
                      selectedPose?.danceVideo ? (
                        <video src={selectedPose.danceVideo} autoPlay muted loop className="w-full h-full object-contain" />
                      ) : null
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-[260px] md:min-h-[360px] xl:min-h-0 bg-[#0B0F19] rounded-xl overflow-hidden border border-[#D4AF37]/30 relative flex flex-col">
                  <div className="bg-[#121826] py-2 px-3 sm:px-4 border-b border-[#D4AF37]/30 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <h3 className="text-xs text-gray-400 uppercase tracking-widest font-bold">Your Canvas</h3>
                    <select className="w-full sm:w-auto bg-[#0B0F19] text-[#D4AF37] border border-[#D4AF37]/50 rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer font-bold" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
                      {devices.length === 0 && <option>Loading Hardware...</option>}
                      {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative bg-black flex items-center justify-center">
                    <video ref={videoRef} className="hidden" autoPlay playsInline muted />
                    <canvas ref={canvasRef} width="1280" height="720" className="w-full h-full object-contain bg-black transform -scale-x-100" />
                  </div>
                </div>
            </div>
            
            <div className="bg-[#0B0F19] rounded-xl border border-white/5 p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <Button variant="outline" onClick={() => setCurrentPage('select-pose')} className="text-sm px-6 lg:px-10 py-3 lg:py-4">Abort Session</Button>
                <div className="text-xs text-gray-500 font-medium text-center lg:text-left">Tutorial Mode Active: Follow the phases to complete the lesson</div>
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                  {tutorialPhase > 1 && (
                    <Button variant="outline" onClick={() => {
                      phaseRef.current = tutorialPhase - 1;
                      setTutorialPhase(tutorialPhase - 1);
                      holdStartTimeRef.current = null;
                      setHoldDisplay(0);
                      setIsHoldingThreshold(false);
                      if (tutorialPhase - 1 === 1) {
                        setTutorialMsg('PHASE 1: Train Hands 🤚 Pinch hands and form a clear circle (Score >= 80%)');
                      } else if (tutorialPhase - 1 === 2) {
                        phase3AwaitingSwitchRef.current = false;
                        setTutorialMsg('✓ PHASE 2: Train Body 💪 Elbows and shoulders positioned correctly (Score >= 80%)');
                      }
                    }} className="text-sm px-6 lg:px-10 py-3 lg:py-4">⬅️ Back Phase</Button>
                  )}
                  <Button variant="primary" onClick={() => {
                    setFinalAverageScore(maxLoopScore > 0 ? maxLoopScore : currentScore);
                    setCurrentPage('feedback');
                  }} className="text-sm px-6 lg:px-10 py-3 lg:py-4">⏭️ Skip Lesson</Button>
                </div>
            </div>
        </div>

        {/* ขวา: สถิติและจุด Feedback */}
        <div className="xl:flex-[3] flex flex-col gap-4 min-h-0">
            <div className={`p-6 md:p-8 rounded-xl border text-center transition-all min-h-[120px] flex flex-col justify-center border-t-4 ${
              tutorialPhase === 1 ? 'bg-red-900/30 border-red-500 text-red-300' : 
              tutorialPhase === 2 ? 'bg-amber-900/30 border-amber-500 text-amber-300' : 
              'bg-green-900/30 border-green-500 text-green-300'
            }`}>
                <h3 className="font-bold text-lg sm:text-xl md:text-2xl leading-relaxed tracking-wide space-y-2 break-words">{tutorialMsg}</h3>
                {isHoldingThreshold && holdDisplay > 0 && (
                  <div className="w-full bg-black/60 rounded-full h-3 mt-4 overflow-hidden border border-white/5">
                    <div className={`h-full transition-all duration-100 ${tutorialPhase === 1 ? 'bg-red-400' : tutorialPhase === 2 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${(holdDisplay / 3) * 100}%` }}></div>
                  </div>
                )}
            </div>

            <div className={`min-h-[160px] xl:flex-[1.2] flex flex-col items-center justify-center rounded-xl border transition-colors duration-500 relative overflow-hidden ${currentScore >= 80 ? 'bg-green-900/20 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-[#0B0F19] border-[#D4AF37]/40'}`}>
                 {isHoldingThreshold ? (
                   <>
                     <p className="text-xs text-amber-400 mb-1 uppercase tracking-widest font-bold animate-pulse">⏱️ HOLD!</p>
                     <h4 className="text-6xl sm:text-7xl font-serif text-amber-400 font-bold">{Math.ceil((3.0 - holdDisplay))}</h4>
                   </>
                 ) : (
                   <>
                     <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-widest font-bold">
                       {tutorialPhase === 1 && '🤚 Hand Score'}
                       {tutorialPhase === 2 && '💪 Body Score'}
                       {tutorialPhase === 3 && '⭐ Total Score'}
                     </p>
                     <h4 className={`text-5xl sm:text-6xl font-serif font-bold ${currentScore >= 80 ? 'text-green-400' : 'text-[#D4AF37]'}`}>{currentScore}%</h4>
                   </>
                 )}
            </div>

            <div className="min-h-[320px] xl:flex-[3.8] bg-[#0B0F19] border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-lg">
                 <div className="bg-[#121826] py-3.5 px-5 border-b border-white/5">
                   <h3 className="text-base text-[#D4AF37] uppercase tracking-widest font-bold">AI Feedback Log</h3>
                   <p className="text-xs text-gray-500 mt-1">📍 From: {selectedPose?.name || 'No Pose Selected'}</p>
                 </div>
                 
                 <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-6 text-gray-300 bg-black/30">
                   {feedbackMessages.length > 0 ? (
                     feedbackMessages.map((msg, idx) => (
                       /* ปรับลดขนาดข้อความ (text size) ลงมา 6px ตามบรีฟ เพื่อให้ไม่อึดอัดสายตาและพอดีกรอบ */
                       <div key={idx} className="p-4 sm:p-6 rounded-xl bg-yellow-900/20 border-2 border-yellow-600/60 text-yellow-400 font-bold text-lg sm:text-[22px] md:text-[24px] leading-relaxed sm:leading-loose shadow-md transition-all animate-fadeIn">
                         💡 {msg}
                       </div>
                     ))
                   ) : (
                     <div className="text-gray-500 italic text-lg leading-relaxed pt-10 text-center px-4">
                       {tutorialPhase === 1 && "Phase 1: Pinch hands and form a clear circle. Get hand score >= 80%"}
                       {tutorialPhase === 2 && "Phase 2: Focus on elbows, shoulders and body position. Get body score >= 80%"}
                       {tutorialPhase === 3 && "Phase 3: Full dance! Perform the dance with correct hands and body posture across 3 distinct loops."}
                     </div>
                   )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. Page Components - Feedback (End Screen)
// ==========================================

export default LearningStudio;
