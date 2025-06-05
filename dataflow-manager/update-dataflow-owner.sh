#!/usr/bin/env bash
#
#  update-dataflow-owner.sh  —  Reassign a Dataflow owner (macOS / Linux)
#
#  Prereqs:
#    • Azure CLI ≥ 2.42  (brew install azure-cli)
#    • jq                (brew install jq)
#    • You are at least an Entra ID App Admin (or have an admin perform the Azure AD changes)
#
#  AZURE AD APP REGISTRATION SETUP (using existing Power Tools App)
#  --------------------------------------------------------------
#  The script will use the existing Azure AD App Registration configured for Power Tools backend.
#  Client ID: 05aec6ff-18da-42b1-8261-ce4d99fdaf30
#  Tenant ID: cee4a410-821e-4b7e-992d-ec3bc2d33292
#
#  One-time steps to ensure this app has permissions for Power Query API:
#  (To be performed by an Azure AD Administrator)
#
#  1.  az login --tenant cee4a410-821e-4b7e-992d-ec3bc2d33292
#
#  2.  # Ensure the Power Query Online Service Principal exists in the tenant:
#      az ad sp show --id f3b07414-6bf4-46e6-b63f-56941f3f4128 > /dev/null 2>&1 || az ad sp create --id f3b07414-6bf4-46e6-b63f-56941f3f4128
#
#  3.  # Add Power Query API 'user_impersonation' permission to the existing Power Tools App:
#      # App (Client) ID: 05aec6ff-18da-42b1-8261-ce4d99fdaf30
#      # Power Query Online API App ID: f3b07414-6bf4-46e6-b63f-56941f3f4128
#      # Permission ID for 'user_impersonation': 29f9ed98-31e4-4790-9418-bb11f7f1eb34
#      az ad app permission add \
#        --id 05aec6ff-18da-42b1-8261-ce4d99fdaf30 \
#        --api f3b07414-6bf4-46e6-b63f-56941f3f4128 \
#        --api-permissions 29f9ed98-31e4-4790-9418-bb11f7f1eb34=Scope
#
#  4.  # Grant admin consent for the newly added permission:
#      # This can be done via Azure Portal (App Registrations -> Power Tools App -> API Permissions -> Grant admin consent)
#      # Or attempt via CLI (requires appropriate admin roles):
#      az ad app permission grant --id 05aec6ff-18da-42b1-8261-ce4d99fdaf30 --api f3b07414-6bf4-46e6-b63f-56941f3f4128
#  --------------------------------------------------------------

# ---------------- EDIT THESE VALUES ---------------------------
TENANT_ID="cee4a410-821e-4b7e-992d-ec3bc2d33292"            # Power Tools Azure AD Tenant ID
CLIENT_ID="05aec6ff-18da-42b1-8261-ce4d99fdaf30"            # Power Tools Azure AD App Client ID
ENV_ID="2907c6d4-b9fc-ee08-b734-b0cb22538609"
DATAFLOW_ID="a360b24b-5245-4f60-bb17-acb0b78fcd73"
NEW_OWNER_ID="de2cb672-db17-4cfb-aa79-54d825ef0823"
OLD_OWNER_ID="810c9a57-7ccd-40a1-8638-f90dca28507c"
NEW_OWNER_NAME="Stephanie Wymore"
REGION="us"                                       # us | europe | canada | etc.
# --------------------------------------------------------------

set -euo pipefail

echo "🔑 Requesting Power Query API token for the logged-in user..."
ACCESS_TOKEN=$(az account get-access-token \
                 --tenant "$TENANT_ID" \
                 --scope "https://powerquery.microsoft.com/user_impersonation" \
                 --query accessToken -o tsv)

[[ -z "$ACCESS_TOKEN" ]] && { echo "❌  No token returned. Ensure you are logged in with 'az login --tenant $TENANT_ID' and have necessary permissions."; exit 1; }
echo "✅  Token obtained."

API="https://${REGION}.prod.powerquery.microsoft.com/api/dataflow/group/${ENV_ID}/dataflow/${DATAFLOW_ID}/update-owner"
BODY=$(jq -n \
        --arg nn "$NEW_OWNER_NAME" \
        --arg nu "$NEW_OWNER_ID" \
        --arg ou "$OLD_OWNER_ID" \
        '{newOwnerName:$nn,newOwnerUserId:$nu,previousOwnerUserId:$ou}')

echo "🚚  Calling update-owner endpoint…"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API" \
              -H "Authorization: Bearer $ACCESS_TOKEN" \
              -H "Content-Type: application/json" \
              -d "$BODY")

if [[ "$HTTP_CODE" == "204" ]]; then
  echo "🎉  Success! Dataflow now owned by $NEW_OWNER_NAME"
else
  echo "⚠️  HTTP $HTTP_CODE — check token scopes, IDs and region."
fi