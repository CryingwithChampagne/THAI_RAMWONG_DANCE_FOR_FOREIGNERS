// === utils.js (ใช้ร่วมกันได้ทุกเพลง) ===

export function calculateAngle(a, b, c) {
    if (!a || !b || !c) return 0;
    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = (ba.x * bc.x) + (ba.y * bc.y);
    const normBa = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const normBc = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    
    if (normBa * normBc === 0) return 0;
    
    let cosTheta = dot / (normBa * normBc);
    cosTheta = Math.max(-1.0, Math.min(1.0, cosTheta)); // ป้องกันค่าวาดเกินขอบเขต (-1 ถึง 1)
    return (Math.acos(cosTheta) * 180.0) / Math.PI;
}

export function distPts(a, b) {
    if (!a || !b) return 0;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}