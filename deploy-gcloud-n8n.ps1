# ==============================================================================
# THE GATEWAY TO FUTURE (GTF) — GCP N8N & WHATSAPP ONBOARDING BLUEPRINT (PowerShell)
# ==============================================================================
# Script: deploy-gcloud-n8n.ps1
# Windows PowerShell wrapper for deploy-gcloud-n8n.sh
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Region = "us-central1",
    [switch]$DryRun,
    [switch]$Verify
)

$bashCmd = "bash"
$gitBash = "C:\Program Files\Git\bin\bash.exe"
if (Test-Path $gitBash) {
    $bashCmd = $gitBash
}

$argsList = @("deploy-gcloud-n8n.sh", "--region", $Region)
if ($DryRun) { $argsList += "--dry-run" }
if ($Verify) { $argsList += "--verify" }

Write-Host "--> Launching GTF GCP n8n Blueprint via $bashCmd..." -ForegroundColor Cyan
& $bashCmd $argsList
