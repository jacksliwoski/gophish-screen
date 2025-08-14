# Minify client side assets (JavaScript)
FROM node:18-alpine AS build-js

RUN npm install gulp gulp-cli -g

WORKDIR /build
COPY package*.json ./
COPY gulpfile.js ./
COPY static/ ./static/
COPY webpack.config.js ./
RUN npm install --only=dev
RUN gulp

# Build Golang binary with screening functionality
FROM golang:1.19-alpine AS build-golang

# Install build dependencies for CGO (required for SQLite)
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build with CGO enabled for SQLite support and screening functionality
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o gophish .

# Runtime container
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite jq

# Create non-root user
RUN addgroup -g 1001 gophish && \
    adduser -D -s /bin/sh -u 1001 -G gophish gophish

WORKDIR /opt/gophish

# Copy built application and assets
COPY --from=build-golang /app/gophish ./
COPY --from=build-golang /app/static ./static/
COPY --from=build-golang /app/templates ./templates/
COPY --from=build-golang /app/db ./db/
COPY --from=build-golang /app/config.json ./

# Copy minified frontend assets
COPY --from=build-js /build/static/js/dist/ ./static/js/dist/
COPY --from=build-js /build/static/css/dist/ ./static/css/dist/

# Create data directory for SQLite database
RUN mkdir -p /opt/gophish/data

# Set proper ownership
RUN chown -R gophish:gophish /opt/gophish

# Update config to bind to all interfaces
RUN sed -i 's/127.0.0.1/0.0.0.0/g' config.json

USER gophish

EXPOSE 3333 8080

CMD ["./gophish"]
