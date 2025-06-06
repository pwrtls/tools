#!/bin/bash

# Dataflow Ownership Transfer Script
# This script authenticates with Azure AD and transfers Power Query dataflow ownership

set -e

# Configuration
TENANT_ID="082722e4-dbdf-4801-b74f-274a5921d5ec"
CLIENT_ID="05aec6ff-18da-42b1-8261-ce4d99fdaf30"
ENVIRONMENT_ID="2907c6d4-b9fc-ee08-b734-b0cb22538609"
POWER_QUERY_API_BASE="https://us.prod.powerquery.microsoft.com/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Power Query Dataflow Ownership Transfer Script ===${NC}"
echo ""

# Function to get access token using device code flow
get_access_token() {
    echo "DEBUG: Inside get_access_token function..."
    echo -e "${YELLOW}Starting Azure AD authentication...${NC}"
    
    echo "DEBUG: About to make curl request..."
    # Start device code flow (silent to avoid progress indicators interfering with output)
    DEVICE_CODE_RESPONSE=$(curl -s -X POST \
        "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/devicecode" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=$CLIENT_ID&scope=https://powerquery.microsoft.com/user_impersonation")
    
    echo "DEBUG: curl request completed, parsing response..."
    DEVICE_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.device_code')
    USER_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.user_code')
    VERIFICATION_URI=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.verification_uri')
    
    echo "DEBUG: Response parsed, checking validity..."
    if [ "$DEVICE_CODE" = "null" ] || [ "$USER_CODE" = "null" ]; then
        echo -e "${RED}Failed to get device code. Response:${NC}"
        echo "$DEVICE_CODE_RESPONSE"
        exit 1
    fi
    
    echo "DEBUG: All good, displaying authentication info..."
    echo ""
    echo -e "${GREEN}=== AUTHENTICATION REQUIRED ===${NC}"
    echo -e "${GREEN}Please visit: $VERIFICATION_URI${NC}"
    echo -e "${GREEN}Enter code: $USER_CODE${NC}"
    echo -e "${GREEN}===============================${NC}"
    echo ""
    echo "Press Enter after completing authentication in your browser..."
    read
    
    # Poll for token
    echo -e "${YELLOW}Waiting for authentication...${NC}"
    for i in {1..30}; do
        TOKEN_RESPONSE=$(curl -s -X POST \
            "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=$CLIENT_ID&device_code=$DEVICE_CODE")
        
        ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')
        
        if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
            echo -e "${GREEN}Authentication successful!${NC}"
            # Store token in global variable instead of echoing it
            GLOBAL_ACCESS_TOKEN="$ACCESS_TOKEN"
            return 0
        fi
        
        echo "Waiting for authentication... (attempt $i/30)"
        sleep 2
    done
    
    echo -e "${RED}Authentication timed out${NC}"
    exit 1
}

# Function to list dataflows for a specific owner
list_dataflows_for_owner() {
    local token=$1
    local owner_id=$2
    
    echo -e "${YELLOW}Fetching dataflows for owner: $owner_id${NC}"
    
    DATAFLOWS_RESPONSE=$(curl -s -X GET \
        "$POWER_QUERY_API_BASE/dataflow/group/$ENVIRONMENT_ID/dataflows" \
        -H "Authorization: Bearer $token" \
        -H "Accept: application/json")
    
    # Filter dataflows by owner and display them
    echo $DATAFLOWS_RESPONSE | jq -r --arg owner_id "$owner_id" '
        .value[] | 
        select(.properties.owner.userObjectId == $owner_id) | 
        "ID: \(.id) | Name: \(.properties.name) | Owner: \(.properties.owner.displayName)"
    '
}

# Function to transfer dataflow ownership
transfer_dataflow_ownership() {
    local token=$1
    local dataflow_id=$2
    local current_owner_id=$3
    local new_owner_id=$4
    local new_owner_name=$5
    
    echo -e "${YELLOW}Transferring dataflow $dataflow_id ownership...${NC}"
    echo "From: $current_owner_id"
    echo "To: $new_owner_id ($new_owner_name)"
    
    TRANSFER_PAYLOAD=$(cat <<EOF
{
    "newOwnerName": "$new_owner_name",
    "newOwnerUserId": "$new_owner_id",
    "previousOwnerUserId": "$current_owner_id"
}
EOF
)
    
    TRANSFER_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
        "$POWER_QUERY_API_BASE/dataflow/group/$ENVIRONMENT_ID/dataflow/$dataflow_id/update-owner" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$TRANSFER_PAYLOAD")
    
    HTTP_CODE="${TRANSFER_RESPONSE: -3}"
    RESPONSE_BODY="${TRANSFER_RESPONSE%???}"
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        echo -e "${GREEN}✓ Successfully transferred ownership${NC}"
        return 0
    else
        echo -e "${RED}✗ Transfer failed with HTTP $HTTP_CODE${NC}"
        echo "Response: $RESPONSE_BODY"
        return 1
    fi
}

# Main script execution
main() {
    echo "DEBUG: Starting dependency check..."
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed${NC}"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    echo "DEBUG: Dependencies OK, starting authentication..."
    # Get access token (no output capture, function sets global variable)
    get_access_token
    ACCESS_TOKEN="$GLOBAL_ACCESS_TOKEN"
    
    echo "DEBUG: Authentication completed, continuing with script..."
    # Get current owner ID
    echo ""
    echo -e "${BLUE}Enter the Azure AD Object ID of the current dataflow owner:${NC}"
    read -p "Current Owner ID: " CURRENT_OWNER_ID
    
    if [ -z "$CURRENT_OWNER_ID" ]; then
        echo -e "${RED}Error: Current owner ID is required${NC}"
        exit 1
    fi
    
    # List dataflows for the owner
    echo ""
    echo -e "${BLUE}Dataflows owned by $CURRENT_OWNER_ID:${NC}"
    DATAFLOW_LIST=$(list_dataflows_for_owner "$ACCESS_TOKEN" "$CURRENT_OWNER_ID")
    
    if [ -z "$DATAFLOW_LIST" ]; then
        echo -e "${YELLOW}No dataflows found for this owner${NC}"
        exit 0
    fi
    
    echo "$DATAFLOW_LIST"
    echo ""
    
    # Get dataflow to transfer
    echo -e "${BLUE}Enter the Dataflow ID to transfer:${NC}"
    read -p "Dataflow ID: " DATAFLOW_ID
    
    if [ -z "$DATAFLOW_ID" ]; then
        echo -e "${RED}Error: Dataflow ID is required${NC}"
        exit 1
    fi
    
    # Get new owner details
    echo ""
    echo -e "${BLUE}Enter new owner details:${NC}"
    read -p "New Owner Azure AD Object ID: " NEW_OWNER_ID
    read -p "New Owner Display Name: " NEW_OWNER_NAME
    
    if [ -z "$NEW_OWNER_ID" ] || [ -z "$NEW_OWNER_NAME" ]; then
        echo -e "${RED}Error: New owner ID and name are required${NC}"
        exit 1
    fi
    
    # Confirm transfer
    echo ""
    echo -e "${YELLOW}About to transfer ownership:${NC}"
    echo "Dataflow ID: $DATAFLOW_ID"
    echo "From: $CURRENT_OWNER_ID"
    echo "To: $NEW_OWNER_ID ($NEW_OWNER_NAME)"
    echo ""
    read -p "Continue? (y/N): " CONFIRM
    
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Transfer cancelled"
        exit 0
    fi
    
    # Perform transfer
    echo ""
    if transfer_dataflow_ownership "$ACCESS_TOKEN" "$DATAFLOW_ID" "$CURRENT_OWNER_ID" "$NEW_OWNER_ID" "$NEW_OWNER_NAME"; then
        echo -e "${GREEN}Transfer completed successfully!${NC}"
    else
        echo -e "${RED}Transfer failed${NC}"
        exit 1
    fi
}

# Run the main function
main "$@" 