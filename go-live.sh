#!/bin/bash

# Script de mise en production (Go-Live) — SmartAudit DG-SECU/Sonatel
# Auteur: Antigravity AI

echo "🚀 Démarrage du processus de Go-Live..."

# 1. Backend (API)
echo "📦 Préparation du Backend..."
# On est déjà dans le dossier backend ou on y entre
cd "$(dirname "$0")"
npm install
npm run generate
npm run build
# npm run migrate:prod # Optionnel: décommenter si la DB doit être migrée
echo "✅ Backend prêt."

# 2. Frontend (React/Vite)
echo "📦 Préparation du Frontend..."
cd ../digit-questionnaire-frontend
npm install
npm run build
echo "✅ Frontend prêt (dist/ généré)."

# 3. Lancement des services (Simulation via background processes)
# Note: Dans un environnement réel, utilisez PM2 ou Docker.
echo "🏃 Lancement des services en arrière-plan..."

# Tuer les anciennes instances si elles existent
pkill -f "node dist/index.js" || true
pkill -f "vite preview" || true
pkill -f "node_modules/.bin/vite preview" || true
echo "✅ Anciennes instances arrêtées."
cd ../digit-questionnaire-backend
NODE_ENV=production nohup npm run start > backend.log 2>&1 &
echo "📡 Backend lancé sur le port 3000."

# Lancer le frontend (Vite Preview sur 8080 pour simuler le service statique)
cd ../digit-questionnaire-frontend
nohup npx vite preview --port 8080 --host > frontend.log 2>&1 &
echo "🌐 Frontend lancé sur le port 8080."

echo "✨ GO-LIVE RÉUSSI ! ✨"
echo "--------------------------------------------------"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:8080"
echo "--------------------------------------------------"
echo "Consultez backend.log et frontend.log pour les logs."
