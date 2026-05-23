import cv2
import mediapipe as mp
import numpy as np
import os
import json

mp_hands = mp.solutions.hands

# ===== ฟังก์ชัน =====
def dist(a, b):
    return np.linalg.norm([a.x - b.x, a.y - b.y])

def calculate_angle(a, b, c):
    a = np.array([a.x, a.y])
    b = np.array([b.x, b.y])
    c = np.array([c.x, c.y])
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba == 0 or norm_bc == 0: return 0
    cos_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
    return np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))

# ===== path dataset (ใช้ r เพื่อแก้ปัญหา unicode error) =====
base_path = r"C:/Users/akara/OneDrive/เดสก์ท็อป/Prototype_Project/data/Hands_Dokmai"

datasets = {
    "pinch": os.path.join(base_path, "Pitch"), # ตรวจสอบชื่อโฟลเดอร์ให้ตรง Pitch หรือ Pinch
    "curve": os.path.join(base_path, "Curve")
}

data = {"pinch": [], "curve": []}

# ===== PROCESS =====
with mp_hands.Hands(static_image_mode=True, max_num_hands=1) as hands:
    for label, folder in datasets.items():
        if not os.path.exists(folder):
            print(f"❌ ไม่พบโฟลเดอร์: {folder}")
            continue

        print(f"\n🔥 Processing {label}...")
        for file in os.listdir(folder):
            path = os.path.join(folder, file)
            image = cv2.imread(path)
            if image is None: continue

            image = cv2.resize(image, (300, 300))
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)

            if not result.multi_hand_landmarks:
                continue

            lm = result.multi_hand_landmarks[0].landmark

            # ดึง Features
            features = {
                "thumb_index": dist(lm[4], lm[8]),
                "index_middle": dist(lm[8], lm[12]),
                "middle_ring": dist(lm[12], lm[16]),
                "ring_pinky": dist(lm[16], lm[20]),
                "thumb_angle": calculate_angle(lm[2], lm[4], lm[8])
            }
            data[label].append(features)

# ===== สร้าง model (ใช้ Percentile แทน Min/Max) =====
model = {}
for label in data:
    if len(data[label]) == 0: continue
    model[label] = {}

    for key in data[label][0].keys():
        values = [d[key] for d in data[label]]
        
        # 🔥 เปลี่ยนจาก min/max เป็น percentile เพื่อบีบช่วงให้คมขึ้น
        # 15 และ 85 คือค่าที่กำลังดีสำหรับการตัด Noise ออก
        model[label][key + "_min"] = float(np.percentile(values, 15))
        model[label][key + "_max"] = float(np.percentile(values, 85))

# ===== save =====
with open("hand_model.json", "w") as f:
    json.dump(model, f, indent=4)

print("\n🔥 Optimized Hand Model Saved!")