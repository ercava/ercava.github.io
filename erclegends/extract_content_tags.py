import os
import sys
import json
import cv2
from ultralytics import YOLO

video_dir = r"c:\Users\User\Documents\GitHub\ercava.github.io\erclegends\videos"
out_json = r"c:\Users\User\Documents\GitHub\ercava.github.io\erclegends\files.json"

print("Loading YOLOv8n vision model...")
model = YOLO('yolov8n.pt')

# Load existing files metadata with utf-8-sig
with open(out_json, "r", encoding="utf-8-sig") as f:
    files_list = json.load(f)

print(f"Total files to scan: {len(files_list)}")

dict_keywords = {
    "reformasi": ["politics", "reformasi 79", "indonesia", "uncut", "history", "orator", "speech", "documentary"],
    "wewe gombel": ["horror", "ghost", "folklore", "mythology", "javanese", "creepy", "dark"],
    "kuyang": ["horror", "ghost", "folklore", "creature", "head", "flying"],
    "banaspati": ["horror", "fire ghost", "folklore", "flame", "spirit"],
    "dracula": ["vampire", "horror", "monster", "fangs", "blood"],
    "monster": ["monster", "creature", "horror", "beast"],
    "franken": ["frankenstein", "monster", "green"],
    "gendruwo": ["genderuwo", "horror", "ghost", "hairy", "tall", "shadow"],
    "slender": ["slenderman", "horror", "suit", "woods", "tall"],
    "sundel bolong": ["ghost", "horror", "folklore", "white dress", "wound"],
    "worlds": ["league of legends", "esports", "music", "riot games", "worlds 2017", "worlds 2025", "anthem", "game"],
    "legends never die": ["music", "league of legends", "against the current", "song", "anthem"],
    "warriors": ["music", "imagine dragons", "league of legends", "instrumental"],
    "bloopers": ["behind the scenes", "comedy", "funny", "outtakes", "fails", "laugh"],
    "abstract moving blue": ["background", "vfx", "motion", "abstract", "loop", "blue"],
    "manuka": ["font", "typography", "assets"],
    "ercstories": ["story", "comic", "illustration", "png"],
    "whatsapp": ["chat", "clip", "phone recording"],
    "diabloo": ["diablo", "game", "demon"],
    "murray": ["murray", "clip"]
}

video_exts = {'.mp4', '.mov', '.webm', '.mkv', '.mts', '.avi'}
image_exts = {'.jpg', '.jpeg', '.png', '.webp'}

for idx, item in enumerate(files_list):
    fname = item["name"]
    fpath = os.path.join(video_dir, fname)
    tags = set()
    
    lower_name = fname.lower()
    for k, words in dict_keywords.items():
        if k in lower_name:
            tags.update(words)
    
    ext = os.path.splitext(fname)[1].lower()
    visual_detected = set()
    
    try:
        if ext in video_exts and os.path.exists(fpath):
            cap = cv2.VideoCapture(fpath)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            
            sample_points = [0.1, 0.4, 0.7] if total_frames > 20 else [0.5]
            for p in sample_points:
                target_frame = int(total_frames * p)
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
                ret, frame = cap.read()
                if ret and frame is not None:
                    small = cv2.resize(frame, (320, 320))
                    preds = model(small, verbose=False, conf=0.3)
                    for r in preds:
                        for c in r.boxes.cls:
                            visual_detected.add(model.names[int(c)])
            cap.release()
            
        elif ext in image_exts and os.path.exists(fpath):
            img = cv2.imread(fpath)
            if img is not None:
                small = cv2.resize(img, (320, 320))
                preds = model(small, verbose=False, conf=0.3)
                for r in preds:
                    for c in r.boxes.cls:
                        visual_detected.add(model.names[int(c)])
    except Exception as e:
        pass
    
    all_tags = sorted(list(tags.union(visual_detected)))
    item["tags"] = all_tags
    item["visualObjects"] = sorted(list(visual_detected))
    
    if (idx + 1) % 20 == 0 or idx == len(files_list) - 1:
        print(f"Processed {idx + 1}/{len(files_list)} files...")

with open(out_json, "w", encoding="utf-8") as f:
    json.dump(files_list, f, ensure_ascii=False, indent=2)

print("Vision extraction & tagging complete!")
