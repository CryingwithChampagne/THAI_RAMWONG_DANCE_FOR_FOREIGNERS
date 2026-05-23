// ========================================================
// Make_sure_yourpose/02_check_body/body.js (Kuen Deun Ngai)
// เวอร์ชันมหาโหด: แก้ไขบั๊กคะแนนเฟ้อ 99% ปรับสูตรคำนวณละเอียดเชิงเส้น (Linear Drop)
// ปรับปรุงระบบ Feedback: "English (ภาษาไทย)"
// ========================================================

import { calculateAngle, distPts } from '../../02_utils.js';

export function getKuenDeunPoseScore(poseLandmarks) {
    if (!poseLandmarks) return { score: 0, feedbacks: ["ERROR: Pose body missing! (ไม่พบโครงสร้างพิกัดร่างกาย!)"] };

    const lm = poseLandmarks;
    const getP = (id) => lm[id];
    let poseFeedbacks = [];

    const shMid = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
    const shWidth = distPts(lm[11], lm[12]);

    // ----------------------------------------------------
    // 🚨 ส่วนที่ 1: HEIGHT GATING (ความสูงและการแยกมือระดับวงบน-ชายพก) -> [เต็ม 30 คะแนน]
    // ----------------------------------------------------
    const higherHandY = Math.min(lm[15].y, lm[16].y);
    const lowerHandY = Math.max(lm[15].y, lm[16].y);
    const handGap = lowerHandY - higherHandY;

    let sHeightGating = 30;
    const targetGap = shWidth * 0.9; 
    
    // ดักจับเคสขัดเกณฑ์รุนแรง
    if (handGap < shWidth * 0.6 || lowerHandY < shMid.y) {
        sHeightGating = 5;
        poseFeedbacks.push("Pose: Hand levels are incorrect! One hand must be high (eyebrow level) and the other low (abdominal level) (ระดับมือผิดพลาด! ต้องมีมือหนึ่งอยู่สูงระดับคิ้ว และอีกมืออยู่ต่ำระดับหน้าท้อง/ชายพก)");
    } else {
        const gapDeficit = Math.max(0, targetGap - handGap);
        const gapPenalty = Math.min(20, gapDeficit * 150); 
        sHeightGating -= gapPenalty;
    }

    // ----------------------------------------------------
    // 🚨 ส่วนที่ 2: ARM GEOMETRY (ความเป๊ะขององศาข้อศอกและมุมเปิดไหล่) -> [เต็ม 30 คะแนน]
    // ----------------------------------------------------
    const isLeftWong = lm[15].y < lm[16].y;
    const eAngWong = isLeftWong ? calculateAngle(getP(11), getP(13), getP(15)) : calculateAngle(getP(12), getP(14), getP(16));
    const sAngWong = isLeftWong ? calculateAngle(getP(13), getP(11), getP(23)) : calculateAngle(getP(14), getP(12), getP(24));

    let sArmGeometry = 30;
    
    // คำนวณความเบี่ยงเบนของศอกฝั่งตั้งวงบน (Target อุดมคติคือประมาณ 115 องศา)
    const idealElbow = 115;
    const elbowDiff = Math.abs(eAngWong - idealElbow);
    if (elbowDiff > 25) {
        const elbowPenalty = Math.min(15, (elbowDiff - 25) * 0.7);
        sArmGeometry -= elbowPenalty;
        poseFeedbacks.push("Pose: Adjust your Wong elbow into a soft curve, not too low or too sharp (ปรับข้อศอกฝั่งตั้งวงให้งอโค้งพอดี ไม่ตกต่ำหรือกางแหลมเกินไป)");
    }

    // เช็กมุมกางเปิดรักแร้/เปิดไหล่ (Shoulder Abduction)
    const minShoulderAngle = 40; 
    if (sAngWong < minShoulderAngle) {
        const shoulderPenalty = Math.min(15, (minShoulderAngle - sAngWong) * 0.8);
        sArmGeometry -= shoulderPenalty;
        poseFeedbacks.push("Pose: Open up your elbow and shoulder slightly more on the Wong side for elegance (กางข้อศอกและเปิดไหล่ฝั่งตั้งวงขึ้นอีกเล็กน้อย เพื่อความสง่างาม)");
    }

    // ----------------------------------------------------
    // 🚨 ส่วนที่ 3: SHOULDER TILTING (การโน้มบ่าเอียงไหล่ตามจังหวะสอดสร้อย) -> [เต็ม 20 คะแนน]
    // ----------------------------------------------------
    let sShoulderTilt = 20;
    const leftShoulderY = lm[11].y;
    const rightShoulderY = lm[12].y;
    
    const actualTilt = isLeftWong ? (leftShoulderY - rightShoulderY) : (rightShoulderY - leftShoulderY);
    const expectedMinTilt = shWidth * 0.08; 

    if (actualTilt < expectedMinTilt) {
        const tiltDeficit = expectedMinTilt - actualTilt;
        const tiltPenalty = Math.min(15, tiltDeficit * 200);
        sShoulderTilt -= tiltPenalty;
        poseFeedbacks.push("Pose: Lower your shoulder on the Jeeb side and raise the Wong side (กดไหล่ฝั่งมือจีบลง และยกไหล่ฝั่งตั้งวงขึ้น เอียงบ่าให้เยื้องรับกับศีรษะ)");
    }

    // ----------------------------------------------------
    // 🚨 ส่วนที่ 4: BODY LEAN & HEAD TILT (การเอียงคอรับบ่า) -> [เต็ม 20 คะแนน]
    // ----------------------------------------------------
    const isHeadLeft = lm[0].x < shMid.x;
    const isLeftHandJeeb = !isLeftWong;
    const isNeckLeaningCorrect = (isLeftHandJeeb && isHeadLeft) || (!isLeftHandJeeb && !isHeadLeft);

    let sLean = 20;
    const headDisplacement = Math.abs(lm[0].x - shMid.x); 

    if (headDisplacement < 0.022) { 
        sLean = 0;
        poseFeedbacks.push("Pose: Do not stand completely stiff! Lean your torso and tilt your head slightly (ห้ามยืนตัวตรงทื่อ! ให้โน้มลำตัวและเอียงศีรษะดัดกล่อมหน้า)");
    } else if (!isNeckLeaningCorrect) {
        sLean = 5;
        poseFeedbacks.push("Pose: Head tilting is on the wrong side! Tilt towards the same side as the Jeeb hand (เอียงศีรษะผิดฝั่ง! ต้องเอียงไปทางฝั่งเดียวกับมือที่ทำท่าจีบชายพก)");
    } else {
        if (headDisplacement < 0.035) {
            sLean -= Math.round((0.035 - headDisplacement) * 300);
        }
    }

    // ----------------------------------------------------
    // 🎯 รวมคะแนนสรุป
    // ----------------------------------------------------
    const finalPoseScore = Math.max(0, Math.floor(sHeightGating + sArmGeometry + sShoulderTilt + sLean));

    return {
        score: finalPoseScore,
        feedbacks: poseFeedbacks
    };
}