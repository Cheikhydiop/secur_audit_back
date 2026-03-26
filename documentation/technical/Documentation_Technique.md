# Documentation Technique — SmartAudit DG-SECU/Sonatel (SONATEL)

Cette documentation détaille l'architecture et les composants clés de la solution **SmartAudit DG-SECU/Sonatel**.

---

## 🏛️ 1. Architecture Globale
Architecture **Full-stack Monorepo / Split** :
- **Backend** : Node.js, Express, TypeScript, TypeDI (Injection de dépendances).
- **Frontend** : Vite, React, TypeScript, Tailwind CSS, Shadcn UI.
- **Base de Données** : PostgreSQL (Neon) avec Prisma ORM.
- **WebSocket** : Socket.io pour les notifications temps réel.

---

## 💾 2. Stockage et Offline (PWA)
Le mode hors-ligne est l'une des fonctionnalités critiques :
- **IndexedDB** : Utilisation pour stocker les inspections complètes et le cache des sites sur le navigateur via l'objet `smartinspect_db` et `smartinspect_sites_db`.
- **OfflineQueueService** : Gère la mise en file d'attente asynchrone des inspections.
- **OfflineSyncService** : Synchronise les données au retour du réseau via des transactions sécurisées.
- **Service Worker** : Géré par `vite-plugin-pwa` pour la mise en cache des assets statiques.

---

## 🚀 3. Déploiement et Production
- **Build Backend** : `npm run build` (génère `/dist`).
- **Build Frontend** : `npm run build` (génère `/dist`).
- **Go-Live** : Le script `go-live.sh` à la racine automatise l'installation, le build et le lancement en tant que processus démon via `nohup` (recommandé : utiliser **PM2** en environnement de production réel).

---

## 🔐 4. Sécurité et Authentification
- **JWT Auth** : Tokens d'accès (1h) et de rafraîchissement (7j) pour la session.
- **TypeDI Injection** : Tous les services (Auth, Notification, Site, Inspection) sont injectés pour une meilleure testabilité et modularité.
- **Middlewares** : 
    - `authMiddleware` : Vérification du token.
    - `auditMiddleware` : Traçage des actions utilisateur dans `AuditLog`.
    - `roleMiddleware` : Contrôle d'accès basé sur le rôle (RBAC).

---

## 📧 5. Services Externes
- **Cloudinary** : Stockage des photos d'inspections et preuves d'actions.
- **SMTP (Gmail)** : Envoi des emails de notifications et plans d'actions.
- **Leaflet** : Cartographie pour le suivi GPS des inspecteurs.

---

## 📈 6. Maintenance
- **Prisma Studio** : Accessible via `npx prisma studio` pour une gestion visuelle de la base.
- **Logs** : Consultables dans `digit-questionnaire-backend/backend.log`.
- **Migrations** : Utilisez `npm run migrate:prod` sur le serveur après modification du schéma Prisma.

---

**Développé par Antigravity AI**
SmartAudit DG-SECU/Sonatel - Version 1.0.0
