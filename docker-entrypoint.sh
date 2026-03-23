#!/bin/sh
# Generate runtime config from environment variables
# This runs when the Docker container starts, before nginx

cat > /usr/share/nginx/html/config.json <<EOF
{
  "apiUrl": "${API_URL:-http://localhost:5100}",
  "firebaseApiKey": "${FIREBASE_API_KEY:-}",
  "firebaseAuthDomain": "${FIREBASE_AUTH_DOMAIN:-}",
  "firebaseProjectId": "${FIREBASE_PROJECT_ID:-}"
}
EOF

echo "[Entrypoint] Generated /config.json with API_URL=${API_URL:-http://localhost:5100}"

# Start nginx
exec nginx -g 'daemon off;'
