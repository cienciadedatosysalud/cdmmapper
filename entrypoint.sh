#!/usr/bin/env bash
set -e

# Ajusta el comando de arranque según tu backend (FastAPI/Uvicorn, Flask, etc.)
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Ejecuta Nginx en primer plano
exec nginx -g "daemon off;"