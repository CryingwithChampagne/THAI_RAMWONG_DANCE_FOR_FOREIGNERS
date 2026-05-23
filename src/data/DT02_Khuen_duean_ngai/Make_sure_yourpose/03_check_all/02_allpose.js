// Make_sure_yourpose/03_check_all/allpose.js (คืนเดือนหงาย - เวอร์ชันคุมความประพฤติ)
export function getKuenDeunTotalScore(poseScore, handScore, handsDetectedCount) {
    // 1. กล้องจับมือไม่ครบ ข้อมูลไม่น่าเชื่อถือ ปรับเป็น 0
    if (!handsDetectedCount || handsDetectedCount < 2) {
        return 0; 
    }

    // 2. ถ้าพาร์ทมือจับได้ท่าซ้ำ หรือพาร์ทตัวโดนหักข้อห้ามรุนแรงจนต่ำกว่าเกณฑ์วิกฤต
    // ปรับลดตัวคูณเพื่อดึงคะแนนรวมให้ตกทันที (หมดสิทธิ์เนียนผ่าน)
    if (poseScore < 50 || handScore < 20) {
        return Math.floor((poseScore * 0.7) + (handScore * 0.3)); 
    }

    // สภาพการรำปกติ: แบ่งน้ำหนัก ร่างกาย 50% และ นิ้วมือ 50%
    const total = (poseScore * 0.5) + (handScore * 0.5);
    return Math.floor(total);
}