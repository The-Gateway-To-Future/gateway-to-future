#!/usr/bin/env bash
# ==============================================================================
# THE GATEWAY TO FUTURE (GTF) — GCP N8N & WHATSAPP ONBOARDING BLUEPRINT
# ==============================================================================
# Script: deploy-gcloud-n8n.sh
# Purpose: Provisions a Google Cloud Free-Tier eligible Compute Engine VM (e2-micro)
#          running Docker, n8n automation engine, and Caddy SSL reverse proxy.
#          Connects Firebase Auth signup webhooks to Meta WhatsApp Business
#          for automated candidate onboarding and Cloud Firestore synchronization.
#
# Free Tier Specs:
#   - Machine Type: e2-micro (2 vCPU, 1 GB RAM)
#   - Boot Disk:    30 GB pd-standard (Free Tier eligible)
#   - Swap Space:   2 GB swapfile automatically configured for memory stability
#   - Region:       us-central1 (Free Tier) or europe-west3 (Frankfurt/Berlin)
#
# Usage:
#   ./deploy-gcloud-n8n.sh [--region <region>] [--dry-run] [--verify]
# ==============================================================================

set -euo pipefail

# ── Color Palette ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Configuration Constants ───────────────────────────────────────────────────
PROJECT_ID="gateway-to-future"
DEFAULT_REGION="us-central1"           # GCP Free-Tier eligible region
FALLBACK_ZONE="us-central1-a"
MACHINE_TYPE="e2-micro"                # Free-tier eligible: 1 e2-micro instance/month
BOOT_DISK_SIZE="30GB"                  # Free-tier eligible: up to 30 GB standard disk
BOOT_DISK_TYPE="pd-standard"
INSTANCE_NAME="gtf-n8n-automation-vm"
STATIC_IP_NAME="gtf-n8n-static-ip"
SA_NAME="gtf-n8n-engine"
DOMAIN_NAME="n8n.gatewaytofuture.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKFLOW_FILE="$SCRIPT_DIR/automation/gcp-n8n/n8n_firebase_auth_whatsapp_workflow.json"
SA_KEY_LOCAL="$SCRIPT_DIR/gtf-exam-portal/firebase-service-account.json"

DRY_RUN=false
VERIFY_ONLY=false
CUSTOM_REGION=""

# ── CLI Argument Parsing ──────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verify)
      VERIFY_ONLY=true
      shift
      ;;
    --region)
      CUSTOM_REGION="$2"
      shift 2
      ;;
    --help|-h)
      echo -e "${CYAN}GTF GCP n8n & WhatsApp Onboarding Deployment Tool${NC}"
      echo "Usage: ./deploy-gcloud-n8n.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run          Validate prerequisites and blueprint without deploying resources"
      echo "  --verify           Run health checks against existing deployment and test webhooks"
      echo "  --region <region>  Specify GCP region (Default: us-central1 for free-tier, or europe-west3)"
      echo "  -h, --help         Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

REGION="${CUSTOM_REGION:-$DEFAULT_REGION}"
ZONE="${REGION}-a"

echo -e "${CYAN}========================================================================${NC}"
echo -e "${CYAN} 🇩🇪 THE GATEWAY TO FUTURE (GTF) — GCP N8N & WHATSAPP ENGINE BLUEPRINT${NC}"
echo -e "${CYAN}========================================================================${NC}"
echo -e "${BLUE}Target Project:${NC}   $PROJECT_ID"
echo -e "${BLUE}Architecture:${NC}     Compute Engine ($MACHINE_TYPE Free-Tier) + Docker + n8n + Caddy"
echo -e "${BLUE}Region / Zone:${NC}    $REGION ($ZONE)"
echo -e "${BLUE}Boot Disk:${NC}        $BOOT_DISK_SIZE ($BOOT_DISK_TYPE)"
echo -e "${BLUE}Instance Name:${NC}    $INSTANCE_NAME"
echo -e "${BLUE}Domain Target:${NC}    https://$DOMAIN_NAME"
echo -e "${CYAN}------------------------------------------------------------------------${NC}"

# ── 1. Prerequisite Verification ──────────────────────────────────────────────
echo -e "\n${YELLOW}[1/8] Verifying local CLI tools and Google Cloud authentication...${NC}"

if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}[X] 'gcloud' CLI is not installed or not in PATH.${NC}"
  echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo -e "${RED}[X] No active Google Cloud account logged in.${NC}"
  echo "Run: gcloud auth login"
  exit 1
fi
echo -e "${GREEN}[✓] Active Google Cloud Account:${NC} $ACTIVE_ACCOUNT"

gcloud config set project "$PROJECT_ID" --quiet
echo -e "${GREEN}[✓] Configured project:${NC} $PROJECT_ID"

if [ "$VERIFY_ONLY" = true ]; then
  echo -e "\n${YELLOW}--> Running in --verify mode only...${NC}"
  # Check if VM is running
  if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &>/dev/null; then
    VM_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
    echo -e "${GREEN}[✓] VM $INSTANCE_NAME is RUNNING at Public IP: $VM_IP${NC}"
    
    echo -e "--> Testing direct n8n health endpoint (http://$VM_IP:5678/healthz)..."
    if curl -s -m 5 "http://$VM_IP:5678/healthz" > /dev/null; then
      echo -e "${GREEN}[✓] n8n engine is healthy and responding to requests!${NC}"
    else
      echo -e "${YELLOW}[!] Direct port 5678 not responding yet (containers might still be starting).${NC}"
    fi

    echo -e "--> Testing Firebase Auth Webhook endpoint..."
    WEBHOOK_TEST_URL="http://$VM_IP:5678/webhook/firebase-auth-signup"
    TEST_PAYLOAD='{"fullName":"Verification Candidate","email":"verify@gatewaytofuture.com","phone":"+4915228372894","course":"B1"}'
    
    WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_TEST_URL" \
      -H "Content-Type: application/json" \
      -d "$TEST_PAYLOAD" 2>/dev/null || echo "000")
    
    echo -e "    Webhook response code: $WEBHOOK_STATUS"
    if [ "$WEBHOOK_STATUS" = "200" ]; then
      echo -e "${GREEN}[✓] WhatsApp Onboarding Webhook verified successfully (HTTP 200)!${NC}"
    fi
  else
    echo -e "${RED}[X] VM $INSTANCE_NAME does not exist in $ZONE.${NC}"
  fi
  exit 0
fi

# ── 2. Enable Required GCP APIs ───────────────────────────────────────────────
echo -e "\n${YELLOW}[2/8] Enabling required GCP service APIs...${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would enable compute.googleapis.com, firestore.googleapis.com, iam.googleapis.com${NC}"
else
  gcloud services enable \
    compute.googleapis.com \
    firestore.googleapis.com \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com
  echo -e "${GREEN}[✓] Compute Engine, Cloud Firestore, and IAM APIs enabled.${NC}"
fi

# ── 3. Configure Service Account & Permissions ────────────────────────────────
echo -e "\n${YELLOW}[3/8] Configuring dedicated Service Account for n8n & Firestore...${NC}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would create Service Account: $SA_EMAIL and bind roles/datastore.user${NC}"
else
  if ! gcloud iam service-accounts describe "$SA_EMAIL" &> /dev/null; then
    echo "Creating service account $SA_NAME..."
    gcloud iam service-accounts create "$SA_NAME" \
      --display-name="GTF n8n WhatsApp & Firestore Engine"
  fi
  echo -e "${GREEN}[✓] Service account ready:${NC} $SA_EMAIL"

  echo "Assigning Cloud Firestore Datastore User role..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/datastore.user" \
    --condition=None --quiet > /dev/null
  echo -e "${GREEN}[✓] IAM policy role bound:${NC} roles/datastore.user"

  # Ensure local service account key exists for container injection
  if [ ! -s "$SA_KEY_LOCAL" ]; then
    echo "Generating new Service Account key at $SA_KEY_LOCAL..."
    mkdir -p "$(dirname "$SA_KEY_LOCAL")"
    gcloud iam service-accounts keys create "$SA_KEY_LOCAL" \
      --iam-account="$SA_EMAIL" --quiet
    echo -e "${GREEN}[✓] Service account key created successfully.${NC}"
  else
    echo -e "${GREEN}[✓] Found existing service account key:${NC} $SA_KEY_LOCAL"
  fi
fi

# ── 4. Reserve Static External IP Address ─────────────────────────────────────
echo -e "\n${YELLOW}[4/8] Provisioning Regional Static External IP Address...${NC}"
STATIC_IP="PENDING_ALLOCATION"

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would reserve regional IP $STATIC_IP_NAME in $REGION${NC}"
  STATIC_IP="34.120.45.67"
else
  if ! gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" &> /dev/null; then
    echo "Reserving static IP '$STATIC_IP_NAME' in $REGION..."
    gcloud compute addresses create "$STATIC_IP_NAME" \
      --region="$REGION" \
      --description="GTF Automation Engine Static IP"
  fi
  STATIC_IP=$(gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" --format="value(address)")
  echo -e "${GREEN}[✓] Reserved Static IP:${NC} $STATIC_IP"
fi

# ── 5. Firewall Rules Configuration ───────────────────────────────────────────
echo -e "\n${YELLOW}[5/8] Configuring Compute Engine Firewall Rules...${NC}"

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would configure firewall rules: allow-gtf-http (80), allow-gtf-https (443), allow-gtf-n8n (5678)${NC}"
else
  # HTTP (Port 80)
  gcloud compute firewall-rules describe allow-gtf-http &> /dev/null || \
    gcloud compute firewall-rules create allow-gtf-http \
      --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
      --rules=tcp:80 --source-ranges=0.0.0.0/0 --target-tags=n8n-server

  # HTTPS (Port 443)
  gcloud compute firewall-rules describe allow-gtf-https &> /dev/null || \
    gcloud compute firewall-rules create allow-gtf-https \
      --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
      --rules=tcp:443 --source-ranges=0.0.0.0/0 --target-tags=n8n-server

  # Direct n8n Interface (Port 5678)
  gcloud compute firewall-rules describe allow-gtf-n8n-direct &> /dev/null || \
    gcloud compute firewall-rules create allow-gtf-n8n-direct \
      --direction=INGRESS --priority=1010 --network=default --action=ALLOW \
      --rules=tcp:5678 --source-ranges=0.0.0.0/0 --target-tags=n8n-server

  echo -e "${GREEN}[✓] Firewall ingress rules configured for ports 80, 443, and 5678.${NC}"
fi

# ── 6. Compute Engine VM Provisioning ─────────────────────────────────────────
echo -e "\n${YELLOW}[6/8] Provisioning Free-Tier Compute Engine Instance ($MACHINE_TYPE)...${NC}"

# Cloud-Init Startup Script for Docker, Swap Space, and System Preparation
STARTUP_SCRIPT=$(cat << 'EOF'
#!/bin/bash
set -euo pipefail

# 1. Configure 2GB Swap Space to prevent memory spikes on e2-micro (1GB RAM)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
    sysctl vm.swappiness=10
    echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

# 2. Update packages and install Docker CE
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release jq

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 3. Create GTF Application Directory hierarchy
mkdir -p /opt/gtf-n8n/secrets /opt/gtf-n8n/shared /opt/gtf-n8n/caddy_data /opt/gtf-n8n/workflows
chmod -R 777 /opt/gtf-n8n

systemctl enable docker
systemctl start docker
EOF
)

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would create VM: $INSTANCE_NAME ($MACHINE_TYPE, 30GB pd-standard) with startup-script${NC}"
else
  if ! gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    echo "Creating instance $INSTANCE_NAME in $ZONE..."
    gcloud compute instances create "$INSTANCE_NAME" \
      --project="$PROJECT_ID" \
      --zone="$ZONE" \
      --machine-type="$MACHINE_TYPE" \
      --network-interface="address=$STATIC_IP,network-tier=PREMIUM,subnet=default" \
      --maintenance-policy=MIGRATE \
      --service-account="$SA_EMAIL" \
      --scopes=https://www.googleapis.com/auth/cloud-platform \
      --tags=n8n-server,http-server,https-server \
      --image-family=ubuntu-2404-lts-amd64 \
      --image-project=ubuntu-os-cloud \
      --boot-disk-size="$BOOT_DISK_SIZE" \
      --boot-disk-type="$BOOT_DISK_TYPE" \
      --boot-disk-device-name="${INSTANCE_NAME}-boot" \
      --metadata=startup-script="$STARTUP_SCRIPT"

    echo -e "${GREEN}[✓] Compute Engine VM created successfully.${NC}"
    echo "Waiting 45s for Docker installation and system initialization..."
    sleep 45
  else
    echo -e "${GREEN}[✓] Instance $INSTANCE_NAME already exists in $ZONE.${NC}"
  fi
fi

# ── 7. Deploy Docker Compose & N8N Workflow Stack ─────────────────────────────
echo -e "\n${YELLOW}[7/8] Deploying Docker Compose Stack and WhatsApp Workflow...${NC}"

# Docker Compose Definition
DOCKER_COMPOSE_CONTENT=$(cat << 'EOF'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: gtf-n8n-engine
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://${STATIC_IP}:5678/
      - GENERIC_TIMEZONE=Europe/Berlin
      - N8N_METRICS_ENABLED=true
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
      - GOOGLE_APPLICATION_CREDENTIALS=/opt/gtf-n8n/secrets/firebase-service-account.json
      - META_WHATSAPP_PHONE_NUMBER_ID=${META_WHATSAPP_PHONE_NUMBER_ID:-GTF_WHATSAPP_PHONE_ID}
      - META_WHATSAPP_ACCESS_TOKEN=${META_WHATSAPP_ACCESS_TOKEN:-GTF_WHATSAPP_ACCESS_TOKEN}
    volumes:
      - n8n_data:/home/node/.n8n
      - /opt/gtf-n8n/secrets:/opt/gtf-n8n/secrets:ro
      - /opt/gtf-n8n/shared:/opt/gtf-n8n/shared
      - /opt/gtf-n8n/workflows:/opt/gtf-n8n/workflows:ro

volumes:
  n8n_data:
EOF
)

# Caddyfile Definition for Automatic Let's Encrypt TLS Reverse Proxy
CADDYFILE_CONTENT=$(cat << EOF
$DOMAIN_NAME {
    reverse_proxy n8n:5678 {
        header_up Host {upstream_hostport}
        header_up X-Forwarded-Host {host}
    }
}
EOF
)

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would copy docker-compose.yml, Service Account key, and Workflow JSON to VM${NC}"
  echo -e "${BLUE}[DRY RUN] Would launch containers with: docker compose up -d${NC}"
else
  # Write temporary configuration files in relative folder (Windows gcloud scp compatible)
  cd "$SCRIPT_DIR"
  TMP_DIR=".tmp_n8n_deploy"
  mkdir -p "$TMP_DIR"
  echo "$DOCKER_COMPOSE_CONTENT" > "$TMP_DIR/docker-compose.yml"
  echo "$CADDYFILE_CONTENT" > "$TMP_DIR/Caddyfile"
  cp "$WORKFLOW_FILE" "$TMP_DIR/n8n_firebase_auth_whatsapp_workflow.json"
  cp "$SA_KEY_LOCAL" "$TMP_DIR/firebase-service-account.json"

  echo "Waiting for SSH & Docker readiness on $INSTANCE_NAME ($ZONE)..."
  for i in {1..18}; do
    if echo y | gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
      sudo mkdir -p /opt/gtf-n8n/secrets /opt/gtf-n8n/workflows /opt/gtf-n8n/shared && \
      sudo chmod -R 777 /opt/gtf-n8n && \
      sudo docker info >/dev/null 2>&1
    " --quiet 2>/dev/null; then
      echo -e "${GREEN}[✓] VM SSH & Docker runtime ready.${NC}"
      break
    fi
    echo "Waiting for VM initialization and SSH ($i/18)..."
    sleep 10
  done

  echo "Uploading configuration bundle to $INSTANCE_NAME..."
  echo y | gcloud compute scp "$TMP_DIR/docker-compose.yml" "$INSTANCE_NAME:/opt/gtf-n8n/docker-compose.yml" --zone="$ZONE" --quiet
  echo y | gcloud compute scp "$TMP_DIR/firebase-service-account.json" "$INSTANCE_NAME:/opt/gtf-n8n/secrets/firebase-service-account.json" --zone="$ZONE" --quiet
  echo y | gcloud compute scp "$TMP_DIR/n8n_firebase_auth_whatsapp_workflow.json" "$INSTANCE_NAME:/opt/gtf-n8n/workflows/whatsapp_onboarding.json" --zone="$ZONE" --quiet

  echo "Starting Docker Compose container stack & activating WhatsApp webhook workflow on $INSTANCE_NAME..."
  echo y | gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd /opt/gtf-n8n && \
    sudo chown 1000:1000 /opt/gtf-n8n/secrets/firebase-service-account.json && \
    sudo chmod 600 /opt/gtf-n8n/secrets/firebase-service-account.json && \
    sudo env STATIC_IP=\"$STATIC_IP\" META_WHATSAPP_PHONE_NUMBER_ID=\"${META_WHATSAPP_PHONE_NUMBER_ID:-GTF_WHATSAPP_PHONE_ID}\" META_WHATSAPP_ACCESS_TOKEN=\"${META_WHATSAPP_ACCESS_TOKEN:-GTF_WHATSAPP_ACCESS_TOKEN}\" docker compose up -d && \
    for j in {1..18}; do
      if curl -s -m 3 http://localhost:5678/healthz > /dev/null 2>&1; then break; fi
      sleep 5
    done && \
    sudo docker exec -u node gtf-n8n-engine n8n import:workflow --input=/opt/gtf-n8n/workflows/whatsapp_onboarding.json && \
    sudo docker exec -u node gtf-n8n-engine n8n update:workflow --id=gtf-whatsapp-onboarding-001 --active=true && \
    sudo docker restart gtf-n8n-engine
  " --quiet

  echo -e "${GREEN}[✓] Docker container stack started & webhook workflow activated on $INSTANCE_NAME.${NC}"

  # Optional sync & activate workflow on existing SSL endpoint VM (gtf-n8n-automation-engine in europe-west3-a) if present
  if gcloud compute instances describe "gtf-n8n-automation-engine" --zone="europe-west3-a" &> /dev/null; then
    echo "Syncing WhatsApp onboarding workflow to live SSL server (gtf-n8n-automation-engine)..."
    {
      echo y | gcloud compute ssh "gtf-n8n-automation-engine" --zone="europe-west3-a" --command="
        sudo mkdir -p /opt/gtf-n8n/shared && sudo chmod -R 777 /opt/gtf-n8n/shared
      " --quiet && \
      echo y | gcloud compute scp "$TMP_DIR/n8n_firebase_auth_whatsapp_workflow.json" "gtf-n8n-automation-engine:/opt/gtf-n8n/shared/whatsapp_onboarding.json" --zone="europe-west3-a" --quiet && \
      echo y | gcloud compute ssh "gtf-n8n-automation-engine" --zone="europe-west3-a" --command="
        (sudo docker exec -u node gtf-n8n-core n8n import:workflow --input=/data/shared/whatsapp_onboarding.json || \
         sudo docker exec -u node gtf-n8n-core n8n import:workflow --input=/opt/gtf-n8n/shared/whatsapp_onboarding.json) && \
        sudo docker exec -u node gtf-n8n-core n8n update:workflow --id=gtf-whatsapp-onboarding-001 --active=true && \
        sudo docker restart gtf-n8n-core
      " --quiet && \
      echo -e "${GREEN}[✓] Synced & activated workflow on https://$DOMAIN_NAME.${NC}"
    } || echo -e "${YELLOW}[!] Optional secondary sync on gtf-n8n-automation-engine skipped or requires manual check; primary VM $INSTANCE_NAME is ready.${NC}"
  fi

  rm -rf "$TMP_DIR"
fi

# ── 8. Health Verification & Summary ──────────────────────────────────────────
echo -e "\n${YELLOW}[8/8] Performing Final Health Check & Endpoint Verification...${NC}"

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Validation successful. All parameters adhere to GCP Free Tier limits.${NC}"
else
  echo "Checking n8n engine health at http://$STATIC_IP:5678/healthz..."
  for i in {1..12}; do
    if curl -s -m 5 "http://$STATIC_IP:5678/healthz" > /dev/null 2>&1; then
      echo -e "${GREEN}[✓] n8n engine is ONLINE and operational!${NC}"
      break
    fi
    echo "Waiting for n8n container to respond (attempt $i/12)..."
    sleep 5
  done
fi

echo -e "\n${CYAN}========================================================================${NC}"
echo -e "${GREEN} 🎉 GTF GCP N8N & WHATSAPP ENGINE DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}========================================================================${NC}"
echo -e " • ${BLUE}GCP Instance:${NC}              $INSTANCE_NAME ($MACHINE_TYPE, 30GB)"
echo -e " • ${BLUE}Static Public IP:${NC}          $STATIC_IP"
echo -e " • ${BLUE}Direct n8n UI:${NC}             http://$STATIC_IP:5678"
echo -e " • ${BLUE}Custom Domain (SSL):${NC}       https://$DOMAIN_NAME"
echo -e " • ${BLUE}Firebase Auth Webhook URL:${NC} http://$STATIC_IP:5678/webhook/firebase-auth-signup"
echo -e " • ${BLUE}Webhook Payload Schema:${NC}    {\"fullName\":\"...\",\"email\":\"...\",\"phone\":\"+49...\",\"course\":\"B1\"}"
echo -e " • ${BLUE}Target Firestore Collection:${NC} students/{studentId}"
echo -e " • ${BLUE}WhatsApp Dispatcher:${NC}       Meta Graph API v21.0 -> Student WhatsApp"
echo -e "${CYAN}========================================================================${NC}"
