import os
import cv2
from PIL import Image

video_dir = r"c:\Users\User\Documents\GitHub\ercava.github.io\erclegends\videos"
thumb_dir = r"c:\Users\User\Documents\GitHub\ercava.github.io\erclegends\thumbs"
os.makedirs(thumb_dir, exist_ok=True)

video_exts = {'.mp4', '.mov', '.webm', '.mkv', '.mts', '.avi'}
image_exts = {'.jpg', '.jpeg', '.png', '.webp'}

files = os.listdir(video_dir)
print(f"Generating lightweight WebP thumbnails for {len(files)} files...")

count = 0
for idx, fname in enumerate(files):
    fpath = os.path.join(video_dir, fname)
    if not os.path.isfile(fpath): continue
    
    thumb_name = f"{os.path.splitext(fname)[0]}.webp"
    thumb_path = os.path.join(thumb_dir, thumb_name)
    
    # Avoid re-generating if exists and valid
    if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 500:
        continue
        
    ext = os.path.splitext(fname)[1].lower()
    
    try:
        if ext in video_exts:
            cap = cv2.VideoCapture(fpath)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            target_frame = int(total_frames * 0.15) if total_frames > 10 else 0
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()
            if not ret or frame is None:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
            cap.release()
            
            if ret and frame is not None:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(rgb)
                img.thumbnail((360, 202), Image.Resampling.LANCZOS)
                img.save(thumb_path, "WEBP", quality=75)
                count += 1
                
        elif ext in image_exts:
            img = Image.open(fpath).convert('RGB')
            img.thumbnail((360, 202), Image.Resampling.LANCZOS)
            img.save(thumb_path, "WEBP", quality=75)
            count += 1
    except Exception as e:
        pass
        
    if (idx + 1) % 25 == 0:
        print(f"Done {idx + 1}/{len(files)} thumbnails...")

print(f"Completed! Generated {count} new lightweight WebP thumbnails in erclegends/thumbs")
