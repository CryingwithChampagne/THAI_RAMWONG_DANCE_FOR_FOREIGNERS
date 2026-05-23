import cv2
import mediapipe as mp
import numpy as np
import os
import json

mp_hands = mp.solutions.hands

# ===== ฟังก์ชันคำนวณ =====
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

# ===== PATH DATASET (ปรับเป็น UP และ DOWN) =====
base_path = r"C:\Users\akara\OneDrive\เดสก์ท็อป\Prototype_Project\data\Hands_Ramsi"

datasets = {
    "up": os.path.join(base_path, "Up"),     # มือที่อยู่ข้างบน
    "down": os.path.join(base_path, "Down")   # มือที่อยู่ข้างล่าง
}

data = {"up": [], "down": []}

# ===== PROCESS =====
with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands:
    for label, folder in datasets.items():
        if not os.path.exists(folder):
            print(f"❌ ไม่พบโฟลเดอร์: {folder}")
            continue

        print(f"\n🔥 Processing {label} Data...")
        file_list = os.listdir(folder)
        for file in file_list:
            path = os.path.join(folder, file)
            image = cv2.imread(path)
            if image is None: continue

            # ปรับขนาดและเตรียมภาพ
            image = cv2.resize(image, (640, 480))
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)

            if not result.multi_hand_landmarks:
                print(f"⚠️ ข้ามไฟล์ {file}: ตรวจไม่เจอมือ")
                continue

            lm = result.multi_hand_landmarks[0].landmark

            # ดึง Features สำหรับรำซิมารำ (เน้นองศาและความห่างของนิ้ว)
            features = {
                "thumb_index_dist": dist(lm[4], lm[8]),
                "index_middle_dist": dist(lm[8], lm[12]),
                "middle_ring_dist": dist(lm[12], lm[16]),
                "thumb_angle": calculate_angle(lm[2], lm[4], lm[8]), # องศากางนิ้วโป้ง
                "wrist_index_angle": calculate_angle(lm[0], lm[5], lm[8]) # องศาการงอนิ้วชี้
            }
            data[label].append(features)
            print(f"✅ ประมวลผล {file} สำเร็จ")

# ===== สร้าง Model (ใช้ Percentile เพื่อความนิ่งของคะแนน) =====
model = {}
for label in data:
    if len(data[label]) == 0: 
        print(f"⚠️ คำเตือน: ไม่มีข้อมูลสำหรับ Label: {label}")
        continue
        
    model[label] = {}
    for key in data[label][0].keys():
        values = [d[key] for d in data[label]]
        
        # ใช้ Percentile 10 และ 90 เพื่อตัดค่ากระโดด (Outliers) ออก
        model[label][key + "_min"] = float(np.percentile(values, 10))
        model[label][key + "_max"] = float(np.percentile(values, 90))

# ===== SAVE MODEL =====
output_filename = "ramsi_hand_model.json"
with open(output_filename, "w") as f:
    json.dump(model, f, indent=4)

print(f"\n🚀 Ramsi Hand Model (Up/Down) Saved as '{output_filename}'!")