import { getDist } from '../../03_utils.js';

export function getRamsiHandScore(multiHandLandmarks) {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
        return { score: 0, feedbacks: ["ERROR: Hands not found! Please raise your hands in the camera frame (ไม่พบตำแหน่งมือ กรุณายกมือให้อยู่ในเฟรมกล้อง)"] };
    }

    if (multiHandLandmarks.length < 2) {
        return { score: 20, feedbacks: ["ERROR: Please show BOTH hands clearly! (เพลงรำซิมารำต้องแสดงมือให้เห็นชัดเจนพร้อมกันทั้ง 2 ข้าง)"] };
    }

    let handFeedbacks = [];
    let processedHands = [];

    multiHandLandmarks.forEach((hlm) => {
        let handScore = 100;
        let role = "wong"; 

        const d_idx_fist = getDist(hlm[8], hlm[5]);
        const d_mid_fist = getDist(hlm[12], hlm[9]);

        const v_thumb = { x: hlm[4].x - hlm[2].x, y: hlm[4].y - hlm[2].y };
        const v_index = { x: hlm[8].x - hlm[5].x, y: hlm[8].y - hlm[5].y };
        
        const norm_t = Math.sqrt(v_thumb.x * v_thumb.x + v_thumb.y * v_thumb.y);
        const norm_i = Math.sqrt(v_index.x * v_index.x + v_index.y * v_index.y);
        
        const dot_product = (v_thumb.x * v_index.x) + (v_thumb.y * v_index.y);
        let cosTheta = dot_product / (norm_t * norm_i + 1e-6);
        cosTheta = Math.max(-1.0, Math.min(1.0, cosTheta));
        const thumb_angle = (Math.acos(cosTheta) * 180.0) / Math.PI;

        if (d_idx_fist < 0.05 && d_mid_fist < 0.05) {
            handScore = 10;
            role = "fist";
        } else if (thumb_angle < 45.0) {
            handScore = 20;
            role = "invalid";
        }

        const is_pointing_down = hlm[12].y > hlm[9].y;

        processedHands.push({
            landmark: hlm,
            score: handScore,
            role: role,
            isPointingDown: is_pointing_down,
            yPos: hlm[0].y
        });
    });

    // แยกมือบน (แกน Y น้อย) และมือล่าง (แกน Y มาก)
    const sortedByHeight = processedHands.sort((a, b) => a.yPos - b.yPos);
    const upperHand = sortedByHeight[0]; 
    const lowerHand = sortedByHeight[1]; 

    if (!upperHand.isPointingDown && upperHand.role !== "fist") {
        upperHand.score = Math.max(20, upperHand.score - 40);
        handFeedbacks.push("Upper Hand: Fingertips of the upper hand must point down near the elbow! (ปลายนิ้วมือบนต้องคว่ำชี้ดิ่งลงพื้นชิดข้อศอก!)");
    }

    if (lowerHand.isPointingDown && lowerHand.role !== "fist") {
        handFeedbacks.push("Lower Hand: Fingertips of the lower hand must point up at the waist level! (ปลายนิ้วมือล่าง/ชายพก ต้องหงายชี้ขึ้นฟ้า!)");
    }

    if (upperHand.role === "fist" || lowerHand.role === "fist") {
        return { score: 10, feedbacks: ["ERROR: Fist detected! Please extend your fingers properly (ตรวจพบการกำหมัด! กรุณาเหยียดนิ้วมือออกให้ถูกต้อง)"] };
    }

    if (upperHand.role === "invalid" || lowerHand.role === "invalid") {
        handFeedbacks.push("Hand: Do not flatten your hand, flex your fingers into an elegant Thai dance curve (อย่าแบมือราบทื่อเกินไป ดัดปลายนิ้วให้เยื้องทำมุมนาฏศิลป์)");
    }

    // คิดแต้มจากความเป๊ะของมือหน้า (มือบน) 100% เต็ม
    return {
        score: upperHand.score,
        feedbacks: handFeedbacks
    };
}
