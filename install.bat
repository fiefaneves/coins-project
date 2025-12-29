@echo off
echo ==========================================
echo 📦 Instalando dependencias do BACKEND...
echo ==========================================
cd backend
call npm install
cd ..

echo ==========================================
echo 📦 Instalando dependencias do FRONTEND...
echo ==========================================
cd frontend
call npm install
cd ..

echo ==========================================
echo ✅ Instalação Concluida!
echo ==========================================
pause