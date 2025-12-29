@echo off
echo 🚀 Iniciando o Sistema Coins...

:: Abre uma nova janela para o Backend
start cmd /k "cd backend && npm start"

:: Abre uma nova janela para o Frontend
start cmd /k "cd frontend && npm run dev"

echo O sistema esta rodando em duas janelas separadas.
echo Pode minimizar esta janela aqui.