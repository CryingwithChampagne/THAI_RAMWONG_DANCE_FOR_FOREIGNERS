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

# ===== Path Dataset =====
# ปรับ path ให้ชี้ไปยังโฟลเดอร์รูปภาพ "ตั้งวง" ของเพลงดอกไม้ของชาติ
base_path = r"C:\Users\akara\OneDrive\เดสก์ท็อป\Prototype_Project\data\Hands_Dokmai"
folder_curve = os.path.join(base_path, "Curve")

data_curve = []

# ===== PROCESS =====
with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands:
    if not os.path.exists(folder_curve):
        print(f"❌ ไม่พบโฟลเดอร์: {folder_curve}")
    else:
        print(f"🔥 เริ่มสกัดฟีเจอร์ท่า Curve จาก: {folder_curve}")
        for file in os.listdir(folder_curve):
            path = os.path.join(folder_curve, file)
            image = cv2.imread(path)
            if image is None: continue

            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)

            if result.multi_hand_landmarks:
                lm = result.multi_hand_landmarks[0].landmark
                
                # 📏 Normalization: ใช้ระยะห่างจากข้อมือ (0) ถึงโคนนิ้วกลาง (9) เป็นตัวหาร
                # เพื่อให้ค่าระยะห่างนิ้วเป็น "สัดส่วน" ไม่เปลี่ยนตามความใกล้-ไกลของมือ
                palm_size = dist(lm[0], lm[9])
                if palm_size == 0: continue 

                # สกัด Features (เน้นความชิดของ 4 นิ้ว และองศานิ้วโป้ง)
                features = {
                    "index_middle": dist(lm[8], lm[12]) / palm_size,
                    "middle_ring": dist(lm[12], lm[16]) / palm_size,
                    "ring_pinky": dist(lm[16], lm[20]) / palm_size,
                    "thumb_angle": calculate_angle(lm[2], lm[4], lm[8]),
                    "wrist_tilt": calculate_angle(lm[0], lm[5], lm[17]) # มุมฝ่ามือ
                }
                data_curve.append(features)

# ===== สร้าง Model (ใช้ Percentile 15-85 ตามสูตรสำเร็จของคุณ) =====
if len(data_curve) > 0:
    hand_model = {"curve": {}}
    
    for key in data_curve[0].keys():
        values = [d[key] for d in data_curve]
        # บีบช่วงให้คมเพื่อตัด Noise จากภาพที่มืออาจจะเบลอ
        hand_model["curve"][key + "_min"] = float(np.percentile(values, 15))
        hand_model["curve"][key + "_max"] = float(np.percentile(values, 85))

    # ===== Save =====
    with open("hand_dokmai_model.json", "w") as f:
        json.dump(hand_model, f, indent=4)
    print(f"\n✅ เทรนท่า Curve เสร็จสิ้น! เก็บข้อมูลจาก {len(data_curve)} ภาพ")
    print("📂 บันทึกไฟล์ที่: hand_dokmai_model.json")
else:
    print("⚠️ ไม่สามารถสกัดข้อมูลจากภาพได้เพียงพอ กรุณาตรวจสอบชุดข้อมูล")