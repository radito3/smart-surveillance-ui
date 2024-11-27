# https://mherman.org/blog/dockerizing-an-angular-app/
FROM node:20.18 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install && \
    npm install -g @angular/cli

COPY . .

RUN ng build --configuration=production --output-path=dist

# consider an Alpine image
FROM nginx:latest

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
