#!/bin/bash

echo "Exploring Dataverse SystemUser entity to find Azure Object ID mapping..."

# Get a fresh token first
echo "Getting authentication token..."
TENANT_ID="082722e4-dbdf-4801-b74f-274a5921d5ec"
CLIENT_ID="05aec6ff-18da-42b1-8261-ce4d99fdaf30"

# Start device code flow
DEVICE_CODE_RESPONSE=$(curl -s -X POST \
    "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/devicecode" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$CLIENT_ID&scope=https://kehe.crm.dynamics.com/.default")

DEVICE_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.device_code')
USER_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.user_code')
VERIFICATION_URI=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.verification_uri')

echo "Please visit: $VERIFICATION_URI"
echo "Enter code: $USER_CODE"
echo "Press Enter after completing authentication..."
read

# Poll for token
for i in {1..30}; do
    TOKEN_RESPONSE=$(curl -s -X POST \
        "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=$CLIENT_ID&device_code=$DEVICE_CODE")
    
    ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')
    
    if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
        echo "Authentication successful!"
        break
    fi
    
    echo "Waiting... (attempt $i/30)"
    sleep 2
done

if [ "$ACCESS_TOKEN" = "null" ] || [ "$ACCESS_TOKEN" = "" ]; then
    echo "Authentication failed"
    exit 1
fi

echo ""
echo "Exploring SystemUser entity..."

# Dataverse API base URL for KeHE
DATAVERSE_URL="https://kehe.crm.dynamics.com/api/data/v9.2"

echo "1. Getting SystemUser entity metadata (looking for Azure Object ID field)..."
curl -s \
    "$DATAVERSE_URL/EntityDefinitions(LogicalName='systemuser')/Attributes?\$select=LogicalName,DisplayName&\$filter=contains(LogicalName,'azure') or contains(LogicalName,'object') or contains(LogicalName,'aad') or contains(LogicalName,'guid')" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq '.value[] | {LogicalName, DisplayName: .DisplayName.UserLocalizedLabel.Label}'

echo ""
echo "2. Getting a sample SystemUser record with all potential ID fields..."
curl -s \
    "$DATAVERSE_URL/systemusers?\$select=systemuserid,fullname,domainname,azureactivedirectoryobjectid,internalemailaddress&\$top=3" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq .

echo ""
echo "3. Looking for specific users we know..."
# Known Azure Object IDs from our previous work
KNOWN_AZURE_IDS=("810c9a57-7ccd-40a1-8638-f90dca28507c" "de2cb672-db17-4cfb-aa79-54d825ef0823" "2842494b-2ac3-4151-8211-02555a3ca4fb")

for azure_id in "${KNOWN_AZURE_IDS[@]}"; do
    echo "Searching for Azure Object ID: $azure_id"
    curl -s \
        "$DATAVERSE_URL/systemusers?\$filter=azureactivedirectoryobjectid eq '$azure_id'&\$select=systemuserid,fullname,azureactivedirectoryobjectid,domainname" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Accept: application/json" | jq .
    echo ""
done

echo "4. Let's also check what owner IDs we have in our dataflows..."
curl -s \
    "$DATAVERSE_URL/msdyn_dataflows?\$select=msdyn_name,_ownerid_value&\$top=5" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq -r '.value[] | "Dataflow: \(.msdyn_name // "N/A") | Owner ID: \(._ownerid_value // "N/A")"'

echo ""
echo "5. And let's map those owner IDs to system users..."
OWNER_IDS=$(curl -s \
    "$DATAVERSE_URL/msdyn_dataflows?\$select=_ownerid_value&\$top=10" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq -r '.value[]._ownerid_value // empty' | sort | uniq)

echo "Unique owner IDs found in dataflows:"
for owner_id in $OWNER_IDS; do
    echo "System User ID: $owner_id"
    curl -s \
        "$DATAVERSE_URL/systemusers($owner_id)?\$select=systemuserid,fullname,azureactivedirectoryobjectid,domainname" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Accept: application/json" | jq .
    echo ""
done 