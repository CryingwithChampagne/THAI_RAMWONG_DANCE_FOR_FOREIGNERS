// ========================================================
// Make_sure_yourpose/01_check_hands/hand.js (Dokmai Pose)
// เวอร์ชันแก้ไขขั้นเด็ดขาด: สลัดบัคค้าง 19% รองรับโหมดมองไม่เห็นตัว (Pose Missing)
// คิดแต้มมือหน้ากลางลำตัว 100% ตามกลยุทธ์ใหม่ของนาย
// ปรับปรุงระบบ Feedback: "English (ภาษาไทย)"
// ========================================================

import { distPts } from '../../01_utils.js';

export function getDokmaiHandScore(multiHandLandmarks, poseLandmarks = null) {
    
    // 1. [FALLBACK MODE] ถ้าระยะไกลแล้วโมเดลมือหลุดสนิท
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
        if (poseLandmarks) {
            const lm = poseLandmarks;
            const leftWrist = lm[15];   
            const rightWrist = lm[16];  
            const leftHip = lm[23];    
            const rightHip = lm[24];   

            if (leftWrist && rightWrist && leftHip && rightHip) {
                if (leftWrist.y < leftHip.y && rightWrist.y < rightHip.y) {
                    return { 
                        score: 75, 
                        feedbacks: ["Distance Mode: Analyze arm structure instead of fingers due to long distance (ตรวจจับระยะไกล วิเคราะห์จากโครงสร้างแขนแทนนิ้วมือ)"] 
                    }; 
                }
            }
        }
        return { score: 0, feedbacks: ["ERROR: Hands not found! Please raise your hands in the camera frame (ไม่พบตำแหน่งมือ กรุณายกมือให้อยู่ในเฟรมกล้อง)"] }; 
    }

    // ปลดล็อกจุดบอด: บังคับแค่ตรวจเจอครบ 2 ข้าง
    if (multiHandLandmarks.length < 2) {
        return { 
            score: 20, 
            feedbacks: ["ERROR: Please show BOTH hands clearly! (กรุณาแสดงมือให้เห็นชัดเจนพร้อมกันทั้ง 2 ข้าง ทั้งมือหน้าและมือหลัง)"] 
        }; 
    }

    let leftHandLandmark = null;
    let rightHandLandmark = null;

    if (poseLandmarks && poseLandmarks[15] && poseLandmarks[16] && Array.isArray(multiHandLandmarks)) {
        const leftWristPose = poseLandmarks[15];
        const rightWristPose = poseLandmarks[16];

        multiHandLandmarks.forEach(hlm => {
            const handWristX = hlm[0].x;
            const handWristY = hlm[0].y;
            const distToLeftWrist = Math.hypot(handWristX - leftWristPose.x, handWristY - leftWristPose.y);
            const distToRightWrist = Math.hypot(handWristX - rightWristPose.x, handWristY - rightWristPose.y);

            if (distToLeftWrist < distToRightWrist) {
                leftHandLandmark = hlm;
            } else {
                rightHandLandmark = hlm;
            }
        });
    } 
    
    // แผน B: ไม่มีพิกัดตัวส่งมา
    if (!leftHandLandmark || !rightHandLandmark) {
        if (!Array.isArray(multiHandLandmarks) || multiHandLandmarks.length === 0) {
            return { 
                score: 0, 
                feedbacks: ["ERROR: Hands not found! Please raise your hands in the camera frame (ไม่พบตำแหน่งมือ กรุณายกมือให้อยู่ในเฟรมกล้อง)"] 
            };
        }
        const sortedByX = [...multiHandLandmarks].sort((a, b) => a[0].x - b[0].x);
        leftHandLandmark = sortedByX[0];  
        rightHandLandmark = sortedByX[1]; 
        
        if (!leftHandLandmark || !rightHandLandmark) {
            return { 
                score: 20, 
                feedbacks: ["ERROR: Please show BOTH hands clearly! (กรุณาแสดงมือให้เห็นชัดเจนพร้อมกันทั้ง 2 ข้าง ทั้งมือหน้าและมือหลัง)"] 
            };
        }
    }

    const leftResult = processSingleHandLogic(leftHandLandmark, "Left (ซ้าย)");
    const rightResult = processSingleHandLogic(rightHandLandmark, "Right (ขวา)");

    // เช็กกฎเหล็กห้ามท่าซ้ำกัน
    if (leftResult.role === rightResult.role && leftResult.role !== "invalid" && leftResult.role !== "fist") {
        return { 
            score: 15, 
            feedbacks: ["ERROR: Duplicate hand poses! Must have 1 Jeeb and 1 Wong (ท่ามือซ้ำกัน! ต้องมี จีบ 1 ข้าง และตั้งวง 1 ข้างเท่านั้น)"], 
            leftRole: leftResult.role,
            rightRole: rightResult.role
        };
    }

    let frontHandResult = null;
    let backHandResult = null;

    if (leftHandLandmark[0].y < rightHandLandmark[0].y) {
        frontHandResult = leftResult;  
        backHandResult = rightResult;  
    } else {
        frontHandResult = rightResult; 
        backHandResult = leftResult;   
    }

    let combinedFeedbacks = [];
    if (frontHandResult.feedbacks.length > 0) {
        combinedFeedbacks.push(...frontHandResult.feedbacks);
    }

    if (backHandResult.role === "fist") {
        return { 
            score: 10, 
            feedbacks: ["ERROR: Back hand detected as fist! Please extend fingers to pose (ตรวจพบว่ามือด้านหลังเป็นการกำหมัด! กรุณาเหยียดนิ้วมือให้ถูกต้อง)"],
            leftRole: leftResult.role,
            rightRole: rightResult.role
        };
    }

    let finalHandScore = frontHandResult.score;

    return { 
        score: finalHandScore, 
        feedbacks: combinedFeedbacks,
        leftRole: leftResult.role,
        rightRole: rightResult.role
    };
}

function processSingleHandLogic(hlm, sideName) {
    const palmSize = distPts(hlm[0], hlm[9]); 
    
    // 1. ดักจับท่ากำหมัดเด็ดขาด
    const middleToWrist = distPts(hlm[0], hlm[12]) / palmSize; 
    const ringToWrist = distPts(hlm[0], hlm[16]) / palmSize; 
    if ((middleToWrist < 1.25) && (ringToWrist < 1.25)) { 
        return { score: 0, role: "fist", feedbacks: [`${sideName} Hand: Fist detected! Please extend your fingers (${sideName}: ตรวจพบการกำหมัด! กรุณาเหยียดนิ้วมือออก)`] };
    }

    // 2. ดักจับบัคหุบนิ้วโป้งเข้าอุ้งมือ
    const isThumbFoldedInPalm = (hlm[4].y > hlm[5].y) && (distPts(hlm[4], hlm[9]) / palmSize < 0.45); 
    if (isThumbFoldedInPalm) {
        return { 
            score: 20, 
            role: "invalid", 
            feedbacks: [`${sideName} Hand: Do not fold your thumb into your palm! (${sideName}: อย่าหุบนิ้วโป้งเข้ามาในอุ้งมือ!)`] 
        };
    }

    // 3. คำนวณระยะตรวจจับท่าจีบ
    const dJeeb = distPts(hlm[4], hlm[8]) / palmSize; 
    if (dJeeb < 0.18) { 
        const isTipBelowWrist = hlm[8].y > hlm[0].y;
        
        let kwamScoreBonus = isTipBelowWrist ? 50 : 15;
        let jeebFeedbacks = [];
        
        if (kwamScoreBonus === 15) {
            jeebFeedbacks.push(`${sideName} Jeeb Hand: Must be a "downward Jeeb" at navel level! (${sideName}: ต้องเป็น "จีบคว่ำ" ระดับสะดือเท่านั้น!)`);
        }

        const isFlexingWrist = hlm[4].y < hlm[0].y; 
        const wristFlexScore = isFlexingWrist ? 50 : 30; 
        const pinchScore = Math.max(0, 50 - (Math.abs(dJeeb - 0.1) * 300)); 
        
        return { 
            score: Math.round((kwamScoreBonus * 0.6) + ((wristFlexScore + pinchScore) * 0.4)), 
            role: "jeeb", 
            feedbacks: jeebFeedbacks 
        };
    } 
    // 4. คำนวณระยะตรวจจับท่าตั้งวง
    else {
        const d_8_12_S = distPts(hlm[8], hlm[12]) / palmSize;   
        const d_12_16_S = distPts(hlm[12], hlm[16]) / palmSize; 
        const d_16_20_S = distPts(hlm[16], hlm[20]) / palmSize; 

        const maxWongSpreadAllowed = 0.22; 
        const isSpreading = (d_8_12_S > maxWongSpreadAllowed || d_12_16_S > maxWongSpreadAllowed || d_16_20_S > maxWongSpreadAllowed); 

        let wongFeedbacks = [];
        if (isSpreading) {
            wongFeedbacks.push(`${sideName} Wong Hand: Fingers must be close together, do not spread too wide! (${sideName}: นิ้วตั้งวงกลางลำตัวต้องเรียงชิดติดกัน ห้ามกางนิ้วมือห่างกันเกินไป)`); 
        }

        const scoreIdx = (d_8_12_S <= maxWongSpreadAllowed) ? 40 : 20; 
        const scoreMid = (d_12_16_S <= maxWongSpreadAllowed) ? 40 : 20; 
        const scoreRng = (d_16_20_S <= maxWongSpreadAllowed) ? 35 : 15; 

        return { 
            score: (scoreIdx + scoreMid + scoreRng), 
            role: "wong", 
            feedbacks: wongFeedbacks 
        };
    }
}