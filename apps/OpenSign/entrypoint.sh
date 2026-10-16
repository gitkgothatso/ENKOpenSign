#!/bin/sh

ENV_FILE=./build/env.js
DOTENV_FILE=./.env.prod # ✅ use .env.prod

echo "Generating runtime env file at $ENV_FILE..."

echo "window.RUNTIME_ENV = {" > $ENV_FILE

# List of keys to include
RUNTIME_KEYS="REACT_APP_SERVERURL REACT_APP_BRAND_NAME REACT_APP_BRAND_LOGO_URL REACT_APP_BRAND_FAVICON_URL REACT_APP_EMAIL_LOGO_URL REACT_APP_SUPPORT_EMAIL REACT_APP_HIDE_SOCIAL REACT_APP_SOURCE_URL"

for key in $RUNTIME_KEYS; do
  # First check docker env (-e), fallback to .env file
  value=$(printenv "$key")

  if [ -z "$value" ] && [ -f "$DOTENV_FILE" ]; then
    # fallback: read from .env
    value=$(grep "^$key=" "$DOTENV_FILE" | cut -d '=' -f2- | tr -d '\r\n' | sed 's/"/\\"/g')
  else
    value=$(echo "$value" | sed 's/"/\\"/g')
  fi

  echo "  $key: \"$value\"," >> $ENV_FILE
done

echo "};" >> $ENV_FILE

# White-label (ENK): client brand assets (logo, favicon, theme.css) mounted at /config/brand
# are served from /brand/. The image ships an empty /brand/theme.css as the default.
BRAND_SRC=${BRAND_DIR:-/config/brand}
if [ -d "$BRAND_SRC" ]; then
  echo "Copying brand assets from $BRAND_SRC..."
  cp -R "$BRAND_SRC"/. ./build/brand/
fi

exec "$@"
