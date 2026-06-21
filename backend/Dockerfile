FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci && npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
