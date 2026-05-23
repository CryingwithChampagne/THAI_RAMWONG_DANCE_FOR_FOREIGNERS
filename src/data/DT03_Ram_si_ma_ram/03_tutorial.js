import { getRamsiHandScore } from './Make_sure_yourpose/01_check_hands/03_hand.js';
import { getRamsiPoseScore } from './Make_sure_yourpose/02_check_body/03_body.js';
import { getRamsiTotalScore } from './Make_sure_yourpose/03_check_all/03_allpose.js';

let smoothPose = 0;
let smoothHand = 0;

/**
 * @param {object} poseLandmarks - พิกัดร่างกาย
 * @param {object} multiHandLandmarks - พิกัดมือ
 * @param {number} currentPhase - เฟสที่ตรวจจับ (1 = Hand, 2 = Body, 3 = Hand + Body)
 */
const evaluator = (poseLandmarks, multiHandLandmarks, currentPhase = 3) => {
    console.log("Current Executing Phase In Evaluator:", currentPhase);

    let rawHandPenalty = 0;
    let poseResult = { score: 100, feedbacks: [] };
    let handResult = { score: 0, feedbacks: [] };
    
    let pose_detected = poseLandmarks ? true : false;
    let hands_detected = (multiHandLandmarks && multiHandLandmarks.length > 0) ? true : false;

    // --- [ 1. ประมวลผลฝั่งมือ (03_hand.js) ] ---
    if (hands_detected) {
        handResult = getRamsiHandScore(multiHandLandmarks);
        rawHandPenalty = 100 - handResult.score;
    }
    
    // --- [ 2. ประมวลผลฝั่งร่างกาย (03_body.js) ] ---
    if (currentPhase === 2 || currentPhase === 3) {
        poseResult = getRamsiPoseScore(poseLandmarks);
    }

    // --- [ 3. แยกกลุ่ม FEEDBACK ตามที่ poses.config.js คาดหวัง ] ---
    let handFeedbacks = [...(handResult.feedbacks || [])];
    let poseFeedbacks = [...(poseResult.feedbacks || [])];
    
    if (!hands_detected) handFeedbacks.push("ERROR: Hands not found! Please raise your hands in the camera frame (ไม่พบตำแหน่งมือ กรุณายกมือให้อยู่ในเฟรมกล้อง)");
    if (!pose_detected) poseFeedbacks.push("ERROR: Pose body missing! (ไม่พบโครงสร้างร่างกายบุคคล)");

    let combinedFeedbacks = [...poseFeedbacks, ...handFeedbacks];

    // --- [ 4. คำนวณคะแนนแยกเกณฑ์ ] ---
    let calculatedHandScore = 100;
    let calculatedPoseScore = poseResult.score;

    if (currentPhase === 1) {
        calculatedHandScore = hands_detected ? Math.max(0, 100 - rawHandPenalty) : 0;
        calculatedPoseScore = 100; 
    } else if (currentPhase === 2) {
        calculatedHandScore = 100; 
        calculatedPoseScore = pose_detected ? poseResult.score : 0;
    } else if (currentPhase === 3) {
        calculatedHandScore = pose_detected ? Math.max(0, poseResult.score - rawHandPenalty) : 0;
    }

    if (currentPhase === 1 && !hands_detected) calculatedHandScore = 0;
    if (currentPhase === 2 && !pose_detected) calculatedPoseScore = 0;
    if (currentPhase === 3 && (!pose_detected || !hands_detected)) {
        calculatedHandScore = 0;
        calculatedPoseScore = 0;
    }

    // --- [ 5. Smoothing คะแนน ] ---
    if (currentPhase === 1 || currentPhase === 3) {
        smoothHand = (smoothHand * 0.8) + (calculatedHandScore * 0.2);
    }
    if (currentPhase === 2 || currentPhase === 3) {
        smoothPose = (smoothPose * 0.8) + (calculatedPoseScore * 0.2);
    }

    const finalHand = Math.floor(smoothHand);
    const finalPose = Math.floor(smoothPose);
    
    // --- [ 6. สรุปคะแนนรวมสุทธิ ] ---
    let totalScore = 0;
    if (currentPhase === 1) {
        totalScore = finalHand;
    } else if (currentPhase === 2) {
        totalScore = finalPose;
    } else {
        totalScore = getRamsiTotalScore(multiHandLandmarks, poseLandmarks).score;
    }

    return {
        handScore: finalHand,
        poseScore: finalPose,
        totalScore: totalScore,
        currentPhase: currentPhase,
        handFeedbacks: handFeedbacks,
        poseFeedbacks: poseFeedbacks,
        feedbacks: combinedFeedbacks,
        feedback: combinedFeedbacks 
    };
};

const feedbackFormatter = (evaluation) => {
    const targetFeedback = evaluation?.feedbacks || evaluation?.feedback || [];
    return Array.from(new Set(targetFeedback)).slice(0, 4);
};

export default {
    evaluator,
    feedbackFormatter
};
