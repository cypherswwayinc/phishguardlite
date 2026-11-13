#!/usr/bin/env bash
# One-time infrastructure fixes, run from AWS CloudShell. Safe to run again. Prints no secrets.
#  1. Point the function at the real reports bucket and let it read/write there.
#  2. Make CloudFront pass request headers (Authorization, Stripe-Signature) and query strings
#     through to the API, and stop caching API responses.
#  3. Re-check the live API.
set -euo pipefail
DOMAIN="${DOMAIN:-phishguard.cyphersway.com}"
BASE_URL="https://$DOMAIN"
REGION="${AWS_REGION:-us-east-1}"
FN="$(aws lambda list-functions --query 'Functions[?contains(FunctionName,`phishguard-lite`)].FunctionName|[0]' --output text)"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${BUCKET:-pg-reports-$ACCOUNT-$REGION}"
code() { curl -s -o /dev/null -m 30 -w '%{http_code}' "$@"; }

echo "1/3 Reports bucket: $BUCKET"
aws s3api head-bucket --bucket "$BUCKET"
ENVJSON="$(aws lambda get-function-configuration --function-name "$FN" --query 'Environment.Variables' --output json | jq -c --arg b "$BUCKET" '. + {REPORTS_BUCKET:$b}')"
aws lambda update-function-configuration --function-name "$FN" --environment "{\"Variables\":$ENVJSON}" >/dev/null
aws lambda wait function-updated --function-name "$FN"
ROLE="$(aws lambda get-function-configuration --function-name "$FN" --query Role --output text | sed 's|.*/||')"
aws iam put-role-policy --role-name "$ROLE" --policy-name PhishGuardReportsBucket --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::$BUCKET/*\"},{\"Effect\":\"Allow\",\"Action\":\"s3:ListBucket\",\"Resource\":\"arn:aws:s3:::$BUCKET\"}]}"

echo "2/3 CloudFront header forwarding"
DIST="$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]=='$DOMAIN'].Id|[0]" --output text)"
CFG="$HOME/cloudfront-backup-$DIST-$(date +%Y%m%d-%H%M%S).json"
aws cloudfront get-distribution-config --id "$DIST" > "$CFG"
if [ "$(jq -r '.DistributionConfig.DefaultCacheBehavior.OriginRequestPolicyId // ""' "$CFG")" = "b689b0a8-53d0-40ab-baf2-68738e2966ac" ]; then
  echo "    already set"
else
  # AWS managed policies: CachingDisabled + AllViewerExceptHostHeader
  jq '.DistributionConfig | .DefaultCacheBehavior |= (del(.ForwardedValues,.MinTTL,.DefaultTTL,.MaxTTL) + {CachePolicyId:"4135ea2d-6df8-44a3-9df3-4b5a84be39ad",OriginRequestPolicyId:"b689b0a8-53d0-40ab-baf2-68738e2966ac"})' "$CFG" > /tmp/cf-new.json
  aws cloudfront update-distribution --id "$DIST" --if-match "$(jq -r .ETag "$CFG")" --distribution-config file:///tmp/cf-new.json >/dev/null
  echo "    updated (previous settings saved in $CFG); waiting for CloudFront, this takes a few minutes..."
  aws cloudfront wait distribution-deployed --id "$DIST"
fi

echo "3/3 Checking the live API"
TOKEN="$(aws ssm get-parameter --name /phishguard/admin-token --with-decryption --query Parameter.Value --output text)"
H="$(code "$BASE_URL/health")"
A="$(code "$BASE_URL/admin/api/reports/summary")"
B="$(code -H "Authorization: Bearer $TOKEN" "$BASE_URL/admin/api/reports/summary")"
C="$(code -H "Authorization: Bearer $TOKEN" "$BASE_URL/admin/api/tenants")"
R="$(code -X POST -H 'Content-Type: application/json' -d '{"url":"https://example.com/","tenantKey":"not-a-real-key"}' "$BASE_URL/report")"
W="$(code -X POST -H 'Stripe-Signature: t=1,v1=bad' -d '{}' "$BASE_URL/stripe/webhook")"
echo "    health=$H  admin-without-token=$A (want 401)  admin-with-token=$B (want 200)  customers=$C (want 200)"
echo "    report-with-bad-key=$R (want 401)  webhook-bad-signature=$W (want 503 until the Stripe secret is set, then 400)"
[ "$H" = "200" ] && [ "$A" = "401" ] && [ "$B" = "200" ] && [ "$C" = "200" ] && [ "$R" = "401" ] && echo "ALL GOOD" || { echo "NEEDS ATTENTION"; exit 1; }
