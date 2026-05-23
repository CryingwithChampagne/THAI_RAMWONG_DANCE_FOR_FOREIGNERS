import { getRamsiHandScore } from '../01_check_hands/03_hand.js';
import { getRamsiPoseScore } from '../02_check_body/03_body.js';

export function getRamsiTotalScore(multiHandLandmarks, poseLandmarks) {
    if (!poseLandmarks || !multiHandLandmarks || multiHandLandmarks.length === 0) {
        return { score: 0, feedbacks: ["ERROR: Tracking lost! Please ensure your full body and hands are visible (การตรวจจับวัตถุขาดหาย กรุณายืนให้เห็นตัวและมือครบถ้วน)"] };
    }

    const poseResult = getRamsiPoseScore(poseLandmarks);
    const handResult = getRamsiHandScore(multiHandLandmarks, poseLandmarks);

    let combinedFeedbacks = [];
    combinedFeedbacks.push(...poseResult.feedbacks);
    combinedFeedbacks.push(...handResult.feedbacks);

    let finalScore = 100;
    if (handResult.score <= 20) {
        finalScore = Math.floor((poseResult.score * 0.2) + (handResult.score * 0.8));
    } else {
        finalScore = Math.floor((poseResult.score * 0.5) + (handResult.score * 0.5));
    }

    return {
        score: Math.max(0, Math.min(finalScore, 100)),
        feedbacks: combinedFeedbacks
    };
}