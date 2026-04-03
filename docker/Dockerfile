FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm install --registry https://registry.npmmirror.com || npm install

COPY . .

EXPOSE 3001
EXPOSE 5173
