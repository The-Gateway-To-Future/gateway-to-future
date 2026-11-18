# =============================================================================
# THE GATEWAY TO FUTURE (GTF) — GCP N8N ENGINE AUTOMATED DEPLOYMENT (PowerShell)
# Target Project: gateway-to-future | Region: europe-west3 (Frankfurt/Berlin)
# Headquarters: Schönefelder Straße 2, GStU, 12355 Berlin
# =============================================================================

[CmdletBinding()]
param (
    [string]$ProjectId = "gateway-to-future",
    [string]$Region = "europe-west3",
    [string]$Zone = "europe-west3-a",
    [string]$MachineType = "e2-small",       # Use "e2-micro" if targeting 100% Always-Free tier (in us-central1)
    [string]$InstanceName = "gtf-n8n-automation-engine",
    [string]$StaticIpName = "gtf-n8n-static-ip",
    [string]$ServiceAccountName = "gtf-n8n-engine",
    [string]$DomainName = "n8n.gatewaytofuture.com"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " 🚀 GTF AUTOMATION ENGINE — GOOGLE COMPUTE ENGINE & N8N PROVISIONER" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Project:   $ProjectId" -ForegroundColor Yellow
Write-Host " Region:    $Region ($Zone)" -ForegroundColor Yellow
Write-Host " Machine:   $MachineType" -ForegroundColor Yellow
Write-Host " Instance:  $InstanceName" -ForegroundColor Yellow
Write-Host " Domain:    $DomainName" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------"

# ── 1. Check gcloud CLI ──────────────────────────────────────────────────────
try {
    $gcloudVer = gcloud --version
    Write-Host " [OK] gcloud CLI found." -ForegroundColor Green
} catch {
    Write-Error "gcloud CLI is not installed or not in PATH. Please install Google Cloud SDK."
}

# ── 2. Configure GCP Project ─────────────────────────────────────────────────
Write-Host " --> Setting GCP project to '$ProjectId'..." -ForegroundColor Cyan
gcloud config set project $ProjectId

# ── 3. Enable Required APIs ──────────────────────────────────────────────────
Write-Host " --> Enabling Compute, Firestore, and IAM APIs (may take ~1-2 mins)..." -ForegroundColor Cyan
gcloud services enable `
    compute.googleapis.com `
    firestore.googleapis.com `
    iam.googleapis.com `
    cloudresourcemanager.googleapis.com

# ── 4. Reserve Static Regional IP Address ────────────────────────────────────
Write-Host " --> Reserving static external IP '$StaticIpName' in $Region..." -ForegroundColor Cyan
$existingIp = gcloud compute addresses list --filter="name=$StaticIpName AND region:($Region)" --format="value(address)"
if (-not $existingIp) {
    gcloud compute addresses create $StaticIpName `
        --region=$Region `
        --description="Static IP for GTF n8n and WhatsApp Business Webhook"
    $staticIp = gcloud compute addresses describe $StaticIpName --region=$Region --format="value(address)"
    Write-Host " [OK] Reserved static IP: $staticIp" -ForegroundColor Green
} else {
    $staticIp = $existingIp.Trim()
    Write-Host " [OK] Using existing static IP: $staticIp" -ForegroundColor Green
}

# ── 5. Setup Firewall Rules ──────────────────────────────────────────────────
Write-Host " --> Configuring VPC firewall rules (Ports 80, 443, 5678)..." -ForegroundColor Cyan

$httpRule = gcloud compute firewall-rules list --filter="name=allow-gtf-http" --format="value(name)"
if (-not $httpRule) {
    gcloud compute firewall-rules create allow-gtf-http `
        --direction=INGRESS --priority=1000 --network=default --action=ALLOW `
        --rules=tcp:80 --source-ranges=0.0.0.0/0 --target-tags=n8n-server `
        --description="Allow HTTP for Caddy Let's Encrypt validation"
}

$httpsRule = gcloud compute firewall-rules list --filter="name=allow-gtf-https" --format="value(name)"
if (-not $httpsRule) {
    gcloud compute firewall-rules create allow-gtf-https `
        --direction=INGRESS --priority=1000 --network=default --action=ALLOW `
        --rules=tcp:443 --source-ranges=0.0.0.0/0 --target-tags=n8n-server `
        --description="Allow HTTPS for n8n webhooks and portal"
}

$directRule = gcloud compute firewall-rules list --filter="name=allow-gtf-n8n-direct" --format="value(name)"
if (-not $directRule) {
    gcloud compute firewall-rules create allow-gtf-n8n-direct `
        --direction=INGRESS --priority=1010 --network=default --action=ALLOW `
        --rules=tcp:5678 --source-ranges=0.0.0.0/0 --target-tags=n8n-server `
        --description="Allow direct n8n port 5678"
}

# ── 6. Setup Service Account & Export Key ─────────────────────────────────────
Write-Host " --> Setting up dedicated IAM Service Account '$ServiceAccountName'..." -ForegroundColor Cyan
$saEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$existingSa = gcloud iam service-accounts list --filter="email=$saEmail" --format="value(email)"

if (-not $existingSa) {
    gcloud iam service-accounts create $ServiceAccountName `
        --display-name="GTF n8n & Content Factory Engine" `
        --description="Service account for n8n to read/write Firestore and Cloud Storage"
}

Write-Host " --> Assigning 'roles/datastore.user' to $saEmail..." -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$saEmail" `
    --role="roles/datastore.user" --condition=None

$keyPath = Join-Path $PSScriptRoot "firebase-service-account.json"
if (-not (Test-Path $keyPath) -or ((Get-Item $keyPath).Length -eq 0)) {
    Write-Host " --> Generating new Service Account key JSON at '$keyPath'..." -ForegroundColor Cyan
    gcloud iam service-accounts keys create $keyPath --iam-account=$saEmail
    Write-Host " [OK] Generated Service Account key successfully." -ForegroundColor Green
} else {
    Write-Host " [OK] Existing Service Account key file found." -ForegroundColor Green
}

# ── 7. Provision Compute Engine VM ───────────────────────────────────────────
Write-Host " --> Checking if Compute Engine instance '$InstanceName' exists..." -ForegroundColor Cyan
$existingVm = gcloud compute instances list --filter="name=$InstanceName AND zone:($Zone)" --format="value(name)"

if (-not $existingVm) {
    Write-Host " --> Provisioning Compute Engine VM ($MachineType in $Zone)..." -ForegroundColor Cyan
    
    $startupScript = @'
#!/bin/bash
set -e

# 1. Setup 2GB Swapfile (Guarantees zero OOM crashes)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
    sysctl vm.swappiness=10
    echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

# 2. Install Docker CE & Docker Compose Plugin
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 3. Create GTF Application Directory Structure
mkdir -p /opt/gtf-n8n/secrets
mkdir -p /opt/gtf-n8n/shared
chmod -R 755 /opt/gtf-n8n

# 4. Enable & Start Docker Service
systemctl enable docker
systemctl start docker
echo "GTF VM Initialization Complete." > /var/log/gtf-init.log
'@

    gcloud compute instances create $InstanceName `
        --project=$ProjectId `
        --zone=$Zone `
        --machine-type=$MachineType `
        --network-interface="address=$staticIp,network-tier=PREMIUM,subnet=default" `
        --maintenance-policy=MIGRATE `
        --service-account=$saEmail `
        --scopes=https://www.googleapis.com/auth/cloud-platform `
        --tags=n8n-server,http-server,https-server `
        --image-family=ubuntu-2404-lts-amd64 `
        --image-project=ubuntu-os-cloud `
        --boot-disk-size=30GB `
        --boot-disk-type=pd-standard `
        --boot-disk-device-name=gtf-n8n-boot-disk `
        --metadata=startup-script="$startupScript"

    Write-Host " [OK] VM '$InstanceName' successfully created!" -ForegroundColor Green
    Write-Host " --> Waiting 45 seconds for cloud-init startup script to finish installing Docker..." -ForegroundColor Yellow
    Start-Sleep -Seconds 45
} else {
    Write-Host " [OK] VM '$InstanceName' already exists." -ForegroundColor Green
}

# ── 8. Upload Stack Files to VM ──────────────────────────────────────────────
Write-Host " --> Uploading docker-compose.yml, Caddyfile, and Service Account key to VM..." -ForegroundColor Cyan

$composePath = Join-Path $PSScriptRoot "docker-compose.yml"
$caddyPath = Join-Path $PSScriptRoot "Caddyfile"

gcloud compute scp $keyPath "${InstanceName}:/opt/gtf-n8n/secrets/firebase-service-account.json" --zone=$Zone
gcloud compute scp $composePath "${InstanceName}:/opt/gtf-n8n/docker-compose.yml" --zone=$Zone
gcloud compute scp $caddyPath "${InstanceName}:/opt/gtf-n8n/Caddyfile" --zone=$Zone

# ── 9. Start Docker Stack on VM ──────────────────────────────────────────────
Write-Host " --> Launching Docker Compose stack on VM..." -ForegroundColor Cyan
$startCmd = "cd /opt/gtf-n8n && chmod 600 /opt/gtf-n8n/secrets/firebase-service-account.json && docker compose up -d"
gcloud compute ssh $InstanceName --zone=$Zone --command="$startCmd"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " 🎉 GTF COMPUTE ENGINE & N8N AUTOMATION ENGINE IS NOW LIVE!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " Static Public IP:   $staticIp" -ForegroundColor Yellow
Write-Host " Target Domain:      https://$DomainName" -ForegroundColor Yellow
Write-Host " Direct Debug Port:  http://${staticIp}:5678" -ForegroundColor Yellow
Write-Host " Webhook Base URL:   https://${DomainName}/webhook/" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------"
Write-Host " 📌 DNS ACTION REQUIRED:" -ForegroundColor Cyan
Write-Host " Go to your GoDaddy / Cloudflare DNS panel for gatewaytofuture.com:"
Write-Host " Add an 'A' Record:"
Write-Host "   Type:  A"
Write-Host "   Host:  n8n"
Write-Host "   Value: $staticIp"
Write-Host "   TTL:   600 seconds (or Automatic)"
Write-Host " Once DNS propagates, Caddy will automatically issue a Let's Encrypt SSL cert!"
Write-Host "=================================================================="
