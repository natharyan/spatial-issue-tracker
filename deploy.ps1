# deploy.ps1
# Deploys both backend and frontend to Azure Container Apps

$ErrorActionPreference = "Stop"

# Configuration
$ACR_NAME = "segfaultdockerimages"
$ACR_ENDPOINT = "segfaultdockerimages.azurecr.io"
$RESOURCE_GROUP = "Segfault"
$LOCATION = "westeurope"
$ACA_ENV_NAME = "segfault-deployment"

# ACR credentials
$ACR_USERNAME = "SegfaultDockerImages"
$ACR_PASSWORD = "6F6FiaZTXiNeBUk72T1MPVbzyzWxEaeD/bEHO9tmyB+ACRARTYoH"

Write-Host "=== Full Stack Deployment ===" -ForegroundColor Cyan

# ============================================
# STEP 1: Ensure ACA Environment exists
# ============================================
Write-Host "`n[1/6] Setting up ACA environment..." -ForegroundColor Yellow

$envExists = az containerapp env show --name $ACA_ENV_NAME --resource-group $RESOURCE_GROUP 2>$null
if (-not $envExists) {
    Write-Host "Creating ACA environment: $ACA_ENV_NAME" -ForegroundColor Magenta
    az containerapp env create `
        --name $ACA_ENV_NAME `
        --resource-group $RESOURCE_GROUP `
        --location $LOCATION
} else {
    Write-Host "ACA environment already exists: $ACA_ENV_NAME" -ForegroundColor Green
}

# ============================================
# STEP 2: Build & Deploy Backend
# ============================================
Write-Host "`n[2/6] Building backend image..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot/segfault-backend"
az acr build --registry $ACR_NAME --image "segfault-backend:latest" .

Write-Host "`n[3/6] Deploying backend..." -ForegroundColor Yellow
$backendExists = az containerapp show --name "segfault-backend" --resource-group $RESOURCE_GROUP 2>$null

if (-not $backendExists) {
    az containerapp create `
        --name "segfault-backend" `
        --resource-group $RESOURCE_GROUP `
        --environment $ACA_ENV_NAME `
        --image "${ACR_ENDPOINT}/segfault-backend:latest" `
        --registry-server $ACR_ENDPOINT `
        --registry-username $ACR_USERNAME `
        --registry-password $ACR_PASSWORD `
        --target-port 3000 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 3
} else {
    az containerapp update `
        --name "segfault-backend" `
        --resource-group $RESOURCE_GROUP `
        --image "${ACR_ENDPOINT}/segfault-backend:latest"
}

# Get backend URL
$BACKEND_URL = az containerapp show --name "segfault-backend" --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv
$BACKEND_URL = "https://$BACKEND_URL"
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Cyan

# ============================================
# STEP 3: Build & Deploy Frontend
# ============================================
Write-Host "`n[4/6] Building frontend image with API URL..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot/segfault-frontend"
az acr build --registry $ACR_NAME --image "segfault-frontend:latest" --build-arg "VITE_API_URL=$BACKEND_URL" .

Write-Host "`n[5/6] Deploying frontend..." -ForegroundColor Yellow
$frontendExists = az containerapp show --name "segfault-frontend" --resource-group $RESOURCE_GROUP 2>$null

if (-not $frontendExists) {
    az containerapp create `
        --name "segfault-frontend" `
        --resource-group $RESOURCE_GROUP `
        --environment $ACA_ENV_NAME `
        --image "${ACR_ENDPOINT}/segfault-frontend:latest" `
        --registry-server $ACR_ENDPOINT `
        --registry-username $ACR_USERNAME `
        --registry-password $ACR_PASSWORD `
        --target-port 80 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 3
} else {
    az containerapp update `
        --name "segfault-frontend" `
        --resource-group $RESOURCE_GROUP `
        --image "${ACR_ENDPOINT}/segfault-frontend:latest"
}

# Get frontend URL
$FRONTEND_URL = az containerapp show --name "segfault-frontend" --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Backend:  $BACKEND_URL" -ForegroundColor Cyan
Write-Host "Frontend: https://$FRONTEND_URL" -ForegroundColor Cyan

# Return to original directory
Set-Location -Path $PSScriptRoot
