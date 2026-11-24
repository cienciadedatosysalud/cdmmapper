FROM mambaorg/micromamba:latest

WORKDIR /app

# Copiar el archivo environment.yml
COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml /tmp/environment.yml

# Crear el entorno micromamba con el nombre "datamapper"
RUN micromamba create -y -n datamapper -f /tmp/environment.yml && \
    micromamba clean --all --yes

# Configurar el PATH para que use el entorno por defecto
ENV PATH=/opt/conda/envs/datamapper/bin:$PATH

# Copiar el resto del código del backend
COPY --chown=$MAMBA_USER:$MAMBA_USER . /app

EXPOSE 8000

# Comando para iniciar Uvicorn con recarga en vivo
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]