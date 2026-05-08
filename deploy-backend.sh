#!/bin/bash

# RecipeShare Backend Manual Deployment Script
# Usage: ./deploy-backend.sh
# Ensure you are logged in via 'az login' before running this script.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

FUNCTION_APP_NAME="recipeshare-api"
RESOURCE_GROUP="recipeshare-rg"
ZIP_NAME="backend_manual.zip"

echo "Starting backend deployment to Azure Functions..."

# Check if az cli is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI (az) is not installed.${NC}"
    exit 1
fi

# Check if zip is installed
if ! command -v zip &> /dev/null; then
    echo -e "${RED}Error: zip command is not installed.${NC}"
    exit 1
fi

echo "Creating deployment package..."
zip -r "$ZIP_NAME" backend -x "backend/.git/*" "backend/local.settings.json" "backend/.env" "backend/*.test.js" "backend/node_modules/.cache/*"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create zip package.${NC}"
    exit 1
fi

echo "Deploying to Azure Functions..."
az functionapp deployment source config-zip \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --src "$ZIP_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backend deployment successful!${NC}"
    echo -e "Live URL: ${GREEN}https://recipeshare-api.polandcentral-01.azurewebsites.net${NC}"
else
    echo -e "${RED}Backend deployment failed.${NC}"
    rm "$ZIP_NAME"
    exit 1
fi

# Cleanup
echo "Cleaning up..."
rm "$ZIP_NAME"
echo -e "${GREEN}Cleanup complete.${NC}"
