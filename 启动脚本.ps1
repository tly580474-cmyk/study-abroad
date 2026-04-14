# One-click startup script
# Start backend and frontend services

$backendPort = 3000
$frontendPort = 5173

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "       Study Abroad System Startup   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Start backend service in new window
Write-Host "[1/2] Starting backend service (port:$backendPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend service in new window
Write-Host "[2/2] Starting frontend service (port:$frontendPort)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Services started successfully!" -ForegroundColor Green
Write-Host "  Backend: http://localhost:$backendPort" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:$frontendPort" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Each service is running in its own window." -ForegroundColor Gray
Write-Host "Close the windows to stop the services." -ForegroundColor Gray
