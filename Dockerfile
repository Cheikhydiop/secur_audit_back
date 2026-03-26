# ----- ÉTAPE 1 : BUILD -----
FROM node:20-alpine AS builder

# Installation des dépendances système nécessaires
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du code source
COPY . .

# Génération du client Prisma
RUN npx prisma generate

# Compilation TypeScript vers dist/
RUN npm run build

# ----- ÉTAPE 2 : RUNTIME -----
FROM node:20-alpine

# Créer un utilisateur non root
RUN addgroup app && adduser -S -G app app

WORKDIR /app

# Installer openssl car Prisma en a besoin sous Alpine
RUN apk add --no-cache openssl

# Copier uniquement package.json pour les deps de prod
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

# Copier le client Prisma généré et les fichiers compilés
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Droits d'accès pour l'utilisateur non root
RUN chown -R app:app /app

# Exposer le port par défaut (à adapter en fct de votre env)
EXPOSE 3000

# Utiliser l'utilisateur non root
USER app

# Commande par défaut (lancée via node dist/index.js)
CMD ["node", "dist/index.js"]
