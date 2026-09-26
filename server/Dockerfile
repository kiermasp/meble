FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
