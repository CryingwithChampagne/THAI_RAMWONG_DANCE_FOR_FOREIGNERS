export function getAng(a, b, c) {
    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = (ba.x * bc.x) + (ba.y * bc.y);
    const normBa = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const normBc = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    if (normBa * normBc === 0) return 0;
    let cosTheta = dot / (normBa * normBc);
    cosTheta = Math.max(-1.0, Math.min(1.0, cosTheta));
    return (Math.acos(cosTheta) * 180.0) / Math.PI;
}

export function getDist(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
