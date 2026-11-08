@echo off
rem Double-clic : choisir un module d'exemple et l'ouvrir dans le navigateur.
rem Pour arreter : fermer cette fenetre noire.
chcp 65001 >nul
title Learning Suite - apercu du lecteur
cd /d "%~dp0player"
if not exist node_modules (
  echo Premiere utilisation : installation des outils...
  call npm.cmd install
)
echo.
echo Quel exemple ouvrir ?
echo   1. Decouvrir Learning Suite (diapositives, voix off, quiz)
echo   2. Les bons reflexes numeriques (toutes les activites, diapositives)
echo   3. Les bons reflexes numeriques (version telephone)
echo   4. Jeu HTML avec score
echo   5. Demo du mode vertical
echo.
set /p choix="Votre choix (1 a 5, Entree = 1) : "
set dossier=presentation-suite
if "%choix%"=="2" set dossier=activites
if "%choix%"=="3" set dossier=activites-mobile
if "%choix%"=="4" set dossier=jeu-html
if "%choix%"=="5" set dossier=vertical-demo
call npm.cmd run open -- ../examples/%dossier%
pause
