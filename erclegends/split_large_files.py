import os
import json
import math

video_dir = r"c:\Users\User\Documents\GitHub\ercava.github.io\erclegends\videos"
json_path = r"c:\Users\User\Documents\GitHub\ercava.github.io\erclegends\files.json"

CHUNK_SIZE = 45 * 1024 * 1024 # 45MB chunks to safely stay under GitHub 100MB limit

with open(json_path, "r", encoding="utf-8") as f:
    files_list = json.load(f)

for item in files_list:
    fname = item["name"]
    fpath = os.path.join(video_dir, fname)
    if not os.path.exists(fpath):
        continue
        
    size = os.path.getsize(fpath)
    if size > 90 * 1024 * 1024:
        num_chunks = math.ceil(size / CHUNK_SIZE)
        print(f"Splitting {fname} ({size / 1024 / 1024:.1f} MB) into {num_chunks} chunks...")
        
        chunks = []
        with open(fpath, "rb") as src:
            for part_idx in range(num_chunks):
                chunk_fname = f"{fname}.part{part_idx:03d}"
                chunk_path = os.path.join(video_dir, chunk_fname)
                chunk_data = src.read(CHUNK_SIZE)
                with open(chunk_path, "wb") as cfile:
                    cfile.write(chunk_data)
                chunks.append(chunk_fname)
                
        item["isSplit"] = True
        item["chunks"] = chunks
        
        # Remove original oversized file
        os.remove(fpath)
        print(f"Removed original {fname}")

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(files_list, f, ensure_ascii=False, indent=2)

print("Splitting complete and files.json updated!")
