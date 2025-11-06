# Build and package the VS Code extension
Write-Host "Building PMT VS Code Extension..." -ForegroundColor Green

# Ensure node_modules exists
if (-not (Test-Path -Path ".\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Compile TypeScript
Write-Host "Compiling TypeScript..." -ForegroundColor Yellow
npm run compile

# Package extension
Write-Host "Packaging extension..." -ForegroundColor Yellow
npm run package

# Check if the .vsix file was created
$vsixFile = Get-ChildItem -Path "." -Filter "*.vsix" | Sort-Object LastWriteTime | Select-Object -Last 1
if ($vsixFile) {
    Write-Host "Successfully created extension package: $($vsixFile.Name)" -ForegroundColor Green
    Write-Host "To install the extension: code --install-extension $($vsixFile.FullName)" -ForegroundColor Cyan
} else {
    Write-Host "Failed to create extension package." -ForegroundColor Red
}


