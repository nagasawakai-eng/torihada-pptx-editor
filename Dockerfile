FROM node:20-slim

# LibreOffice をインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice \
      fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存パッケージをインストール
COPY package*.json ./
RUN npm ci --omit=dev

# アプリをコピー
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
