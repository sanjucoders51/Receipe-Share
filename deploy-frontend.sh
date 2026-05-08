#!/bin/bash

# RecipeShare Frontend Manual Deployment Script
# Usage: AZURE_STORAGE_KEY=your_key ./deploy-frontend.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

STORAGE_ACCOUNT="recipesharestorage"
CONTAINER_NAME="\$web"

echo "Starting frontend deployment to Azure Blob Storage..."

if [ -z "$AZURE_STORAGE_KEY" ]; then
    echo -e "${RED}Error: AZURE_STORAGE_KEY environment variable is not set.${NC}"
    exit 1
fi

# Check if az cli is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI (az) is not installed.${NC}"
    exit 1
fi

echo "Uploading files from ./frontend to $CONTAINER_NAME..."

az storage blob upload-batch \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$AZURE_STORAGE_KEY" \
    --destination "$CONTAINER_NAME" \
    --source ./frontend \
    --overwrite \
    --pattern "*" \
    --exclude-path ".DS_Store:.env"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Frontend deployment successful!${NC}"
    echo -e "Live URL: ${GREEN}https://recipesharestorage.z36.web.core.windows.net${NC}"
else
    echo -e "${RED}Frontend deployment failed.${NC}"
    exit 1
fi
