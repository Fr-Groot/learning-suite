@echo off
rem Double-clic : ouvre le module d'exemple dans le navigateur.
rem Pour arreter : fermer cette fenetre noire.
chcp 65001 >nul
title Learning Suite - apercu du lecteur
cd /d "%~dp0player"
if not exist node_modules (
  echo Premiere utilisation : installation des outils...
  call npm.cmd install
)
call npm.cmd run open
pause
