import { getDist, getAng } from '../../03_utils.js';

class RamsiPosturalScorer {
    constructor() {
        this.same_level_frames = 0;
        this.fps = 30; 
    }
}
let scorerInstance = new RamsiPosturalScorer();

export function getRamsiPoseScore(poseLandmarks) {
    if (!poseLandmarks) {
        return { score: 0, feedbacks: ["ERROR: Pose body missing! (ไม่พบโครงสร้างร่างกายบุคคล)"] };
    }

    let current_score = 100;
    let localFeedback = [];

    const lm = poseLandmarks;
    const get_p = (i) => [lm[i].x, lm[i].y, lm[i].z];

    const l_w = get_p(15), r_w = get_p(16);
    const l_e = get_p(13), r_e = get_p(14);
    const l_s = get_p(11), r_s = get_p(12);
    const l_h = get_p(23), r_h = get_p(24);
    const nose = get_p(0);
    const mid_ear_y = (lm[7].y + lm[8].y) / 2;

    const left_elbow_forward = l_s[2] - l_e[2];
    const right_elbow_forward = r_s[2] - r_e[2];
    const left_wrist_forward = l_s[2] - l_w[2];
    const right_wrist_forward = r_s[2] - r_w[2];

    const is_arm_thrust_forward = left_elbow_forward > 0.28 || right_elbow_forward > 0.28 || 
                                  left_wrist_forward > 0.28 || right_wrist_forward > 0.28;

    if (is_arm_thrust_forward) {
        localFeedback.push("Pose: Do not thrust your elbows or hands too far toward the camera! (อย่าเหยียด/ยื่นทิ่มข้อศอกหรือมือมาข้างหน้ากล้องเกินไป!)");
        current_score -= 25;
    }

    const wrist_height_gap = Math.abs(l_w[1] - r_w[1]);
    if (wrist_height_gap < 0.10) {
        localFeedback.push("Pose: Separate your hands into clear high and low levels (แยกระดับมือสูง-ต่ำให้ชัดเจน)");
        current_score = Math.min(current_score - 35, 65);
    }

    if (Math.abs(l_w[1] - r_w[1]) < 0.06) {
        scorerInstance.same_level_frames += 1;
    } else {
        scorerInstance.same_level_frames = 0;
    }
    
    if (scorerInstance.same_level_frames > (2 * scorerInstance.fps)) {
        localFeedback.push("Pose: Hands held at the same level for too long! Separate into high and low positions (ระดับข้อมือเท่ากันนานเกินไป! ต้องแยกมือสูง-ต่ำ ระดับศอก/ระดับเอว)");
        current_score -= 25;
    }

    const is_arm_close = getDist({x: l_e[0], y: l_e[1]}, {x: l_h[0], y: l_h[1]}) < 0.09 || 
                         getDist({x: r_e[0], y: r_e[1]}, {x: r_h[0], y: r_h[1]}) < 0.09;
    if (is_arm_close) {
        localFeedback.push("Pose: Arms are too close to your body! Please spread out your elbows elegantly (แขนชิดแนบลำตัวเกินไป! กรุณากางข้อศอกออกให้สง่างาม)");
        current_score -= 15;
    }

    const mid_sh = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
    const mid_hi = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 };
    const body_angle = getAng({x: nose[0], y: nose[1]}, mid_sh, mid_hi);
    
    const is_body_tilted = body_angle < 162 || body_angle > 198 || Math.abs(l_s[1] - r_s[1]) > 0.07;
    if (is_body_tilted) {
        localFeedback.push("Pose: Torso is swaying or shoulders are tilting too much! Please stand straight (ลำตัวโยกเยกหรือเอียงไหล่มากเกินไป กรุณาตั้งตัวตรง)");
        current_score -= 15;
    }

    const is_head_wrong = Math.abs(nose[1] - mid_ear_y) > 0.05;
    if (is_head_wrong) {
        localFeedback.push("Pose: Head is tilted too far up or down! Keep it straight and slightly lift your chin (ศีรษะก้มหรือเงยมากเกินไป กรุณาหน้าตรงเชิดคางเล็กน้อย)");
        current_score -= 10;
    }

    let up_w, up_e, up_s, dn_w, dn_h;
    if (l_w[1] < r_w[1]) {  
        up_w = l_w; up_e = l_e; up_s = l_s;
        dn_w = r_w; dn_h = r_h;
    } else {
        up_w = r_w; up_e = r_e; up_s = r_s;
        dn_w = l_w; dn_h = l_h;
    }

    const is_upper_arm_aligned = Math.abs(up_w[1] - up_s[1]) < 0.09 && Math.abs(up_e[1] - up_s[1]) < 0.09;
    if (!is_upper_arm_aligned) {
        localFeedback.push("Upper Arm: Align your upper wrist, elbow, and shoulder on the same horizontal plane (จัดระดับ ข้อมือ ข้อศอก และหัวไหล่ฝั่งบนให้อยู่ระนาบเดียวกัน)");
        current_score -= 15;
    }

    const is_lower_hand_at_waist = Math.abs(dn_w[1] - dn_h[1]) < 0.12;
    if (!is_lower_hand_at_waist) {
        localFeedback.push("Lower Hand: The lower hand must pose around your belt or waist level (มือฝั่งล่างต้องจีบอยู่บริเวณระดับหัวเข็มขัด/ชายพก)");
        current_score -= 15;
    }

    return {
        score: Math.max(0, current_score),
        feedbacks: localFeedback
    };
}
