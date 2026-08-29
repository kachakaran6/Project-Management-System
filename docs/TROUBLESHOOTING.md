# Troubleshooting & FAQ

## Common Issues

### 1. WebSocket connection fails or falls back to polling
- Verify your reverse proxy (Nginx / Coolify / Traefik) is forwarding `Upgrade` and `Connection` headers:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```

### 2. MongoDB connection timeout on start
- Check `MONGO_URI` connection string and network whitelist rules.
- Ensure replica set status is healthy if using transactions.

### 3. Drag and drop lagging on large boards
- Filter completed or archived tasks to keep DOM node count below 500 items per column.
