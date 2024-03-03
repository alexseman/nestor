FROM node:18-alpine

WORKDIR /index
COPY ./package.json ./package-lock.json /index/
RUN npm install
COPY . /index
#RUN npm run build

#CMD ["npm", "run", "dev"]
EXPOSE 5000
