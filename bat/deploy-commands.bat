@echo off
cd /d %~dp0..
node ./control/delete-commands.js
node ./control/deploy-commands.js