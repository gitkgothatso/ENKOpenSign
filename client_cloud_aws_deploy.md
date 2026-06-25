# AWS Deployment Guide — Per Client

This guide deploys an ENKOpenSign instance for a client on AWS using **EC2 + Docker Compose + S3 + SES**. All CLI commands use the pre-configured `DevAdmin` credentials targeting region **`af-south-1` (Cape Town)**.

---

## Architecture

```
Internet
   │
   ▼
Route 53 (DNS)
   │
   ▼
Elastic IP ──► EC2 t3.small (Ubuntu 24.04)
                  │
                  ├── Caddy  (443/80 → 3001)
                  ├── OpenSign frontend (3000)
                  ├── OpenSignServer  (8080)
                  └── MongoDB (internal)

EC2 ──► S3 Bucket (document storage)
EC2 ──► SES (transactional email)
```

**Cost estimate (af-south-1, small client):**

| Resource | Type | ~Monthly |
|---|---|---|
| EC2 instance | t3.small (2 vCPU, 2 GB) | ~$15 |
| Elastic IP | (free when attached) | $0 |
| S3 storage | 10 GB docs + requests | ~$1 |
| SES email | 1,000 emails/mo | ~$0.10 |
| **Total** | | **~$16/mo** |

Upgrade to `t3.medium` (~$30/mo) for clients with 50+ active users.

---

## Prerequisites

- AWS CLI configured (`aws sts get-caller-identity` returns a valid identity)
- A domain name pointed to AWS Route 53 or an external DNS provider
- The client branch checked out locally and working

---

## Step 1 — Create an SSH Key Pair

```bash
CLIENT=acme-corp   # change per client

aws ec2 create-key-pair \
  --key-name opensign-${CLIENT} \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/opensign-${CLIENT}.pem

chmod 600 ~/.ssh/opensign-${CLIENT}.pem
```

---

## Step 2 — Create a Security Group

```bash
SG_ID=$(aws ec2 create-security-group \
  --group-name opensign-${CLIENT}-sg \
  --description "OpenSign ${CLIENT} - HTTP/HTTPS/SSH" \
  --vpc-id vpc-06342aebfe0228724 \
  --query 'GroupId' --output text)

echo "Security group: $SG_ID"

# SSH (restrict to your IP in production)
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

# HTTP (for Let's Encrypt ACME challenge)
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# HTTPS
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

---

## Step 3 — Launch EC2 Instance

```bash
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0fd23a3fc97fcd8f0 \
  --instance-type t3.small \
  --key-name opensign-${CLIENT} \
  --security-group-ids $SG_ID \
  --subnet-id subnet-0bd4da46e6f341497 \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=opensign-${CLIENT}}]" \
  --query 'Instances[0].InstanceId' --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for it to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID
echo "Instance is running"
```

> **AMI note:** `ami-0fd23a3fc97fcd8f0` is Amazon Linux 2023 in `af-south-1` as of 2026-06. Run the command below to get the latest:
> ```bash
> aws ec2 describe-images --owners amazon \
>   --filters "Name=name,Values=al2023-ami-2023*" "Name=architecture,Values=x86_64" "Name=state,Values=available" \
>   --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text
> ```

---

## Step 4 — Allocate an Elastic IP

```bash
ALLOC_ID=$(aws ec2 allocate-address --domain vpc \
  --query 'AllocationId' --output text)

aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOC_ID

PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids $ALLOC_ID \
  --query 'Addresses[0].PublicIp' --output text)

echo "Public IP: $PUBLIC_IP"
```

---

## Step 5 — Point the Domain

In the client's DNS panel (Route 53 or external), create an **A record**:

```
sign.<client-domain>.com  →  <PUBLIC_IP>
```

If using Route 53:
```bash
# Get the hosted zone ID first
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name <client-domain>.com \
  --query 'HostedZones[0].Id' --output text | cut -d'/' -f3)

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "sign.<client-domain>.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$PUBLIC_IP'"}]
      }
    }]
  }'
```

Verify DNS propagated before proceeding:
```bash
dig +short sign.<client-domain>.com
```

---

## Step 6 — Install Docker on the Instance

```bash
ssh -i ~/.ssh/opensign-${CLIENT}.pem ec2-user@$PUBLIC_IP
```

Once connected:
```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
newgrp docker

# Install Docker Compose plugin
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d'"' -f4)
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

docker compose version   # verify
```

---

## Step 7 — Deploy the App

On the server:
```bash
git clone https://github.com/gitkgothatso/ENKOpenSign.git
cd ENKOpenSign
git checkout client/<client-slug>
```

Create `.env.prod` (see [Step 9](#step-9--configure-ses-email) for SES values):
```bash
cat > .env.prod << 'EOF'
# Identity
APP_NAME=Acme Corp Sign
appName=Acme Corp Sign
APP_ID=acmecorp
REACT_APP_APPID=acmecorp
MASTER_KEY=<openssl rand -base64 24>

# URLs
PUBLIC_URL=https://sign.acme-corp.com
SERVER_URL=http://server:8080/app

# Database
MONGODB_URI=mongodb://mongo-container:27017/AcmeCorpDB
PARSE_MOUNT=/app

# Storage (S3 — see Step 8)
USE_LOCAL=false
DO_SPACE=<bucket-name>
DO_ENDPOINT=s3.af-south-1.amazonaws.com
DO_BASEURL=https://<bucket-name>.s3.af-south-1.amazonaws.com
DO_ACCESS_KEY_ID=<iam-access-key>
DO_SECRET_ACCESS_KEY=<iam-secret-key>
DO_REGION=af-south-1

# Email (SES — see Step 9)
SMTP_ENABLE=true
SMTP_HOST=email-smtp.af-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=<ses-smtp-username>
SMTP_PASS=<ses-smtp-password>
SMTP_USER_EMAIL=noreply@acme-corp.com

# PDF signing certificate
PFX_BASE64=<base64-encoded-p12>
PASS_PHRASE=<passphrase>
EOF
```

Restore ports 80 and 443 to Caddy in `docker-compose.yml` (they were removed for local dev):
```bash
# Edit docker-compose.yml caddy ports section to:
#   - "3001:3001"
#   - "80:80"
#   - "443:443"
#   - "443:443/udp"
```

Build and start:
```bash
cd apps/OpenSign && npm install --engine-strict=false && npm run build && cd ../..
HOST_URL=https://sign.acme-corp.com docker compose up --build -d
docker compose ps   # all 5 containers should be Up
docker logs OpenSignServer-container --tail 20
```

---

## Step 8 — Create S3 Bucket for Document Storage

Run from your **local machine** (not the server):
```bash
BUCKET=opensign-${CLIENT}-docs

aws s3api create-bucket \
  --bucket $BUCKET \
  --region af-south-1 \
  --create-bucket-configuration LocationConstraint=af-south-1

# Block all public access
aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Bucket created: $BUCKET"
```

Create an IAM user for S3 access:
```bash
aws iam create-user --user-name opensign-${CLIENT}-s3

aws iam attach-user-policy \
  --user-name opensign-${CLIENT}-s3 \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

KEYS=$(aws iam create-access-key --user-name opensign-${CLIENT}-s3)
echo "Access Key ID:     $(echo $KEYS | python3 -c "import sys,json; print(json.load(sys.stdin)['AccessKey']['AccessKeyId'])")"
echo "Secret Access Key: $(echo $KEYS | python3 -c "import sys,json; print(json.load(sys.stdin)['AccessKey']['SecretAccessKey'])")"
```

Add the key values to `.env.prod` on the server (`DO_ACCESS_KEY_ID` and `DO_SECRET_ACCESS_KEY`).

---

## Step 9 — Configure SES Email

```bash
# Verify the sender domain (required before sending)
aws ses verify-domain-identity --domain acme-corp.com --region af-south-1

# Get the TXT record to add to DNS
aws ses get-identity-verification-attributes \
  --identities acme-corp.com \
  --region af-south-1 \
  --query 'VerificationAttributes.*.VerificationToken' \
  --output text
```

Add the returned value as a DNS TXT record:
```
_amazonses.acme-corp.com  TXT  <verification-token>
```

Create SMTP credentials:
```bash
# SES SMTP credentials are derived from IAM — create a dedicated user
aws iam create-user --user-name opensign-${CLIENT}-ses

aws iam attach-user-policy \
  --user-name opensign-${CLIENT}-ses \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess

aws iam create-access-key --user-name opensign-${CLIENT}-ses
```

> **SES SMTP password** is NOT the IAM secret key. Convert it using the [SES SMTP credential generation script](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html) or the AWS Console → SES → SMTP Settings → Create SMTP Credentials.

> **SES sandbox:** New AWS accounts start in the SES sandbox (can only send to verified addresses). Request production access via AWS Console → SES → Account dashboard → Request production access. This takes 24–48 hours.

---

## Step 10 — Create the First Admin Account

```bash
curl -s -X POST https://sign.acme-corp.com/api/app/functions/usersignup \
  -H "X-Parse-Application-Id: acmecorp" \
  -H "Content-Type: application/json" \
  -d '{
    "userDetails": {
      "email": "admin@acme-corp.com",
      "password": "<strong-password>",
      "name": "Acme Admin",
      "role": "contracts_Admin",
      "company": "Acme Corp"
    }
  }'
```

---

## Backups

### Automated MongoDB backup to S3

On the EC2 instance, add to crontab (`crontab -e`):
```bash
0 2 * * * cd /home/ec2-user/ENKOpenSign && \
  docker exec mongo-container mongodump --archive 2>/dev/null | \
  gzip | aws s3 cp - s3/opensign-${CLIENT}-docs/backups/db-$(date +\%Y\%m\%d).gz
```

### EBS snapshot (weekly)

```bash
VOLUME_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
  --output text)

aws ec2 create-snapshot \
  --volume-id $VOLUME_ID \
  --description "opensign-${CLIENT} weekly backup" \
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=opensign-${CLIENT}-backup}]"
```

---

## Updating a Deployed Client

```bash
# On the EC2 instance
cd ~/ENKOpenSign
git pull origin client/<client-slug>
cd apps/OpenSign && npm run build && cd ../..
HOST_URL=https://sign.<client-domain>.com docker compose up --build -d
```

---

## Teardown (End of Contract)

```bash
# Terminate EC2
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# Release Elastic IP
aws ec2 release-address --allocation-id $ALLOC_ID

# Delete S3 bucket (first empty it)
aws s3 rm s3://opensign-${CLIENT}-docs --recursive
aws s3api delete-bucket --bucket opensign-${CLIENT}-docs

# Delete IAM users
aws iam detach-user-policy --user-name opensign-${CLIENT}-s3 \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam delete-access-key --user-name opensign-${CLIENT}-s3 \
  --access-key-id <key-id>
aws iam delete-user --user-name opensign-${CLIENT}-s3

# Delete security group (after instance is terminated)
aws ec2 delete-security-group --group-id $SG_ID

# Delete SSH key pair
aws ec2 delete-key-pair --key-name opensign-${CLIENT}
rm ~/.ssh/opensign-${CLIENT}.pem
```

---

## Security Checklist

- [ ] SSH key stored securely (`~/.ssh/opensign-<client>.pem`, chmod 600)
- [ ] Security group SSH restricted to your IP (not `0.0.0.0/0`) after first login
- [ ] `MASTER_KEY` is unique and strong (not the default)
- [ ] `APP_ID` is unique per client
- [ ] S3 bucket has public access blocked
- [ ] IAM users have minimum required permissions (not `AdministratorAccess`)
- [ ] SES production access requested (out of sandbox)
- [ ] MongoDB not exposed externally (no port 27017 in security group)
- [ ] Daily DB backups scheduled and tested
- [ ] `.env.prod` never committed to git

---

## Quick Reference — Per-Client Variables

| Variable | Example |
|---|---|
| `CLIENT` | `acme-corp` |
| Key pair | `opensign-acme-corp` |
| Security group | `opensign-acme-corp-sg` |
| S3 bucket | `opensign-acme-corp-docs` |
| IAM S3 user | `opensign-acme-corp-s3` |
| IAM SES user | `opensign-acme-corp-ses` |
| EC2 Name tag | `opensign-acme-corp` |
| MongoDB DB | `AcmeCorpDB` |
| `APP_ID` | `acmecorp` |
