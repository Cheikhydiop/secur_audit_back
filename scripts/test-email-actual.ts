import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Container } from 'typedi';
import { EmailService } from '../src/services/EmailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// FORCER LE MODE PRODUCTION POUR LE TEST RÉEL
process.env.NODE_ENV = 'production';

async function testEmail() {
    console.log('🚀 Démarrage du test d\'envoi d\'email réel...');
    console.log(`📧 Utilisateur: ${process.env.SMTP_USER}`);
    console.log(`📧 Host: ${process.env.SMTP_HOST}`);

    const emailService = Container.get(EmailService);

    // Attendre un peu que le testConnection du constructeur se fasse (même si c'est async non attendu)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const success = await emailService.sendVerificationCode(
        'fkwade026@gmail.com',
        '123456'
    );

    if (success) {
        console.log('✅ TEST RÉUSSI : L\'email a été envoyé avec succès via SMTP !');
    } else {
        console.log('❌ TEST ÉCHOUÉ : L\'envoi a échoué. Vérifiez les logs ci-dessus.');
    }
}

testEmail().catch(err => {
    console.error('💥 Erreur critique pendant le test:', err);
});
