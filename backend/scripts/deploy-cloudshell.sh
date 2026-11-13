#!/usr/bin/env bash
# Deploy the PhishGuard Lite backend from AWS CloudShell. Never prints secret values.
#
#   bash scripts/deploy-cloudshell.sh                 test, back up, deploy, smoke-test
#   bash scripts/deploy-cloudshell.sh set NAME        set one setting; you are asked for the value
#                                                     (hidden input). NAME is one of:
#                                                     STRIPE_WEBHOOK_SECRET  MAIL_FROM  EXTENSION_URL
#   bash scripts/deploy-cloudshell.sh rollback FILE   put a backup zip back
set -euo pipefail

BASE_URL="${BASE_URL:-https://phishguard.cyphersway.com}"
RUNTIME="python3.13"
TOKEN_PARAM="/phishguard/admin-token"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

FN="${FN:-$(aws lambda list-functions --query 'Functions[?contains(FunctionName,`phishguard-lite`)].FunctionName|[0]' --output text)}"
[ -n "$FN" ] && [ "$FN" != "None" ] || { echo "Could not find the PhishGuard Lambda function"; exit 1; }
echo "Function: $FN"

wait_ready() { aws lambda wait function-updated --function-name "$FN"; }
current_env() { aws lambda get-function-configuration --function-name "$FN" --query 'Environment.Variables' --output json; }
put_env() { # $1 = JSON object of all variables
  aws lambda update-function-configuration --function-name "$FN" --environment "{\"Variables\":$1}" >/dev/null
  wait_ready
}
code() { curl -s -o /dev/null -m 30 -w '%{http_code}' "$@"; }

case "${1:-deploy}" in
set)
  NAME="${2:?setting name}"
  case "$NAME" in STRIPE_WEBHOOK_SECRET|MAIL_FROM|EXTENSION_URL|SUPPORT_EMAIL) ;; *) echo "Unknown setting $NAME"; exit 1;; esac
  read -r -s -p "Value for $NAME (input hidden): " VALUE; echo
  [ -n "$VALUE" ] || { echo "Empty value, nothing changed"; exit 1; }
  put_env "$(current_env | jq -c --arg k "$NAME" --arg v "$VALUE" '. + {($k):$v}')"
  echo "$NAME saved."
  exit 0;;
rollback)
  FILE="${2:?backup zip}"
  aws lambda update-function-configuration --function-name "$FN" --runtime "${OLD_RUNTIME:-python3.9}" >/dev/null; wait_ready
  aws lambda update-function-code --function-name "$FN" --zip-file "fileb://$FILE" >/dev/null; wait_ready
  echo "Rolled back to $FILE"
  exit 0;;
deploy) ;;
*) echo "Unknown command"; exit 1;;
esac

WORK="$(mktemp -d)"
cd "$HERE"

echo "1/6 Running tests against real FastAPI..."
python3 -m venv "$WORK/venv"
"$WORK/venv/bin/pip" -q install -r requirements.txt pytest httpx
"$WORK/venv/bin/python" -m pytest -q tests

echo "2/6 Building the package..."
python3 -m pip -q install -r requirements.txt -t "$WORK/pkg"
cp app.py billing.py security.py storage.py tenants.py admin-dashboard.html "$WORK/pkg/"
(cd "$WORK/pkg" && zip -q -r "$WORK/new.zip" . -x '*__pycache__*')
echo "    package size: $(du -h "$WORK/new.zip" | cut -f1)"

echo "3/6 Backing up the code that is live now..."
BACKUP="$HOME/phishguard-backup-$(date +%Y%m%d-%H%M%S).zip"
curl -s -o "$BACKUP" "$(aws lambda get-function --function-name "$FN" --query 'Code.Location' --output text)"
OLD_RUNTIME="$(aws lambda get-function-configuration --function-name "$FN" --query Runtime --output text)"
echo "    saved $BACKUP (runtime was $OLD_RUNTIME)"

echo "4/6 Settings and permissions..."
ENVJSON="$(current_env)"
if [ "$(jq -r '.ADMIN_TOKEN // "" | length' <<<"$ENVJSON")" -lt 16 ]; then
  TOKEN="$(openssl rand -hex 24)"
  aws ssm put-parameter --name "$TOKEN_PARAM" --type SecureString --overwrite --value "$TOKEN" >/dev/null
  ENVJSON="$(jq -c --arg t "$TOKEN" '. + {ADMIN_TOKEN:$t}' <<<"$ENVJSON")"
  echo "    new admin token created and stored in Parameter Store: $TOKEN_PARAM"
else
  TOKEN="$(jq -r '.ADMIN_TOKEN' <<<"$ENVJSON")"
  echo "    existing admin token kept"
fi
ROLE="$(aws lambda get-function-configuration --function-name "$FN" --query Role --output text | sed 's|.*/||')"
aws iam put-role-policy --role-name "$ROLE" --policy-name PhishGuardSendEmail \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"ses:SendEmail","Resource":"*"}]}'

echo "5/6 Deploying..."
aws lambda update-function-configuration --function-name "$FN" --runtime "$RUNTIME" --memory-size 256 \
  --environment "{\"Variables\":$ENVJSON}" >/dev/null
wait_ready
aws lambda update-function-code --function-name "$FN" --zip-file "fileb://$WORK/new.zip" >/dev/null
wait_ready

echo "6/6 Checking the live API..."
sleep 3
H="$(code "$BASE_URL/health")"
if [ "$H" != "200" ]; then
  echo "    /health returned $H: rolling back"
  OLD_RUNTIME="$OLD_RUNTIME" bash "$0" rollback "$BACKUP"
  exit 1
fi
A="$(code "$BASE_URL/admin/api/reports/summary")"
B="$(code -H "Authorization: Bearer $TOKEN" "$BASE_URL/admin/api/reports/summary")"
C="$(code -H "Authorization: Bearer $TOKEN" "$BASE_URL/admin/api/tenants")"
R="$(code -X POST -H 'Content-Type: application/json' -d '{"url":"https://example.com/","tenantKey":"not-a-real-key"}' "$BASE_URL/report")"
W="$(code -X POST -d '{}' "$BASE_URL/stripe/webhook")"
D="$(code "$BASE_URL/admin-dashboard.html")"
echo "    health=$H  admin-without-token=$A (want 401)  admin-with-token=$B (want 200)  customers=$C (want 200)"
echo "    report-with-bad-key=$R (want 401)  webhook-unsigned=$W (want 400 or 503)  dashboard=$D (want 200)"
[ "$A" = "401" ] && [ "$B" = "200" ] && [ "$C" = "200" ] && [ "$R" = "401" ] && echo "DEPLOY OK" || { echo "DEPLOY NEEDS ATTENTION (backup: $BACKUP)"; exit 1; }
