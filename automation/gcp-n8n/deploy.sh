#!/bin/bash
# =============================================================================
# THE GATEWAY TO FUTURE (GTF) — GCP N8N ENGINE AUTOMATED DEPLOYMENT (Bash)
# Target Project: gateway-to-future | Region: europe-west3 (Frankfurt/Berlin)
# Headquarters: Ketschendorfer Weg 33, 12683 Berlin
# =============================================================================

set -e

PROJECT_ID="gateway-to-future"
REGION="europe-west3"
ZONE="europe-west3-a"
MACHINE_TYPE="e2-small"
INSTANCE_NAME="gtf-n8n-automation-engine"
STATIC_IP_NAME="gtf-n8n-static-ip"
SA_NAME="gtf-n8n-engine"
DOMAIN_NAME="n8n.gatewaytofuture.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================================="
echo " 🚀 GTF AUTOMATION ENGINE — GOOGLE COMPUTE ENGINE PROVISIONER"
echo "=================================================================="
echo " Project:   $PROJECT_ID"
echo " Region:    $REGION ($ZONE)"
echo " Machine:   $MACHINE_TYPE"
echo " Instance:  $INSTANCE_NAME"
echo " Domain:    $DOMAIN_NAME"
echo "------------------------------------------------------------------"

# 1. Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI not found in PATH. Install Google Cloud SDK."
    exit 1
fi

# 2. Configure Project
echo "--> Setting project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# 3. Enable APIs
echo "--> Enabling Compute, Firestore, and IAM APIs..."
gcloud services enable \
    compute.googleapis.com \
    firestore.googleapis.com \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com

# 4. Reserve Static Regional IP Address
echo "--> Reserving static IP $STATIC_IP_NAME in $REGION..."
if ! gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" &> /dev/null; then
    gcloud compute addresses create "$STATIC_IP_NAME" \
        --region="$REGION" \
        --description="Static IP for GTF n8n and WhatsApp Business Webhook"
fi
STATIC_IP=$(gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" --format="value(address)")
echo " [OK] Static IP: $STATIC_IP"

# 5. Setup Firewall Rules
echo "--> Configuring Firewall Rules..."
gcloud compute firewall-rules describe allow-gtf-http &> /dev/null || \
    gcloud compute firewall-rules create allow-gtf-http \
        --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
        --rules=tcp:80 --source-ranges=0.0.0.0/0 --target-tags=n8n-server

gcloud compute firewall-rules describe allow-gtf-https &> /dev/null || \
    gcloud compute firewall-rules create allow-gtf-https \
        --direction=INGRESS --priority=1000 --network=default --action=ALLOW \
        --rules=tcp:443 --source-ranges=0.0.0.0/0 --target-tags=n8n-server

gcloud compute firewall-rules describe allow-gtf-n8n-direct &> /dev/null || \
    gcloud compute firewall-rules create allow-gtf-n8n-direct \
        --direction=INGRESS --priority=1010 --network=default --action=ALLOW \
        --rules=tcp:5678 --source-ranges=0.0.0.0/0 --target-tags=n8n-server

# 6. Setup Service Account & Key
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "--> Setting up Service Account $SA_EMAIL..."
gcloud iam service-accounts describe "$SA_EMAIL" &> /dev/null || \
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="GTF n8n & Content Factory Engine"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/datastore.user" --condition=None

KEY_PATH="$SCRIPT_DIR/firebase-service-account.json"
if [ ! -s "$KEY_PATH" ]; then
    echo "--> Generating service account key at $KEY_PATH..."
    gcloud iam service-accounts keys create "$KEY_PATH" --iam-account="$SA_EMAIL"
fi

# 7. Provision Compute Engine VM
if ! gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    echo "--> Creating VM $INSTANCE_NAME..."
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
        --boot-disk-size=30GB \
        --boot-disk-type=pd-standard \
        --boot-disk-device-name=gtf-n8n-boot-disk \
        --metadata=startup-script='#!/bin/bash
set -e
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
    sysctl vm.swappiness=10
    echo "vm.swappiness=10" >> /etc/sysctl.conf
fi
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
mkdir -p /opt/gtf-n8n/secrets /opt/gtf-n8n/shared
chmod -R 755 /opt/gtf-n8n
systemctl enable docker
systemctl start docker
'
    echo " [OK] VM created. Waiting 45s for Docker installation..."
    sleep 45
fi

# 8. Copy Configs & Keys
echo "--> Copying files to VM..."
gcloud compute scp "$KEY_PATH" "$INSTANCE_NAME:/opt/gtf-n8n/secrets/firebase-service-account.json" --zone="$ZONE"
gcloud compute scp "$SCRIPT_DIR/docker-compose.yml" "$INSTANCE_NAME:/opt/gtf-n8n/docker-compose.yml" --zone="$ZONE"
gcloud compute scp "$SCRIPT_DIR/Caddyfile" "$INSTANCE_NAME:/opt/gtf-n8n/Caddyfile" --zone="$ZONE"

# 9. Start Container Stack
echo "--> Starting Docker Compose stack..."
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="cd /opt/gtf-n8n && chmod 600 /opt/gtf-n8n/secrets/firebase-service-account.json && docker compose up -d"

echo "=================================================================="
echo " 🎉 GTF AUTOMATION ENGINE DEPLOYED SUCCESSFULLY!"
echo " Static Public IP:   $STATIC_IP"
echo " Domain:             https://$DOMAIN_NAME"
echo " Direct Port:        http://$STATIC_IP:5678"
echo "=================================================================="
