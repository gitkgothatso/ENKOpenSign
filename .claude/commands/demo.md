# Demo Instance Manager

Manage the ClientDemo AWS EC2 instance (i-0bd2e6ab50d90810a, af-south-1).

Run the appropriate action based on the user's request:

## start
1. Run `scripts/demo.sh start` via Bash
2. Report the app URL and MailDev URL once containers are confirmed up

## stop
1. Run `scripts/demo.sh stop` via Bash
2. Confirm the instance is stopped and note that data is preserved on the EBS volume

## status
1. Run `scripts/demo.sh status` via Bash
2. Report instance state and which containers are running

If the user just says `/demo` with no argument, run status first and suggest what action to take.
