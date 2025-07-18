FROM node:22-alpine

WORKDIR /home/sawari/backend

COPY package*.json ./

ENV NODE_ENV=developement

RUN npm install

COPY . .

ENV PATH /home/sawari/backend/node_modules/.bin:$PATH

RUN npm install -g nodemon

EXPOSE 4445

CMD [ "npm", "run", "dev" ]