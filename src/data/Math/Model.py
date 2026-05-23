import cv2
import mediapipe as mp
import numpy as np
import os
import json

mp_pose = mp.solutions.pose

# ฟังก์ชันคำนวณองศาระหว่าง 3 จุด
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba == 0 or norm_bc == 0: return 0
    cos_angle = np.dot(ba, bc) / (norm_ba * norm_bc + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0))))

# ฟังก์ชันคำนวณ Arm Ratio (ความตึงของแขน)
def get_arm_ratio(s, e, w):
    dist_se = np.linalg.norm(np.array(s) - np.array(e))
    dist_ew = np.linalg.norm(np.array(e) - np.array(w))
    dist_sw = np.linalg.norm(np.array(s) - np.array(w))
    return float(dist_sw / (dist_se + dist_ew + 1e-6))

folder = r"C:\Users\akara\OneDrive\เดสก์ท็อป\Prototype_Project\data\Pose_Ramsi"

# เตรียมโครงสร้างเก็บข้อมูลองศาสำคัญทั่วร่างกาย
data_storage = {
    "elbow_angle": [],   # องศาข้อศอก (แขนหลัก)
    "arm_ratio": [],     # ความตึงของแขน (แขนหลัก)
    "shoulder_angle": [],# องศาไหล่เทียบกับลำตัว
    "knee_angle": [],    # องศาเข่า (การย่อ)
    "hip_angle": [],     # องศาสะโพก (การเหลี่ยมตัว)
    "ankle_angle": [],   # องศาข้อเท้า (การเปิดส้น/ดกเท้า)
    "neck_tilt": []      # การเอียงคอ
}

with mp_pose.Pose(static_image_mode=True) as pose:
    for file in os.listdir(folder):
        path = os.path.join(folder, file)
        image = cv2.imread(path)
        if image is None: continue

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = pose.process(image_rgb)

        if not result.pose_landmarks: continue

        lm = result.pose_landmarks.landmark

        # --- 1. วิเคราะห์แขนข้างหลัก (ข้างที่ยกสูงกว่า) ---
        sr, er, wr = [lm[12].x, lm[12].y], [lm[14].x, lm[14].y], [lm[16].x, lm[16].y]
        sl, el, wl = [lm[11].x, lm[11].y], [lm[13].x, lm[13].y], [lm[15].x, lm[15].y]
        
        # เช็คข้างหลักจากความสูงของข้อมือ (y น้อยกว่าคือสูงกว่า)
        if wr[1] < wl[1]: # ขวาเป็นข้างหลัก
            m_s, m_e, m_w = sr, er, wr
            m_hip = [lm[24].x, lm[24].y]
        else: # ซ้ายเป็นข้างหลัก
            m_s, m_e, m_w = sl, el, wl
            m_hip = [lm[23].x, lm[23].y]

        data_storage["elbow_angle"].append(calculate_angle(m_s, m_e, m_w))
        data_storage["arm_ratio"].append(get_arm_ratio(m_s, m_e, m_w))
        data_storage["shoulder_angle"].append(calculate_angle(m_e, m_s, m_hip))

        # --- 2. วิเคราะห์ช่วงล่าง (การย่อและองศาเข่า) ---
        # เก็บทั้งสองข้างเพื่อหาค่าเฉลี่ยความลึกของการย่อ
        kr, hr, anr = [lm[26].x, lm[26].y], [lm[24].x, lm[24].y], [lm[28].x, lm[28].y]
        kl, hl, anl = [lm[25].x, lm[25].y], [lm[23].x, lm[23].y], [lm[27].x, lm[27].y]
        
        data_storage["knee_angle"].append(calculate_angle(hr, kr, anr))
        data_storage["hip_angle"].append(calculate_angle(m_s, hr, kr))

        # --- 3. วิเคราะห์เท้า (การประเท้า/ดกเท้า) ---
        # จุดปลายเท้า (Foot Index) 31, 32
        data_storage["ankle_angle"].append(calculate_angle(kr, anr, [lm[32].x, lm[32].y]))

        # --- 4. วิเคราะห์การเอียงคอ ---
        mid_shoulder = [(lm[11].x + lm[12].x)/2, (lm[11].y + lm[12].y)/2]
        nose = [lm[0].x, lm[0].y]
        data_storage["neck_tilt"].append(calculate_angle([lm[12].x, lm[12].y], mid_shoulder, nose))

        print(f"✔ Processed: {file}")

# --- สรุป Model เป็นช่วง Percentile ---
model = {}
for key, values in data_storage.items():
    if values:
        model[key + "_min"] = float(np.percentile(values, 10))
        model[key + "_max"] = float(np.percentile(values, 90))

# บันทึกไฟล์
with open("full_danceramsi_model.json", "w") as f:
    json.dump(model, f, indent=4)

print("\n✨ Full Body Model Saved!")
print(json.dumps(model, indent=4))