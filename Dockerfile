FROM node:18-alpine

# Créer un utilisateur non root
RUN addgroup app && adduser -S -G app app

WORKDIR /app

# Copier les fichiers nécessaires pour npm install
COPY package*.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY prisma ./prisma  

# Installer les dépendances
RUN npm install

# Copier le reste du projet
COPY . .

RUN chown -R node:node /app/node_modules /app/prisma

# Utiliser l’utilisateur node
USER node

# Exposer le port de l'application
EXPOSE 4000

# Utiliser l'utilisateur non root
USER app

# Commande par défaut
CMD ["npm", "run", "dev"]
