# Seed all Andhra Pradesh cities sequentially
# Usage: .\agents\seed_ap_cities.ps1
# Requires: ANTHROPIC_API_KEY and LOCALINDIA_ADMIN_PASSWORD set in environment

$ErrorActionPreference = "Continue"

$cities = @(
    @{ name = "Nellore";             lang = "te" },
    @{ name = "Kurnool";             lang = "te" },
    @{ name = "Kakinada";            lang = "te" },
    @{ name = "Rajamahendravaram";   lang = "te" },
    @{ name = "Anantapuram";         lang = "te" },
    @{ name = "Ongole";              lang = "te" }
)

$total = $cities.Count
$i = 1

foreach ($city in $cities) {
    Write-Host ""
    Write-Host "[$i/$total] Seeding $($city.name)..." -ForegroundColor Cyan
    Write-Host "---"
    python agents/city_launcher.py --city "$($city.name)" --lang "$($city.lang)"
    $exit = $LASTEXITCODE
    if ($exit -ne 0) {
        Write-Host "[WARN] $($city.name) exited with code $exit — continuing" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] $($city.name) complete" -ForegroundColor Green
    }
    $i++
    # Brief pause between cities to avoid login rate limiting
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "All AP cities seeded." -ForegroundColor Green
