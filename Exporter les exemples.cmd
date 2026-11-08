@echo off
rem Double-clic : exporte les modules d'exemple en SCORM 1.2 et HTML5,
rem puis ouvre le dossier « exports ».
chcp 65001 >nul
title Learning Suite - export des exemples
cd /d "%~dp0player"
if not exist node_modules (
  echo Premiere utilisation : installation des outils...
  call npm.cmd install
)
call npm.cmd run export -- ../examples/presentation-suite || goto erreur
call npm.cmd run export -- ../examples/jeu-html || goto erreur
call npm.cmd run export -- ../examples/vertical-demo || goto erreur
call npm.cmd run export -- ../examples/activites || goto erreur
call npm.cmd run export -- ../examples/activites-mobile || goto erreur
echo.
echo Termine. Les fichiers .zip sont dans le dossier « exports ».
start "" "%~dp0exports"
pause
exit /b 0

:erreur
echo.
echo L'export a echoue : lisez le message ci-dessus.
pause
exit /b 1
