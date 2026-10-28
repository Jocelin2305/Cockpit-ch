@echo off
rem Double-cliquez sur ce fichier pour lancer Cockpit'ch sur ce PC.
rem Gardez cette fenetre ouverte pendant que vous utilisez l'application ; fermez-la pour l'arreter.
cd /d "%~dp0"
title Cockpit'ch
echo Demarrage de Cockpit'ch...
echo L'application va s'ouvrir dans votre navigateur : http://localhost:3000
echo Pour l'arreter : fermez cette fenetre.
echo.
rem Base de données locale de test (tant que Supabase n'est pas branché).
start "Base locale Cockpit" /min cmd /c npx.cmd prisma dev -n cockpitch
timeout /t 10 /nobreak >nul
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm.cmd run dev
pause
