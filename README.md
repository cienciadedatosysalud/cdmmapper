![Logo of the project](https://cienciadedatosysalud.org/wp-content/uploads/logo-Data-Science-VPM.png)

- [CDMMapper (Common Data Model Mapper)](#cdmmapper-common-data-model-mapper)
  - [CDMMapper Structure](#cdmmapper-structure)
  - [Requirements/Dependencies](#requirementsdependencies)
  - [How to deploy it](#how-to-deploy-it)
  - [How to use the application](#how-to-use-the-application)
- [Authoring](#authoring)
- [How to contribute](#how-to-contribute)
- [Links of interest](#links-of-interest)
- [References](#references)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

# CDMMapper (Common Data Model Mapper)

CDMMapper is a tool designed to transform source CSV files that do not initially conform to a target data model structure. It provides an interactive interface to map columns, standardize and remap values within catalogues, and generate output datasets aligned with the required target data model structure.

## CDMMapper Structure

The repository contains the following main folders and configuration files:

- **gui_data_mapper**: Graphical user interface developed with [Astro](https://astro.build/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/), providing an interactive web application for mapping columns and catalogue values.
- **backend_data_mapper**: Python backend service (`main.py`, with desktop packaging support in `desktop.py`) that handles CSV processing, column mapping, catalogue value transformations, and output generation. Environment dependencies are defined in `backend_data_mapper/environment.yml`.
- **Root configuration files**:
  - `Dockerfile`: Multi-stage Docker build that compiles the `gui_data_mapper` frontend and sets up the Python (`micromamba`) backend alongside `nginx`.
  - `entrypoint.sh` & `nginx.conf`: Startup script and reverse proxy configuration serving the web interface and routing API requests on port `3000`.

## Requirements/Dependencies

To build and run the Docker container, you need to have [Docker](https://www.docker.com/) installed on your machine.

All system packages (`nginx`), frontend build dependencies (`package.json`), and backend Python dependencies (`backend_data_mapper/environment.yml`) are defined and installed automatically during the `Dockerfile` build process. Any incompatibility issues between packages and versions will stop building the image.

## How to deploy it

To deploy the Docker container, follow these steps:

1. Pull the latest Docker image from GitHub Container Registry:

   ```
   docker pull ghcr.io/cienciadedatosysalud/cdmmapper:latest
   
   ```

2. Run the container mapping port `3000`:

   ```
   docker run -d --name cdmmapper -p 3000:3000 ghcr.io/cienciadedatosysalud/cdmmapper:latest
   
   ```

3. Open a web browser and access `http://<APP_HOST>:<APP_PORT>` to see the graphical user interface of the application (by default http://localhost:3000).

Note: If port 3000 is already in use on your machine, you can map the container to a different host port by changing -p 3000:3000 to -p 3001:3000 (or any other available port) and accessing http://localhost:3001.

## How to use the application

1. **Load source data and target model**: Upload your source CSV files along with the target data model specification.
2. **Map columns**: Assign and align the columns from your source CSV files to the corresponding fields in the target data model.
3. **Map catalogue values**: Review and transform categorical values so they match the expected target catalogues.
4. **Export mapped data**: Generate and download the resulting CSV files formatted according to the required target structure.

# Authoring

CDMMapper has been developed by the [Data Science for Health Services and Policy research group](https://cienciadedatosysalud.org/en/us/research-group/)
in the Institute for Health Sciences in Aragón (IACS).

Lead by ![orcid](https://orcid.org/sites/default/files/images/orcid_16x16.png) [Javier González-Galindo](https://orcid.org/0000-0002-8783-5478)
, with the collaboration of ![orcid](https://orcid.org/sites/default/files/images/orcid_16x16.png) [Francisco Estupiñán-Romero](https://orcid.org/0000-0002-6285-8120), 
and ![orcid](https://orcid.org/sites/default/files/images/orcid_16x16.png) [Santiago Royo-Sierra](https://orcid.org/0000-0002-0048-4370)
, under the supervision and coordination of ![orcid](https://orcid.org/sites/default/files/images/orcid_16x16.png) [Enrique Bernal-Delgado](https://orcid.org/0000-0002-0961-3298) **(PI)**.

# How to contribute

- Repository: https://github.com/cienciadedatosysalud/cdmmapper
- Issue tracker: https://github.com/cienciadedatosysalud/cdmmapper/issues

# Links of interest

- Micromamba: https://mamba.readthedocs.io/en/latest/user_guide/micromamba.html
- Astro Documentation: https://docs.astro.build/

# References

- Common Data Model Builder: https://github.com/cienciadedatosysalud/cdmb
