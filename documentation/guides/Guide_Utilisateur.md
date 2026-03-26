# Guide Utilisateur — SmartAudit DG-SECU/Sonatel (SONATEL)

Bienvenue dans le guide de l'utilisateur de l'application **SmartAudit DG-SECU/Sonatel**. Cette plateforme permet de digitaliser les questionnaires de contrôle des sites Sonatel.

---

## 🔐 1. Connexion
- Rendez-vous sur l'URL de l'application.
- Saisissez vos identifiants (Email et mot de passe fournis par votre administrateur).
- **Rôle Inspecteur** : Accès à vos missions planifiées et au tableau de bord de vos activités.

---

## 📊 2. Tableau de Bord (Dashboard)
Le tableau de bord vous offre une vue d'ensemble :
- **KPIs globaux** : Taux de conformité, nombre de sites à risque.
- **État des inspections** : Graphiques illustrant les inspections terminées, en cours ou en retard.
- **Répartition par zone** : Performance des sites par région.

---

## 📅 3. Planning et Missions
- **Mon Planning** : Liste des audits qui vous sont assignés pour le mois.
- **Filtrage** : Recherchez des missions par date, site ou statut (A faire, En retard).
- **Consignes** : Cliquez sur une mission pour voir les détails (site, adresse, point GPS prévu).

---

## 📝 4. Réaliser une Inspection
Pour démarrer un audit :
1. Sélectionnez une mission sur votre planning.
2. Cliquez sur **"Démarrer l'audit"**. *Note: Votre position GPS est enregistrée au démarrage.*
3. Répondez aux questions par rubrique (Documents, Sécurite, Incendie, etc.).
    - ✅ **Conforme** : Aucun défaut constaté.
    - ❌ **Non-Conforme** : Nécessite une photo et une observation détaillée.
    - ➖ **Non-Applicable** : Si le point ne s'applique pas au site.
4. **Photos** : Prenez des clichés clairs pour illustrer les anomalies.
5. **Finaliser** : Une fois toutes les réponses saisies, signez et cliquez sur **"Soumettre l'audit"**.

---

## 🌐 5. Mode Hors-Ligne (PWA)
L'application est conçue pour fonctionner dans les zones blanches (sans réseau) :
- **Enregistrement local** : Si la connexion est perdue, vos réponses sont stockées sur votre appareil (IndexedDB).
- **Indicateur de statut** : Un bandeau "HORS LIGNE" s'affiche en haut de l'écran.
- **Synchronisation automatique** : Dès que vous retrouvez du réseau, cliquez sur le bouton de synchronisation (ou laissez l'application le faire automatiquement) pour envoyer les données au serveur.

---

## ✅ 6. Plans d'Actions
Si des non-conformités sont détectées :
- Un **plan d'action** est généré automatiquement.
- Vous (ou le responsable désigné) recevrez une notification.
- L'action reste ouverte jusqu'à ce qu'une preuve de correction soit fournie.

---

## 📥 7. Rapports PDF
- Après chaque audit, un rapport professionnel au format PDF est généré.
- Il peut être téléchargé par l'inspecteur ou les administrateurs depuis la page de détails de l'audit.

---

**Besoin d'aide ?** 
Contactez l'administrateur système de la direction DG/SECU.
