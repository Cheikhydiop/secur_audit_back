/**
 * Script de seed initial — SmartAudit DG-SECU/Sonatel
 * Crée le Super-Admin et les questions initiales (73 points)
 */
import prisma from '../config/prismaClient.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@sonatel.sn';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    logger.info(`✅ Super-Admin déjà existant: ${email}`);
    return;
  }

  const password = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456!', 12);
  await (prisma as any).user.create({
    data: {
      email,
      name: 'Super Administrateur',
      password,
      role: 'SUPER_ADMIN',
      mustChangePassword: true,
      isActive: true,
      isEmailVerified: true,
      invitationStatus: 'ACCEPTED',
    }
  });
  logger.info(`✅ Super-Admin créé: ${email}`);
}

async function seedQuestions() {
  const count = await prisma.question.count();
  if (count > 0) {
    logger.info(`✅ Questions déjà présentes (${count})`);
    return;
  }

  const questions = [
    // Rubrique 1 : Disponibilité des Documents de Sécurité (14 points)
    { texte: 'Registre de sécurité de l\'établissement disponible', rubrique: 'DOCUMENTS_SECURITE', ponderation: 2 },
    { texte: 'Flux entrées/sorties notés sur le registre', rubrique: 'DOCUMENTS_SECURITE', ponderation: 2 },
    { texte: 'Respect du délai de remplacement de 6 mois (exigence CDP)', rubrique: 'DOCUMENTS_SECURITE', ponderation: 3 },
    { texte: 'Unicité du registre pour le suivi des flux', rubrique: 'DOCUMENTS_SECURITE', ponderation: 1 },
    { texte: 'Notes de service DG/SECU disponibles au poste', rubrique: 'DOCUMENTS_SECURITE', ponderation: 2 },
    { texte: 'Autorisations d\'accès et bons de sortie tracés et archivés', rubrique: 'DOCUMENTS_SECURITE', ponderation: 3 },
    { texte: 'Références des codes d\'accès tracées dans le registre', rubrique: 'DOCUMENTS_SECURITE', ponderation: 2 },
    { texte: 'Manuel de l\'agent de sécurité disponible', rubrique: 'DOCUMENTS_SECURITE', ponderation: 1 },
    { texte: 'Imprégnation des agents sur le manuel et les procédures Sonatel', rubrique: 'DOCUMENTS_SECURITE', ponderation: 3 },
    { texte: 'Formation initiale et continue (Incendie/Secourisme)', rubrique: 'DOCUMENTS_SECURITE', ponderation: 3 },
    { texte: 'Fréquence et date de la dernière mise à niveau', rubrique: 'DOCUMENTS_SECURITE', ponderation: 2 },
    { texte: 'Ancienneté des agents sur le site Sonatel', rubrique: 'DOCUMENTS_SECURITE', ponderation: 1 },
    // Rubrique 2 : Application des Consignes de Sécurité (16 points)
    { texte: 'Contrôle effectif du personnel, fournisseurs et visiteurs', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Surveillance des installations techniques et températures', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Accueil, orientation et distribution de badges', rubrique: 'CONSIGNES_SECURITE', ponderation: 2 },
    { texte: 'Gestion des clés conforme à la procédure', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Tenue et propreté des mains courantes', rubrique: 'CONSIGNES_SECURITE', ponderation: 2 },
    { texte: 'Assistance en matière de sécurité des personnes', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Effectivité et fréquence des rondes (jour/nuit)', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Vérification du fonctionnement des appareils de sûreté (SDI, Vidéo, Accès)', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Consignation et remontée des écarts à DG/SECU', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Surveillance H24 du parking (si existant)', rubrique: 'CONSIGNES_SECURITE', ponderation: 2 },
    { texte: 'Vérification systématique des autorisations fournisseurs', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Contrôle systématique des EPI et affichage des consignes liées', rubrique: 'CONSIGNES_SECURITE', ponderation: 2 },
    { texte: 'Respect des contrôles spécifiques (sacs, badges, véhicules)', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Vérification des bons de sortie matériels (validité signature)', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    { texte: 'Participation aux évacuations en coordination avec DG/SECU', rubrique: 'CONSIGNES_SECURITE', ponderation: 3 },
    // Rubrique 3 : Sécurité Incendie (11 points)
    { texte: 'Présence d\'un système de détection incendie (SDI)', rubrique: 'SECURITE_INCENDIE', ponderation: 5 },
    { texte: 'SDI opérationnel et mode opératoire affiché', rubrique: 'SECURITE_INCENDIE', ponderation: 5 },
    { texte: 'Report d\'alarme au poste de garde', rubrique: 'SECURITE_INCENDIE', ponderation: 5 },
    { texte: 'Système d\'extinction automatique (DEA) en salle technique', rubrique: 'SECURITE_INCENDIE', ponderation: 5 },
    { texte: 'Présence, visibilité et indication des extincteurs', rubrique: 'SECURITE_INCENDIE', ponderation: 3 },
    { texte: 'Protection des extincteurs extérieurs (housses)', rubrique: 'SECURITE_INCENDIE', ponderation: 2 },
    { texte: 'Couverture de tous les endroits à risques', rubrique: 'SECURITE_INCENDIE', ponderation: 3 },
    { texte: 'Maintenance régulière des équipements incendie', rubrique: 'SECURITE_INCENDIE', ponderation: 3 },
    { texte: 'Signalétique et pictogrammes adaptés', rubrique: 'SECURITE_INCENDIE', ponderation: 2 },
    { texte: 'Point de rassemblement visible et conforme', rubrique: 'SECURITE_INCENDIE', ponderation: 3 },
    // Rubrique 4 : Vidéosurveillance (6 points)
    { texte: 'Système de vidéosurveillance en marche', rubrique: 'VIDEOSURVEILLANCE', ponderation: 5 },
    { texte: 'Affichage de toutes les caméras sur l\'écran du poste de garde', rubrique: 'VIDEOSURVEILLANCE', ponderation: 3 },
    { texte: 'Couverture des zones stratégiques', rubrique: 'VIDEOSURVEILLANCE', ponderation: 3 },
    { texte: 'Alimentation secourue (onduleur)', rubrique: 'VIDEOSURVEILLANCE', ponderation: 3 },
    { texte: 'Effectivité de l\'enregistrement', rubrique: 'VIDEOSURVEILLANCE', ponderation: 3 },
    { texte: 'Local de stockage sécurisé et pictogrammes règlementaires', rubrique: 'VIDEOSURVEILLANCE', ponderation: 2 },
    // Rubrique 5 : Contrôle d'Accès (9 points)
    { texte: 'Système de contrôle d\'accès fonctionnel', rubrique: 'CONTROLE_ACCES', ponderation: 5 },
    { texte: 'Portes non calées et dispositifs BBG désactivés', rubrique: 'CONTROLE_ACCES', ponderation: 3 },
    { texte: 'Clés des salles techniques consignées', rubrique: 'CONTROLE_ACCES', ponderation: 3 },
    { texte: 'Couverture de toutes les zones à risques', rubrique: 'CONTROLE_ACCES', ponderation: 3 },
    { texte: 'Sécurisation spécifique de l\'espace caisse (Accès + Badges)', rubrique: 'CONTROLE_ACCES', ponderation: 3 },
    { texte: 'Détention de badges actifs par tout le personnel', rubrique: 'CONTROLE_ACCES', ponderation: 2 },
    // Rubrique 6 : Entretien du Poste de Garde (7 points)
    { texte: 'Tenue et propreté du poste et des environs', rubrique: 'POSTE_GARDE', ponderation: 2 },
    { texte: 'Absence d\'affiches/articles non règlementaires', rubrique: 'POSTE_GARDE', ponderation: 1 },
    { texte: 'Fonctionnalité des lignes fixes et mobiles', rubrique: 'POSTE_GARDE', ponderation: 2 },
    { texte: 'Enregistrement au groupe WhatsApp DG/SECU', rubrique: 'POSTE_GARDE', ponderation: 1 },
    { texte: 'Absence d\'applications prohibées (TikTok, Facebook, etc.)', rubrique: 'POSTE_GARDE', ponderation: 2 },
    { texte: 'Présence de ventilateur fonctionnel', rubrique: 'POSTE_GARDE', ponderation: 1 },
    { texte: 'Armoire à clés rangée et étiquetée', rubrique: 'POSTE_GARDE', ponderation: 2 },
    // Rubrique 7 : Conformité de l'Agent de Sécurité (3 points)
    { texte: 'Port de l\'uniforme complet et en bon état', rubrique: 'CONFORMITE_AGENT', ponderation: 2 },
    { texte: 'Port du badge d\'identité visible', rubrique: 'CONFORMITE_AGENT', ponderation: 2 },
    { texte: 'Respect de l\'interdiction de signes distinctifs', rubrique: 'CONFORMITE_AGENT', ponderation: 1 },
    // Rubrique 8 : Infrastructure et Risques Externes (7 points)
    { texte: 'État et hauteur de la clôture', rubrique: 'INFRASTRUCTURE', ponderation: 3 },
    { texte: 'Éclairage extérieur adéquat', rubrique: 'INFRASTRUCTURE', ponderation: 2 },
    { texte: 'Voies d\'accès dégagées (Ambulance/Pompiers)', rubrique: 'INFRASTRUCTURE', ponderation: 3 },
    { texte: 'Programme de renforcement de sécurité couvrant les vulnérabilités', rubrique: 'INFRASTRUCTURE', ponderation: 3 },
    { texte: 'Désherbage effectif', rubrique: 'INFRASTRUCTURE', ponderation: 1 },
    { texte: 'Absence de nuisibles (reptiles, rongeurs)', rubrique: 'INFRASTRUCTURE', ponderation: 2 },
    { texte: 'Traitement phytosanitaire entrepris', rubrique: 'INFRASTRUCTURE', ponderation: 1 },
  ];

  await prisma.question.createMany({ data: questions });
  logger.info(`✅ ${questions.length} questions créées (73 points de contrôle)`);
}

async function main() {
  logger.info('🚀 Démarrage du seed SmartAudit DG-SECU/Sonatel...');
  await seedSuperAdmin();
  await seedQuestions();
  logger.info('✅ Seed terminé');
  await prisma.$disconnect();
}

main().catch((e) => {
  logger.error('❌ Erreur seed:', e);
  process.exit(1);
});
