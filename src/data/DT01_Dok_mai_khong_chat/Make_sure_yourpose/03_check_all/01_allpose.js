// ========================================================
// Make_sure_yourpose/01_allpose.js (Dokmai Pose)
// เวอร์ชันแก้ไข: เชื่อมต่อข้อมูลไหล่-ข้อมือข้ามไปให้พาร์ทมือประมวลผลได้จริง 100%
// ========================================================

import { getDokmaiPoseScore } from '../02_check_body/01_body.js';
import { getDokmaiHandScore } from '../01_check_hands/01_hand.js';

export function getDokmaiTotalScore(multiHandLandmarks, poseLandmarks) {

    // 1. กลไกความปลอดภัยภาพรวม: หากระบบส่องไม่เจอพิกัดแกนร่างกายหลัก ให้หลุดออก
    if (!poseLandmarks) {
        return 0;
    }

    // 2. ประมวลผลคะแนนฝั่งร่างกาย (เช็กศอก, แขน, การโน้มไหล่เอียงอสมมาตร)
    const poseResult = getDokmaiPoseScore(poseLandmarks);
    const poseScore = poseResult.score;

    // 🚨 3. แก้จุดตายข้ามสคริปต์: บังคับส่งทั้งสองตัวแปร เพื่อให้ลอจิกใน hand.js เอาพิกัดตัวไปจับคู่ล็อกฝั่งมือได้จริง
    const handResult = getDokmaiHandScore(multiHandLandmarks, poseLandmarks);
    const handScore = handResult.score;

    // ถ้านิ้วมือโดนปรับตกเพราะทำท่าผิดกฎเหล็กขั้นรุนแรง (คะแนนต่ำกว่าหรือเท่ากับ 20)
    // ให้ฉุดแต้มรวมลงตามหลักวิชานาฏศิลป์
    if (handScore <= 20) {
        return Math.floor((poseScore * 0.2) + (handScore * 0.8)); //
    }

    // สถานการณ์สภาวะรำปกติ: แบ่งสัดส่วนตัวครึ่งหนึ่ง (50%) + คะแนนมือหน้ากลางลำตัวเต็ม ๆ (50%)
    const totalScore = (poseScore * 0.5) + (handScore * 0.5); 

    return Math.floor(totalScore);
}