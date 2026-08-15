@echo off
echo Recombining split video files...
copy /b "0812(1) - comp.mp4.part*" "0812(1) - comp.mp4"
copy /b "0812(1).mp4.part*" "0812(1).mp4"
copy /b "0812.mp4.part*" "0812.mp4"
copy /b "0815.mp4.part*" "0815.mp4"
echo Done!
pause
