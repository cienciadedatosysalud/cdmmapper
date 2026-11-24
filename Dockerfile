# 1. Compilación del frontend (gui_data_mapper)
FROM node:22-alpine AS ui_build
WORKDIR /usr/src/app

COPY gui_data_mapper/package*.json ./
RUN npm ci

COPY gui_data_mapper/ ./
RUN npm run build


# 2. Imagen final con micromamba + nginx (sin ejecutar como root)
FROM mambaorg/micromamba:bookworm-slim

USER root

ARG app_version="Non-versioned"
ENV APP_VERSION=$app_version \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    BACKEND_URL=http://127.0.0.1:8000

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Configuración de Nginx (sirve el frontend y hace proxy al backend en 8000)
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default
COPY nginx.conf /etc/nginx/sites-available/default
RUN ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Permisos para ejecutar Nginx como $MAMBA_USER
RUN sed -i 's/user www-data;//g' /etc/nginx/nginx.conf \
    && sed -i 's|pid /run/nginx.pid;|pid /var/lib/nginx/nginx.pid;|g' /etc/nginx/nginx.conf \
    && mkdir -p /var/log/nginx /var/lib/nginx /var/www/html \
    && chown -R $MAMBA_USER:$MAMBA_USER /var/log/nginx /var/lib/nginx /var/www/html /etc/nginx /app 2>/dev/null || \
       chown -R $MAMBA_USER:$MAMBA_USER /var/log/nginx /var/lib/nginx /var/www/html /etc/nginx

USER $MAMBA_USER

WORKDIR /app

# Entorno Python del backend
COPY --chown=$MAMBA_USER:$MAMBA_USER backend_data_mapper/environment.yml /tmp/environment.yml
RUN micromamba create -y -f /tmp/environment.yml \
    && micromamba clean --all --yes \
    && rm -rf /opt/conda/conda-meta /tmp/environment.yml

RUN echo "micromamba activate datamapper" >> ~/.bashrc \
    && echo "export PATH=/opt/conda/envs/datamapper/bin:${PATH}" >> ~/.bashrc

# Copiar artefactos compilados del frontend y código del backend
COPY --from=ui_build --chown=$MAMBA_USER:$MAMBA_USER /usr/src/app/dist /var/www/html/
COPY --chown=$MAMBA_USER:$MAMBA_USER backend_data_mapper/ /app/

EXPOSE 3000

ENTRYPOINT ["micromamba", "run", "-n", "datamapper", "/usr/local/bin/entrypoint.sh"]