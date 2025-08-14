# Docker Deployment Guide for Gophish-Screen

This guide provides instructions for deploying Gophish-Screen using Docker, which resolves compilation and compatibility issues.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually included with Docker Desktop)
- At least 2GB of free disk space

## Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd gophish-screen
   ```

2. **Build and start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Admin Interface: http://localhost:3333
   - Default credentials: admin/gophish

## Detailed Setup

### Build the Docker Image

```bash
# Build the image
docker-compose build

# Or build manually
docker build -t gophish-screen .
```

### Running with Docker Compose (Recommended)

The `docker-compose.yml` file provides a complete setup:

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Stop and remove volumes (WARNING: This deletes the database)
docker-compose down -v
```

### Running with Docker Only

```bash
# Create a data directory
mkdir -p ./data

# Run the container
docker run -d \
  --name gophish-screen \
  -p 3333:3333 \
  -p 8080:8080 \
  -v $(pwd)/data:/opt/gophish/data \
  -v $(pwd)/config.json:/opt/gophish/config.json \
  gophish-screen
```

### Configuration

#### Database Persistence

The SQLite database is stored in the `./data` directory on your host machine, ensuring data persistence across container restarts.

#### Custom Configuration

You can modify `config.json` to customize:
- Admin interface settings
- Phishing server settings
- SSL certificates
- Database location

#### Environment Variables

Available environment variables:
- `GOPHISH_ADMIN_HOST`: Admin interface host (default: 0.0.0.0)
- `GOPHISH_ADMIN_PORT`: Admin interface port (default: 3333)
- `GOPHISH_PHISH_HOST`: Phishing server host (default: 0.0.0.0)
- `GOPHISH_PHISH_PORT`: Phishing server port (default: 8080)

## Production Deployment

### With Reverse Proxy (Nginx)

For production, use the nginx profile:

```bash
# Start with reverse proxy
docker-compose --profile production up -d
```

Create an `nginx.conf` file:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream gophish-admin {
        server gophish:3333;
    }
    
    upstream gophish-phish {
        server gophish:8080;
    }
    
    server {
        listen 80;
        server_name your-admin-domain.com;
        
        location / {
            proxy_pass http://gophish-admin;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    
    server {
        listen 80;
        server_name your-phishing-domain.com;
        
        location / {
            proxy_pass http://gophish-phish;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### SSL/TLS Configuration

For HTTPS, add SSL certificates to the `./ssl` directory and update your nginx configuration.

## Screening Functionality

The Docker deployment includes all screening functionality:

### Backend Screening
- Automatic gateway detection during event creation
- Database storage of screening decisions
- API endpoints for screening management

### Screening Configuration
- Default screening rules are automatically applied
- Can be managed via the admin interface
- Supports CIDR blocks and User-Agent signatures

### API Endpoints
- `GET /api/screening/stats` - Screening statistics
- `GET /api/screening/configs` - List screening configurations
- `POST /api/screening/configs` - Create screening configuration
- `PUT /api/screening/configs/{id}` - Update screening configuration
- `DELETE /api/screening/configs/{id}` - Delete screening configuration

## Troubleshooting

### Container Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs gophish

# Follow logs in real-time
docker-compose logs -f gophish
```

### Database Issues
```bash
# Check database files
docker-compose exec gophish ls -la /opt/gophish/data/

# Access container shell
docker-compose exec gophish sh
```

### Port Conflicts
If ports 3333 or 8080 are already in use, modify the `docker-compose.yml`:
```yaml
ports:
  - "3334:3333"  # Use port 3334 instead
  - "8081:8080"  # Use port 8081 instead
```

### Rebuild After Changes
```bash
# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Security Considerations

1. **Change default credentials** immediately after first login
2. **Use HTTPS** in production with proper SSL certificates
3. **Restrict network access** to admin interface (port 3333)
4. **Regular backups** of the data directory
5. **Monitor logs** for suspicious activity

## Data Backup

```bash
# Backup database
docker-compose exec gophish cp /opt/gophish/data/gophish.db /opt/gophish/data/backup.db

# Copy backup to host
docker cp gophish-screen:/opt/gophish/data/backup.db ./backup.db
```

## Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify configuration files
3. Ensure ports are not in use by other applications
4. Check Docker and Docker Compose versions