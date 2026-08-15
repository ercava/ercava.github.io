#!/bin/bash
echo "Recombining split video files..."
cat "0812(1) - comp.mp4.part"* > "0812(1) - comp.mp4"
cat "0812(1).mp4.part"* > "0812(1).mp4"
cat "0812.mp4.part"* > "0812.mp4"
cat "0815.mp4.part"* > "0815.mp4"
echo "Done!"
