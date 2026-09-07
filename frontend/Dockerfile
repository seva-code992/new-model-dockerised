FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Start Vite dev server on host 0.0.0.0 so Docker can map the port
CMD ["npm", "run", "dev", "--", "--host"]
