// ========================================================
// ตรวจสอบมือเพลงคืนเดือนหงาย (เวอร์ชันอัปเกรด: คะแนนแปรผันตามความเป๊ะ + บังคับ 2 มือ)
// ปรับปรุงระบบ Feedback: "English (ภาษาไทย)"
// ========================================================
import { distPts } from '../../02_utils.js';

export function getKuenDeunHandScore(multiHandLandmarks) {
    // 1. ดักจับกรณีที่กล้องเห็นมือไม่ครบ 2 ข้าง
    if (!multiHandLandmarks || multiHandLandmarks.length < 2) {
        return { 
            score: 0, 
            feedbacks: ["ERROR: Please show BOTH hands in front of the camera! (กรุณาแสดงมือให้เห็นทั้ง 2 ข้างเพื่อประเมินผล)"] 
        };
    }

    let hScores = [];
    let handFeedbacks = [];
    let detectedRoles = [];

    // แยกความสูงแกน Y เพื่อหา (มือสูง = ตั้งวงบน, มือต่ำ = จีบหงายชายพก)
    const sortedHands = [...multiHandLandmarks].sort((a, b) => a[0].y - b[0].y);

    // วนลูปตรวจจับแค่มือ 2 ข้างแรกที่ระบบคัดกรองมา
    for (let index = 0; index < 2; index++) {
        const hlm = sortedHands[index];
        const palmSize = distPts(hlm[0], hlm[9]); // ขนาดฝ่ามืออ้างอิง

        // ตรวจสอบระยะพิกัดสำหรับการทำท่า "จีบ" (โป้งชิดชี้)
        const dJeeb = distPts(hlm[4], hlm[8]) / palmSize;

        // คำนวณการกระจายตัว (Spread) ของ 3 นิ้วหลัง [กลาง(12) - นาง(16) - ก้อย(20)]
        const d_12_16 = distPts(hlm[12], hlm[16]) / palmSize; // ระยะกลาง-นาง
        const d_16_20 = distPts(hlm[16], hlm[20]) / palmSize; // ระยะนาง-ก้อย
        
        // เช็กความตึงของนิ้วกลาง (ไม่ให้งอม้วนเข้าอุ้งมือ)
        const isMiddleFingerExtended = hlm[12].y < hlm[10].y; 

        // ตัดสินบทบาทของมือจากระยะ dJeeb
        if (dJeeb < 0.18) { 
            // >>> มอนิเตอร์พาร์ท "มือจีบ" <<<
            detectedRoles.push("jeeb");
            
            // ตรวจสอบเกณฑ์ขั้นต่ำของการกรีดกาง
            const isThreeFingersSpread = (d_12_16 >= 0.22) && (d_16_20 >= 0.22);

            if (isThreeFingersSpread && isMiddleFingerExtended) {
                const currentSpread = (d_12_16 + d_16_20); // ยิ่งค่านี้มาก แปลว่ายิ่งกางสวย
                
                // คำนวณสูตรคณิตศาสตร์เพื่อแปลงค่ากางนิ้วให้เป็นช่วงคะแนน 75 - 100
                let dynamicJeebScore = 75 + Math.round((currentSpread - 0.44) * 50); 
                
                if (dynamicJeebScore > 100) dynamicJeebScore = 100;
                if (dynamicJeebScore < 75) dynamicJeebScore = 75;

                hScores.push(dynamicJeebScore);
            } else {
                hScores.push(20); // หลุดเกณฑ์โดนลงโทษเหลือ 20 คะแนน
                if (!handFeedbacks.includes("Jeeb Hand: Do not press your 3 back fingers together! Spread them out like a fan. (ห้ามให้นิ้วกลาง นิ้วนาง นิ้วก้อย เรียงชิดติดกัน ให้กรีดกางนิ้วออกให้เห็นช่องว่างชัดเจน)")) {
                    handFeedbacks.push("Jeeb Hand: Do not press your 3 back fingers together! Spread them out like a fan. (ห้ามให้นิ้วกลาง นิ้วนาง นิ้วก้อย เรียงชิดติดกัน ให้กรีดกางนิ้วออกให้เห็นช่องว่างชัดเจน)");
                }
            }
        } 
        else {
            // >>> มอนิเตอร์พาร์ท "มือตั้งวง" <<<
            detectedRoles.push("wong");
            
            const totalWongSpread = (d_12_16 + d_16_20); // ยิ่งค่านี้น้อย แปลว่านิ้วยิ่งชิดสนิทกัน
            
            if (totalWongSpread <= 0.32) {
                let dynamicWongScore = Math.round(100 - (totalWongSpread * 93.75)); 
                
                if (dynamicWongScore > 100) dynamicWongScore = 100;
                if (dynamicWongScore < 70) dynamicWongScore = 70; 

                hScores.push(dynamicWongScore);
            } else {
                hScores.push(40); // หลุดเกณฑ์นิ้วชิด ปรับตกเหลือ 40 คะแนน
                if (!handFeedbacks.includes("Wong Hand: Keep your 4 fingers closely pressed together! (เรียงนิ้วมือสำหรับตั้งวงให้ชิดกัน)")) {
                    handFeedbacks.push("Wong Hand: Keep your 4 fingers closely pressed together! (เรียงนิ้วมือสำหรับตั้งวงให้ชิดกัน)");
                }
            }
        }
    }

    // กฎเหล็ก: คืนเดือนหงายต้องมี จีบ 1 และ วง 1 ห้ามทำซ้ำ
    if (detectedRoles[0] === detectedRoles[1]) {
        return { 
            score: 0, 
            feedbacks: ["ERROR: Duplicate gestures! Must have 1 Jeeb and 1 Wong. (ท่าทางซ้ำกัน! ต้องมีจีบ 1 ข้าง และตั้งวง 1 ข้าง)"] 
        };
    }

    // คำนวณคะแนนรวมเฉลี่ยจากมือทั้ง 2 ข้าง
    let finalScore = hScores.length > 0 ? hScores.reduce((a, b) => a + b, 0) / 2 : 0;
    return { score: finalScore, feedbacks: handFeedbacks };
}