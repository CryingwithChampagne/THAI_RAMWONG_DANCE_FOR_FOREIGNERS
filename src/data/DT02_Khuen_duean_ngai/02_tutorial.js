// ========================================================
// tutorial.js (เวอร์ชันคืนเดือนหงาย)
// ปรับปรุงระบบ Feedback: "English (ภาษาไทย)"
// ========================================================
import { getKuenDeunHandScore } from './Make_sure_yourpose/01_check_hands/02_hand.js';
import { getKuenDeunPoseScore } from './Make_sure_yourpose/02_check_body/02_body.js';
import { getKuenDeunTotalScore } from './Make_sure_yourpose/03_check_all/02_allpose.js';

let smoothPose = 0;
let smoothHand = 0;
let currentFeedbacks = [];
let currentHandFeedbacks = [];
let currentPoseFeedbacks = [];

const evaluator = (poseLandmarks, multiHandLandmarks, poseModel, handModel, phase) => {
    const currentPhase = phase || 3;
    let rawHand = 0;
    let rawPose = 0;
    let handRes = { score: 0, feedbacks: ["ERROR: No hands detected! (ไม่พบตำแหน่งมือในเฟรมกล้อง!)"] };
    let poseRes = { score: 0, feedbacks: ["ERROR: Pose body missing! (ไม่พบโครงสร้างร่างกายในเฟรมกล้อง!)"] };

    if ((currentPhase === 1 || currentPhase === 3) && multiHandLandmarks && multiHandLandmarks.length > 0) {
        handRes = getKuenDeunHandScore(multiHandLandmarks);
        rawHand = handRes.score;
    }
    if ((currentPhase === 2 || currentPhase === 3) && poseLandmarks) {
        poseRes = getKuenDeunPoseScore(poseLandmarks);
        rawPose = poseRes.score;
    }

    currentHandFeedbacks = handRes.feedbacks || [];
    currentPoseFeedbacks = poseRes.feedbacks || [];

    if (currentPhase === 1 || currentPhase === 3) {
        smoothHand = (smoothHand * 0.7) + (rawHand * 0.3);
    }
    if (currentPhase === 2 || currentPhase === 3) {
        smoothPose = (smoothPose * 0.7) + (rawPose * 0.3);
    }

    const finalHand = Math.floor(smoothHand);
    const finalPose = Math.floor(smoothPose);
    const handsCount = multiHandLandmarks ? multiHandLandmarks.length : 0;

    let totalScore = 0;
    if (currentPhase === 1) {
        totalScore = finalHand;
    } else if (currentPhase === 2) {
        totalScore = finalPose;
    } else {
        totalScore = getKuenDeunTotalScore(finalPose, finalHand, handsCount);
    }
    currentFeedbacks = [...currentHandFeedbacks, ...currentPoseFeedbacks];

    return {
        handScore: finalHand,
        poseScore: finalPose,
        totalScore: totalScore,
        handFeedbacks: currentHandFeedbacks,
        poseFeedbacks: currentPoseFeedbacks,
        allFeedbacks: currentFeedbacks
    };
};

const feedbackFormatter = (evaluation, phase) => {
    if (!phase) phase = 3; 
    
    let feedbacksToShow = [];
    
    if (phase === 1) {
        feedbacksToShow = evaluation.handFeedbacks || [];
    } else if (phase === 2) {
        feedbacksToShow = evaluation.poseFeedbacks || [];
    } else if (phase === 3) {
        feedbacksToShow = [...(evaluation.handFeedbacks || []), ...(evaluation.poseFeedbacks || [])];
    }
    
    feedbacksToShow = listUnique(feedbacksToShow);
    
    if (feedbacksToShow.length === 0 && evaluation.totalScore < 80) {
        return ["Keep practicing to improve your posture! (ฝึกฝนต่อไปเพื่อพัฒนาท่ารำให้สวยงามยิ่งขึ้นนะ!)"];
    }
    
    return feedbacksToShow;
};

function listUnique(arr) {
    return arr.filter((value, index, self) => self.indexOf(value) === index);
}

export default { evaluator, feedbackFormatter };
