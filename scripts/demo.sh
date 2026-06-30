#!/usr/bin/env bash
# Manage the ClientDemo AWS EC2 instance
# Usage: ./scripts/demo.sh [start|stop|status]

set -euo pipefail

INSTANCE_ID="i-0bd2e6ab50d90810a"
REGION="af-south-1"
HOST_URL="https://15.240.112.116.nip.io"
MAILDEV_URL="http://15.240.112.116:1080"

_ssm() {
  local cmd="$1"
  local cmd_id
  cmd_id=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$cmd\"]" \
    --query 'Command.CommandId' --output text \
    --region "$REGION")
  sleep 8
  aws ssm get-command-invocation \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'StandardOutputContent' --output text
}

_instance_state() {
  aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text \
    --region "$REGION"
}

_wait_for_state() {
  local target="$1"
  echo -n "Waiting for instance to be $target"
  while true; do
    local state
    state=$(_instance_state)
    if [[ "$state" == "$target" ]]; then
      echo " done."
      break
    fi
    echo -n "."
    sleep 5
  done
}

_wait_for_ssm() {
  echo -n "Waiting for SSM agent"
  while true; do
    local ping
    ping=$(aws ssm describe-instance-information \
      --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
      --query 'InstanceInformationList[0].PingStatus' \
      --output text --region "$REGION" 2>/dev/null || echo "None")
    if [[ "$ping" == "Online" ]]; then
      echo " ready."
      break
    fi
    echo -n "."
    sleep 5
  done
}

cmd="${1:-status}"

case "$cmd" in
  start)
    state=$(_instance_state)
    if [[ "$state" == "running" ]]; then
      echo "Instance is already running."
    else
      echo "Starting instance $INSTANCE_ID..."
      aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$REGION" > /dev/null
      _wait_for_state "running"
      _wait_for_ssm
    fi

    echo "Starting Docker containers..."
    _ssm "cd /home/ec2-user/ENKOpenSign && HOST_URL=$HOST_URL docker compose up -d 2>&1 | tail -10"

    echo ""
    echo "ClientDemo is up:"
    echo "  App:     $HOST_URL"
    echo "  MailDev: $MAILDEV_URL"
    ;;

  stop)
    state=$(_instance_state)
    if [[ "$state" == "stopped" ]]; then
      echo "Instance is already stopped."
      exit 0
    fi

    echo "Stopping Docker containers..."
    _ssm "cd /home/ec2-user/ENKOpenSign && docker compose down 2>&1 | tail -5" || true

    echo "Stopping instance $INSTANCE_ID..."
    aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --region "$REGION" > /dev/null
    _wait_for_state "stopped"

    echo ""
    echo "Instance stopped. Data (MongoDB + uploaded files) is preserved on EBS."
    echo "Run './scripts/demo.sh start' to bring it back up."
    ;;

  status)
    state=$(_instance_state)
    echo "Instance state: $state"

    if [[ "$state" == "running" ]]; then
      ping=$(aws ssm describe-instance-information \
        --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
        --query 'InstanceInformationList[0].PingStatus' \
        --output text --region "$REGION" 2>/dev/null || echo "Unknown")
      echo "SSM agent:      $ping"

      if [[ "$ping" == "Online" ]]; then
        echo ""
        echo "Containers:"
        _ssm "docker ps --format '  {{.Names}}\t{{.Status}}'"
        echo ""
        echo "  App:     $HOST_URL"
        echo "  MailDev: $MAILDEV_URL"
      fi
    fi
    ;;

  *)
    echo "Usage: $0 [start|stop|status]"
    exit 1
    ;;
esac
