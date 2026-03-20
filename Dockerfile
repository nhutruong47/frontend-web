# Stage 1: Build the React/Vite app
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# You can customize the base URL for the API if needed via ARG/ENV
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
