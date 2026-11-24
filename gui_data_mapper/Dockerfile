FROM node:22-bookworm-slim

WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar asegurando las dependencias nativas
RUN npm install

# Copiar el resto del código fuente
COPY . .

EXPOSE 4321

# Comando para iniciar Astro en desarrollo
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]