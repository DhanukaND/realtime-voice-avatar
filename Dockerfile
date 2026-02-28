FROM node:18

RUN apt-get update && apt-get install -y python3 python3-pip

RUN pip3 install edge-tts

WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "server.js"]