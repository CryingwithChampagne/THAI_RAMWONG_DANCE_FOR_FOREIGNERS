// ========================================================
// Make_sure_yourpose/02_check_body/body.js (Dokmai Pose)
// เวอร์ชันอัปเกรดสูงสุด: เพิ่มระบบเช็กระดับไหล่เอียงอสมมาตร (Shoulder Tilting)
// ปรับปรุงระบบ Feedback: "English (ภาษาไทย)"
// ========================================================

import { calculateAngle, distPts } from '../../01_utils.js';

export function getDokmaiPoseScore(poseLandmarks) {
    if (!poseLandmarks || poseLandmarks.length < 25) {
        return { score: 0, feedbacks: ["ERROR: Pose body missing or incomplete! (ไม่พบพิกัดโครงสร้างร่างกายหรือข้อมูลไม่สมบูรณ์!)"] };
    }

    const criticalIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24];
    for (const idx of criticalIndices) {
        if (!poseLandmarks[idx] || typeof poseLandmarks[idx].x === 'undefined' || typeof poseLandmarks[idx].y === 'undefined') {
            return { score: 0, feedbacks: ["ERROR: Some pose landmarks are missing! (พิกัดร่างกายบางจุดขาดหายไป!)"] };
        }
    }

    const lm = poseLandmarks;
    const getP = (id) => lm[id];
    let poseFeedbacks = [];

    const eAngL = calculateAngle(getP(11), getP(13), getP(15)); 
    const eAngR = calculateAngle(getP(12), getP(14), getP(16)); 

    let bentArmAngle = 0;
    let straightArmAngle = 0;
    let straightArmSide = ""; 

    if (eAngL > eAngR) {
        straightArmAngle = eAngL;
        bentArmAngle = eAngR;
        straightArmSide = "L"; 
    } else {
        straightArmAngle = eAngR;
        bentArmAngle = eAngL;
        straightArmSide = "R"; 
    }

    // 3. --- [คิดคะแนนข้อศอก (Elbow Scoring) เต็ม 20 แต้ม] ---
    let sElbow = 0;
    const isStraightValid = straightArmAngle >= 148 && straightArmAngle <= 180;
    const isBentValid = bentArmAngle >= 80 && bentArmAngle <= 142;

    if (isStraightValid && isBentValid) {
        sElbow = 20; 
    } else {
        sElbow = 0;
        if (!isStraightValid && !isBentValid) {
            poseFeedbacks.push("Pose: One arm must be straight and the other must be bent! (แขนข้างหนึ่งต้องเหยียดตรงและอีกข้างต้องงอให้ถูกต้อง!)");
        } else if (!isStraightValid) {
            poseFeedbacks.push("Pose: Stretch your back arm completely straight! (กรุณาเหยียดแขนข้างที่ส่งหลังให้ตรงสุด!)");
        } else if (!isBentValid) {
            poseFeedbacks.push("Pose: Keep your front arm gracefully bent! (กรุณางอแขนข้างที่รำหน้าให้ได้ส่วนโค้งที่สวยงาม!)");
        }
    }

    // 4. --- [คิดคะแนนองศาไหล่ (Shoulder Angle Scoring) เต็ม 20 แต้ม] ---
    const sAngL = calculateAngle(getP(13), getP(11), getP(23)); 
    const sAngR = calculateAngle(getP(14), getP(12), getP(24)); 
    
    let sShoulder = 0;
    const straightShoulderAngle = (straightArmSide === "L") ? sAngL : sAngR;
    const bentShoulderAngle = (straightArmSide === "L") ? sAngR : sAngL;

    if (bentShoulderAngle >= 40 && bentShoulderAngle <= 75) sShoulder += 10;
    if (straightShoulderAngle >= 20 && straightShoulderAngle <= 55) sShoulder += 10;

    // 5. --- [คิดคะแนนสัดส่วนความยาวแขน (Arm Ratio) เต็ม 10 แต้ม] ---
    const leftArmLen = distPts(lm[11], lm[13]) + distPts(lm[13], lm[15]);
    const rightArmLen = distPts(lm[12], lm[14]) + distPts(lm[14], lm[16]);
    const currentRatio = Math.min(leftArmLen, rightArmLen) / (Math.max(leftArmLen, rightArmLen) + 1e-6);
    let sRatio = (currentRatio >= 0.65) ? 10 : 0;

    const armsTotal = sElbow + sShoulder + sRatio; 

    // 6. --- [คิดคะแนนลำตัวและการโน้มไหล่ (Body & Shoulder Tilt) เต็ม 50 แต้ม] ---
    const shMid = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
    const hiMid = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 };
    const bodyAng = calculateAngle(getP(0), shMid, hiMid);
    
    let sBody = 0;
    if (bodyAng >= 150 && bodyAng <= 180) {
        sBody = 20; 
    } else {
        sBody = 5;
        poseFeedbacks.push("Pose: Slightly lean your upper body (กรุณาโน้มลำตัวส่วนบนเล็กน้อย)");
    }

    // Anti-Exploit ขั้นที่ 1: ดักคนยืนตรงทื่อเป็นไม้บรรทัด
    if (Math.abs(lm[0].x - shMid.x) < 0.015) {
        sBody = Math.max(0, sBody - 10);
        poseFeedbacks.push("Pose: Please lean your torso, do not stand completely stiff! (กรุณาเอียงโน้มตัวเล็กน้อย ห้ามยืนตัวตรงทื่อ!)");
    }

    // เช็กการโน้มไหล่ไม่เท่ากัน (Shoulder Tilting Check)
    const shWidth = distPts(getP(11), getP(12)); 
    const bentShoulderY = (straightArmSide === "L") ? lm[12].y : lm[11].y; 
    const straightShoulderY = (straightArmSide === "L") ? lm[11].y : lm[12].y; 

    const shoulderTiltDiff = (bentShoulderY - straightShoulderY) / (shWidth + 1e-6);
    
    let sShoulderTilt = 0;
    if (shoulderTiltDiff > 0.04) {
        sShoulderTilt = 20; 
    } else {
        sShoulderTilt = 0; 
        poseFeedbacks.push("Pose: Drop your shoulder down towards the bent arm side! (โน้มไหล่ลงทางฝั่งแขนที่รำหน้านิดนึง)");
    }

    const sNeck = 10; 
    const bodyNeckTotal = sNeck + sBody + sShoulderTilt; 

    return { score: armsTotal + bodyNeckTotal, feedbacks: poseFeedbacks };
}