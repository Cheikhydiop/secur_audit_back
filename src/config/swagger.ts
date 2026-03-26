import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Questionnaire de Contrôle des Sites SONATEL API',
            version: '1.0.0',
            description: 'API documentation for the Questionnaire de Contrôle des Sites de SONATEL - Digitalisation du contrôle des sites',
            contact: {
                name: 'SONATEL Team',
                email: 'support@sonatel.sn',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development Server',
            },
            {
                url: 'https://jealous-giraffe-ndigueul-efe7a113.koyeb.app',
                description: 'Production Server (Koyeb)',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'INSPECTEUR', 'DIRIGEANT'] },
                        isActive: { type: 'boolean' },
                        isEmailVerified: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Site: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        nom: { type: 'string' },
                        code: { type: 'string' },
                        type: { type: 'string' },
                        zone: { type: 'string' },
                        localisation: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Question: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        texte: { type: 'string' },
                        rubrique: { type: 'string' },
                        ponderation: { type: 'integer' },
                        actif: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Inspection: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        siteId: { type: 'string', format: 'uuid' },
                        inspecteurId: { type: 'string', format: 'uuid' },
                        date: { type: 'string', format: 'date-time' },
                        statut: { type: 'string', enum: ['EN_COURS', 'VALIDEE', 'REJETEE'] },
                        score: { type: 'number' },
                        reponses: { type: 'object' },
                        latitude: { type: 'number' },
                        longitude: { type: 'number' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ActionPlan: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        inspectionId: { type: 'string', format: 'uuid' },
                        description: { type: 'string' },
                        responsableId: { type: 'string', format: 'uuid' },
                        dateEcheance: { type: 'string', format: 'date-time' },
                        statut: { type: 'string', enum: ['A_FAIRE', 'EN_COURS', 'TERMINE', 'EN_RETARD'] },
                        criticite: { type: 'string', enum: ['FAIBLE', 'MOYENNE', 'ELEVEE'] },
                        notes: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/dto/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
