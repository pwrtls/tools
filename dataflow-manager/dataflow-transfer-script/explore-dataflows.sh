#!/bin/bash

echo "Exploring Dataverse dataflows entity..."

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
echo "Exploring msdyn_dataflows entity..."

# Dataverse API base URL for KeHE
DATAVERSE_URL="https://kehe.crm.dynamics.com/api/data/v9.2"

echo "1. Getting entity metadata for msdyn_dataflows..."
curl -s \
    "$DATAVERSE_URL/EntityDefinitions(LogicalName='msdyn_dataflows')/Attributes?\$select=LogicalName,DisplayName&\$top=20" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq '.value[] | {LogicalName, DisplayName: .DisplayName.UserLocalizedLabel.Label}'

echo ""
echo "2. Getting a sample dataflow record..."
curl -s \
    "$DATAVERSE_URL/msdyn_dataflows?\$top=1" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq .

echo ""
echo "3. Getting dataflows with specific fields..."
curl -s \
    "$DATAVERSE_URL/msdyn_dataflows?\$select=msdyn_dataflowid,msdyn_name,_ownerid_value,_createdby_value,_modifiedby_value,createdon,modifiedon&\$top=5" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq .

echo ""
echo "4. Looking for a specific dataflow ID we know exists: 27516c19-ea1f-4416-bd03-54cb90ee080d"
curl -s \
    "$DATAVERSE_URL/msdyn_dataflows?\$filter=msdyn_dataflowid eq '27516c19-ea1f-4416-bd03-54cb90ee080d'&\$select=msdyn_dataflowid,msdyn_name,_ownerid_value,_createdby_value" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq .

echo ""
echo "5. If that doesn't work, let's try searching by name or other ID fields..."
curl -s \
    "$DATAVERSE_URL/msdyn_dataflows?\$filter=contains(msdyn_name,'27516c19') or contains(msdyn_dataflowid,'27516c19')&\$select=msdyn_dataflowid,msdyn_name,_ownerid_value" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" | jq . 