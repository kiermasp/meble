FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/magazyn/package.json packages/magazyn/package.json
COPY packages/schema/package.json packages/schema/package.json
RUN npm ci

COPY . .
RUN find . -name '*.tsbuildinfo' -delete && npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "packages/api/dist/main.js"]
