#!/bin/bash

# Default to .env
ENV_FILE=".env"
echo "Defaulting environment file to: ${ENV_FILE}"

# If NODE_ENV is set and not empty, use the specific .env file
if [ -n "${NODE_ENV}" ]; then
  ENV_FILE=".env.${NODE_ENV}"
  echo "NODE_ENV is set to '${NODE_ENV}', using environment file: ${ENV_FILE}"
fi

# Check if the determined environment file exists
if [ ! -f "${ENV_FILE}" ]; then
  echo "Error: Environment file '${ENV_FILE}' not found."
  # Optionally, fall back to .env if the specific one doesn't exist and wasn't the default
  if [ "${ENV_FILE}" != ".env" ] && [ -f ".env" ]; then
    echo "Falling back to default .env file."
    ENV_FILE=".env"
  else
    exit 1 # Exit if neither the specific nor the default .env file exists
  fi
fi

# Run docker-compose, passing the determined env file and any additional arguments
echo "Running docker-compose with --env-file ${ENV_FILE}..."
docker-compose --env-file "${ENV_FILE}" up "$@"