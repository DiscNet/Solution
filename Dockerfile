FROM node:22.22.2-bookworm-slim

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ffmpeg \
      ca-certificates \
      qrencode \
      zbar-tools \
      tesseract-ocr \
      tesseract-ocr-eng \
      tesseract-ocr-por \
      poppler-utils \
      ghostscript \
      img2pdf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

CMD ["npm", "start"]
