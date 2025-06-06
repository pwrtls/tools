#!/bin/bash

# ==============================================================================
# Unified Power Query Dataflow Ownership Transfer Script (v6 - Fixed)
# ==============================================================================
# This script provides a complete solution for transferring dataflow ownership
# by combining the proven patterns from the working individual scripts.
# ==============================================================================

set -e

# --- Configuration ---
TENANT_ID="082722e4-dbdf-4801-b74f-274a5921d5ec"
CLIENT_ID="05aec6ff-18da-42b1-8261-ce4d99fdaf30"
DATAVERSE_URL="https://kehe.crm.dynamics.com/api/data/v9.2"
POWER_QUERY_API_BASE="https://us.prod.powerquery.microsoft.com/api"
ENVIRONMENT_ID="2907c6d4-b9fc-ee08-b734-b0cb22538609"

# --- Colors for Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Global Variables ---
DATAVERSE_TOKEN=""
POWERQUERY_TOKEN=""

echo -e "${BLUE}=== Unified Power Query Dataflow Ownership Transfer Script ===${NC}"

# --- Authentication Functions (using exact patterns from working scripts) ---

# Get Dataverse token (using exact pattern from explore-dataflows.sh)
get_dataverse_token() {
    echo -e "${YELLOW}Getting Dataverse authentication token...${NC}"
    
    # Start device code flow
    DEVICE_CODE_RESPONSE=$(curl -s -X POST \
        "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/devicecode" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=$CLIENT_ID&scope=https://kehe.crm.dynamics.com/.default")

    DEVICE_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.device_code')
    USER_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.user_code')
    VERIFICATION_URI=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.verification_uri')

    if [ "$DEVICE_CODE" = "null" ] || [ "$USER_CODE" = "null" ]; then
        echo -e "${RED}Failed to get device code for Dataverse${NC}"
        echo "$DEVICE_CODE_RESPONSE"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}=== DATAVERSE AUTHENTICATION REQUIRED ===${NC}"
    echo -e "${GREEN}Please visit: $VERIFICATION_URI${NC}"
    echo -e "${GREEN}Enter code: $USER_CODE${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
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
            echo -e "${GREEN}Dataverse authentication successful!${NC}"
            DATAVERSE_TOKEN="$ACCESS_TOKEN"
            return 0
        fi
        
        echo "Waiting... (attempt $i/30)"
        sleep 2
    done

    echo -e "${RED}Dataverse authentication failed${NC}"
    exit 1
}

# Get Power Query token (using exact pattern from transfer-dataflows.sh)
get_powerquery_token() {
    echo -e "${YELLOW}Getting Power Query authentication token...${NC}"
    
    # Start device code flow
    DEVICE_CODE_RESPONSE=$(curl -s -X POST \
        "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/devicecode" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=$CLIENT_ID&scope=https://powerquery.microsoft.com/user_impersonation")
    
    DEVICE_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.device_code')
    USER_CODE=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.user_code')
    VERIFICATION_URI=$(echo "$DEVICE_CODE_RESPONSE" | jq -r '.verification_uri')
    
    if [ "$DEVICE_CODE" = "null" ] || [ "$USER_CODE" = "null" ]; then
        echo -e "${RED}Failed to get device code for Power Query${NC}"
        echo "$DEVICE_CODE_RESPONSE"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}=== POWER QUERY AUTHENTICATION REQUIRED ===${NC}"
    echo -e "${GREEN}Please visit: $VERIFICATION_URI${NC}"
    echo -e "${GREEN}Enter code: $USER_CODE${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo ""
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
            echo -e "${GREEN}Power Query authentication successful!${NC}"
            POWERQUERY_TOKEN="$ACCESS_TOKEN"
            return 0
        fi
        
        echo "Waiting for authentication... (attempt $i/30)"
        sleep 2
    done

    echo -e "${RED}Power Query authentication timed out${NC}"
    exit 1
}

# --- Data Query Functions ---

# Get user details by email - search through all users since $filter doesn't work reliably
get_user_by_email() {
    local email=$1
    echo -e "${YELLOW}Looking up user by email: $email${NC}" >&2
    
    echo "DEBUG: Fetching user from Dataverse using filter..." >&2
    
    # URL encode function for GET parameters
    url_encode() {
        local string="$1"
        printf '%s' "$string" | jq -sRr @uri
}

    # Build the base URL and parameters
    local base_url="$DATAVERSE_URL/systemusers"
    local select_param=$(url_encode "systemuserid,fullname,azureactivedirectoryobjectid,domainname")
    local filter_value=$(url_encode "domainname eq '$email'")
    
    # Build the complete URL for GET request
    local request_url="$base_url?\$select=$select_param&\$filter=$filter_value"
    
    echo "DEBUG: Request URL: $request_url" >&2
    
    local user_response
    user_response=$(curl -s \
        "$request_url" \
        -H "Authorization: Bearer $DATAVERSE_TOKEN" \
        -H "Accept: application/json")
    
    echo "DEBUG: Raw response: $user_response" >&2
    
    if ! echo "$user_response" | jq -e '.value' > /dev/null 2>&1; then
        echo -e "${RED}Error: Could not fetch user${NC}" >&2
        echo "null"
        return 1
    fi
    
    # Check if we found exactly one user
    local user_count
    user_count=$(echo "$user_response" | jq -r '.value | length')
    
    if [ "$user_count" -eq 0 ]; then
        echo "DEBUG: No user found with exact email match, trying case-insensitive search..." >&2
        
        # Try case-insensitive filter using tolower() function
        local case_insensitive_filter=$(url_encode "tolower(domainname) eq tolower('$email')")
        local case_insensitive_url="$base_url?\$select=$select_param&\$filter=$case_insensitive_filter"
        
        echo "DEBUG: Case-insensitive URL: $case_insensitive_url" >&2
        
        user_response=$(curl -s \
            "$case_insensitive_url" \
            -H "Authorization: Bearer $DATAVERSE_TOKEN" \
            -H "Accept: application/json")
        
        echo "DEBUG: Case-insensitive response: $user_response" >&2
        
        if ! echo "$user_response" | jq -e '.value' > /dev/null 2>&1; then
            echo -e "${RED}Error: Could not fetch user with case-insensitive search${NC}" >&2
            echo "null"
            return 1
        fi
        
        user_count=$(echo "$user_response" | jq -r '.value | length')
        
        if [ "$user_count" -eq 0 ]; then
            echo -e "${RED}No user found with email: $email${NC}" >&2
            echo "null"
            return 1
        fi
    fi
    
    if [ "$user_count" -gt 1 ]; then
        echo "DEBUG: Found multiple users ($user_count), using first one" >&2
    fi
    
    # Extract the first (or only) user
    local user_match
    user_match=$(echo "$user_response" | jq -r '.value[0]')
    
    echo "DEBUG: Found user match" >&2
    echo "$user_match"
    return 0
}

# Get dataflows owned by a system user (using exact pattern from explore-systemuser.sh)
get_dataflows_by_owner() {
    local owner_id=$1
    echo "DEBUG: Querying dataflows for owner ID: $owner_id" >&2
    
    # Get all dataflows and filter locally (same pattern as get_user_by_email)
    echo "DEBUG: Fetching all dataflows from Dataverse..." >&2
    local all_dataflows
    all_dataflows=$(curl -s \
        "$DATAVERSE_URL/msdyn_dataflows?\$select=msdyn_dataflowid,msdyn_name,msdyn_originaldataflowid,_ownerid_value" \
        -H "Authorization: Bearer $DATAVERSE_TOKEN" \
        -H "Accept: application/json")

    if ! echo "$all_dataflows" | jq -e '.value' > /dev/null 2>&1; then
        echo -e "${RED}Error: Could not fetch dataflows${NC}" >&2
        echo "null"
        return 1
    fi
    
    echo "DEBUG: Filtering dataflows by owner ID..." >&2
    # Filter for dataflows owned by the specified user
    local filtered_dataflows
    filtered_dataflows=$(echo "$all_dataflows" | jq --arg owner_id "$owner_id" '{
        "@odata.context": ."@odata.context",
        "value": [.value[] | select(._ownerid_value == $owner_id)]
    }')
    
    echo "DEBUG: Filtered dataflows: $filtered_dataflows" >&2
    
    echo "$filtered_dataflows"
    return 0
}

# Transfer dataflow ownership (using exact pattern from transfer-dataflows.sh)
transfer_dataflow_ownership() {
    local dataflow_id=$1
    local current_owner_azure_id=$2
    local new_owner_azure_id=$3
    local new_owner_name=$4

    echo -e "${YELLOW}Transferring dataflow $dataflow_id ownership...${NC}"
    echo "From Azure ID: $current_owner_azure_id"
    echo "To Azure ID: $new_owner_azure_id ($new_owner_name)"
    
    TRANSFER_PAYLOAD=$(cat <<EOF
{
    "newOwnerName": "$new_owner_name",
    "newOwnerUserId": "$new_owner_azure_id",
    "previousOwnerUserId": "$current_owner_azure_id"
}
EOF
)
    
    TRANSFER_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
        "$POWER_QUERY_API_BASE/dataflow/group/$ENVIRONMENT_ID/dataflow/$dataflow_id/update-owner" \
        -H "Authorization: Bearer $POWERQUERY_TOKEN" \
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

# --- Menu Functions ---

# List all dataflows with owner information
list_all_dataflows() {
    echo -e "\n${BLUE}=== All Dataflows ===${NC}"
    
    # Get dataflows (using exact same pattern as working test script)
    DATAFLOWS_RESPONSE=$(curl -s \
        "$DATAVERSE_URL/msdyn_dataflows?\$select=msdyn_dataflowid,msdyn_name,msdyn_originaldataflowid,_ownerid_value,_createdby_value,_modifiedby_value,createdon,modifiedon&\$filter=_ownerid_value eq 'c6edb224-e8e3-ec11-bb3d-002248216be5'" \
        -H "Authorization: Bearer $DATAVERSE_TOKEN" \
        -H "Accept: application/json")

    if ! echo "$DATAFLOWS_RESPONSE" | jq -e '.value' > /dev/null 2>&1; then
        echo -e "${RED}Error fetching dataflows${NC}"
        echo "$DATAFLOWS_RESPONSE"
        return 1
    fi

    echo "$DATAFLOWS_RESPONSE" | jq -c '.value[]' | while IFS= read -r dataflow_json; do
        name=$(echo "$dataflow_json" | jq -r '.msdyn_name // "N/A"')
        original_id=$(echo "$dataflow_json" | jq -r '.msdyn_originaldataflowid // "N/A"')
        owner_system_id=$(echo "$dataflow_json" | jq -r '._ownerid_value // "N/A"')
        
        # Get owner details (using exact pattern from explore-systemuser.sh)
        local owner_name="N/A"
        local owner_email="N/A"
        if [ "$owner_system_id" != "N/A" ]; then
            local user_details
            user_details=$(curl -s \
                "$DATAVERSE_URL/systemusers($owner_system_id)?\$select=fullname,domainname" \
                -H "Authorization: Bearer $DATAVERSE_TOKEN" \
                -H "Accept: application/json")
            owner_name=$(echo "$user_details" | jq -r '.fullname // "Unknown"')
            owner_email=$(echo "$user_details" | jq -r '.domainname // "N/A"')
        fi
        
        echo -e "-----------------------------------------------------"
        echo -e "${GREEN}Name:${NC} $name"
        echo -e "${BLUE}  Power Query ID:${NC}  $original_id"
        echo -e "${BLUE}  Owner:${NC}           $owner_name ($owner_email)"
    done
    echo "-----------------------------------------------------"
}

# Query dataflows by owner email
query_dataflows_by_owner_email() {
    echo -e "\n${BLUE}=== Query Dataflows by Owner Email ===${NC}"
    
    # Get owner email
    echo -e "${YELLOW}Enter the email of the owner:${NC}"
    read -p "Owner Email: " OWNER_EMAIL
    
    if [ -z "$OWNER_EMAIL" ]; then
        echo -e "${RED}Error: Owner email is required${NC}"
        return 1
    fi
    
    echo "DEBUG: Looking up owner with email: $OWNER_EMAIL"
    # Look up owner
    USER_DATA=$(get_user_by_email "$OWNER_EMAIL")
    
    if [ -z "$USER_DATA" ]; then
        echo -e "${RED}Error: No response from user lookup${NC}"
        return 1
    fi
    
    echo "DEBUG: Raw user data response: $USER_DATA"
    
    # Check if the response is valid JSON
    if ! echo "$USER_DATA" | jq -e . >/dev/null 2>&1; then
        echo -e "${RED}Error: Invalid JSON response from user lookup${NC}"
        return 1
    fi
    
    if [ "$USER_DATA" == "null" ]; then
        echo -e "${RED}Could not find owner with email: $OWNER_EMAIL${NC}"
        return 1
    fi
    
    # Extract user details with error checking
    USER_NAME=$(echo "$USER_DATA" | jq -r '.fullname // "Unknown"')
    USER_SYSTEM_ID=$(echo "$USER_DATA" | jq -r '.systemuserid // "N/A"')
    USER_AZURE_ID=$(echo "$USER_DATA" | jq -r '.azureactivedirectoryobjectid // "N/A"')
    
    if [ "$USER_SYSTEM_ID" == "N/A" ]; then
        echo -e "${RED}Error: Could not get system user ID for owner${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Found owner: $USER_NAME (System ID: $USER_SYSTEM_ID, Azure ID: $USER_AZURE_ID)${NC}"
    
    echo "DEBUG: Getting dataflows for owner with system ID: $USER_SYSTEM_ID"
    # Get dataflows owned by user
    OWNED_DATAFLOWS=$(get_dataflows_by_owner "$USER_SYSTEM_ID")
    
    if [ -z "$OWNED_DATAFLOWS" ]; then
        echo -e "${RED}Error: No response from dataflow lookup${NC}"
        return 1
    fi
    
    echo "DEBUG: Raw dataflows response: $OWNED_DATAFLOWS"
    
    if ! echo "$OWNED_DATAFLOWS" | jq -e '.value' > /dev/null 2>&1; then
        echo -e "${RED}Error: Invalid response format from dataflow lookup${NC}"
        echo "Response: $OWNED_DATAFLOWS"
        return 1
    fi
    
    DATAFLOW_COUNT=$(echo "$OWNED_DATAFLOWS" | jq -r '.value | length')
    
    if [ "$DATAFLOW_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}No dataflows found for owner '$USER_NAME'${NC}"
        return 0
    fi
    
    echo -e "\n${GREEN}Found $DATAFLOW_COUNT dataflows owned by '$USER_NAME':${NC}"
    echo "-----------------------------------------------------"
    
    # Display the dataflows with details
    echo "$OWNED_DATAFLOWS" | jq -c '.value[]' | while IFS= read -r dataflow_json; do
        name=$(echo "$dataflow_json" | jq -r '.msdyn_name // "N/A"')
        original_id=$(echo "$dataflow_json" | jq -r '.msdyn_originaldataflowid // "N/A"')
        
        echo -e "${GREEN}Name:${NC} $name"
        echo -e "${BLUE}  Power Query ID:${NC} $original_id"
        echo "-----------------------------------------------------"
    done
    
    # Offer transfer option
    echo ""
    echo -e "${YELLOW}Would you like to transfer ALL these dataflows to a new owner? (y/N):${NC}"
    read -p "Transfer dataflows? " TRANSFER_CONFIRM
    
    if [[ "$TRANSFER_CONFIRM" == "y" || "$TRANSFER_CONFIRM" == "Y" ]]; then
        # Get new owner email
        echo -e "\n${YELLOW}Enter the email of the NEW owner:${NC}"
        read -p "New Owner Email: " NEW_OWNER_EMAIL
        
        if [ -z "$NEW_OWNER_EMAIL" ]; then
            echo -e "${RED}Error: New owner email is required${NC}"
            return 1
    fi
    
        echo "DEBUG: Looking up new owner..."
        # Look up new owner
        NEW_USER_DATA=$(get_user_by_email "$NEW_OWNER_EMAIL")
        
        if [ "$NEW_USER_DATA" == "null" ]; then
            echo -e "${RED}Could not find new owner with email: $NEW_OWNER_EMAIL${NC}"
            return 1
        fi
        
        NEW_USER_NAME=$(echo "$NEW_USER_DATA" | jq -r '.fullname')
        NEW_USER_AZURE_ID=$(echo "$NEW_USER_DATA" | jq -r '.azureactivedirectoryobjectid')
        
        echo -e "${GREEN}Found new owner: $NEW_USER_NAME (Azure ID: $NEW_USER_AZURE_ID)${NC}"
        
        # Final confirmation
        echo ""
        echo -e "${YELLOW}Are you sure you want to transfer ALL $DATAFLOW_COUNT dataflows from '$USER_NAME' to '$NEW_USER_NAME'?${NC}"
        read -p "Continue? (y/N): " FINAL_CONFIRM
        
        if [[ "$FINAL_CONFIRM" != "y" && "$FINAL_CONFIRM" != "Y" ]]; then
            echo "Transfer cancelled."
            return 0
        fi
        
        # Perform transfers
        local successful_transfers=0
        local failed_transfers=0
        
        echo -e "\n${BLUE}Starting dataflow transfers...${NC}"
        echo "$OWNED_DATAFLOWS" | jq -c '.value[]' | while IFS= read -r dataflow_json; do
            local pq_id
            pq_id=$(echo "$dataflow_json" | jq -r '.msdyn_originaldataflowid')
            local dataflow_name
            dataflow_name=$(echo "$dataflow_json" | jq -r '.msdyn_name // "N/A"')
            
            if [ -n "$pq_id" ] && [ "$pq_id" != "null" ] && [ "$pq_id" != "N/A" ]; then
                echo -e "\n${BLUE}Processing: $dataflow_name${NC}"
                if transfer_dataflow_ownership "$pq_id" "$USER_AZURE_ID" "$NEW_USER_AZURE_ID" "$NEW_USER_NAME"; then
                    echo -e "${GREEN}✓ Successfully transferred: $dataflow_name${NC}"
                    successful_transfers=$((successful_transfers + 1))
                else
                    echo -e "${RED}✗ Failed to transfer: $dataflow_name${NC}"
                    failed_transfers=$((failed_transfers + 1))
                fi
            else
                echo -e "${YELLOW}⚠ Skipping '$dataflow_name' - missing Power Query ID${NC}"
                failed_transfers=$((failed_transfers + 1))
            fi
        done
        
        echo -e "\n${GREEN}=== Transfer Summary ===${NC}"
        echo "Successful transfers: $successful_transfers"
        echo "Failed transfers: $failed_transfers"
        echo "Total dataflows processed: $DATAFLOW_COUNT"
        
        if [ $successful_transfers -gt 0 ]; then
            echo -e "\n${GREEN}Transfer completed! $successful_transfers dataflows have been transferred from '$USER_NAME' to '$NEW_USER_NAME'.${NC}"
        fi
    else
        echo "Query completed without transfer."
    fi
}

# Transfer all dataflows from one owner to another by email
transfer_dataflows_by_email() {
    echo -e "\n${BLUE}=== Bulk Transfer by Owner Email ===${NC}"
    
    # Get current owner email
    echo -e "${YELLOW}Enter the email of the CURRENT owner:${NC}"
    read -p "Current Owner Email: " CURRENT_OWNER_EMAIL
    
    if [ -z "$CURRENT_OWNER_EMAIL" ]; then
        echo -e "${RED}Error: Current owner email is required${NC}"
        return 1
    fi
    
    # Get new owner email
    echo -e "${YELLOW}Enter the email of the NEW owner:${NC}"
    read -p "New Owner Email: " NEW_OWNER_EMAIL
    
    if [ -z "$NEW_OWNER_EMAIL" ]; then
        echo -e "${RED}Error: New owner email is required${NC}"
        return 1
    fi
    
    echo "DEBUG: Looking up current owner..."
    # Look up current owner
    CURRENT_USER_DATA=$(get_user_by_email "$CURRENT_OWNER_EMAIL")
    
    if [ "$CURRENT_USER_DATA" == "null" ]; then
        echo -e "${RED}Could not find current owner with email: $CURRENT_OWNER_EMAIL${NC}"
        return 1
    fi
    
    CURRENT_USER_NAME=$(echo "$CURRENT_USER_DATA" | jq -r '.fullname')
    CURRENT_USER_SYSTEM_ID=$(echo "$CURRENT_USER_DATA" | jq -r '.systemuserid')
    CURRENT_USER_AZURE_ID=$(echo "$CURRENT_USER_DATA" | jq -r '.azureactivedirectoryobjectid')
    
    echo -e "${GREEN}Found current owner: $CURRENT_USER_NAME (System ID: $CURRENT_USER_SYSTEM_ID, Azure ID: $CURRENT_USER_AZURE_ID)${NC}"
    
    echo "DEBUG: Looking up new owner..."
    # Look up new owner
    NEW_USER_DATA=$(get_user_by_email "$NEW_OWNER_EMAIL")
    
    if [ "$NEW_USER_DATA" == "null" ]; then
        echo -e "${RED}Could not find new owner with email: $NEW_OWNER_EMAIL${NC}"
        return 1
    fi
    
    NEW_USER_NAME=$(echo "$NEW_USER_DATA" | jq -r '.fullname')
    NEW_USER_AZURE_ID=$(echo "$NEW_USER_DATA" | jq -r '.azureactivedirectoryobjectid')
    
    echo -e "${GREEN}Found new owner: $NEW_USER_NAME (Azure ID: $NEW_USER_AZURE_ID)${NC}"
    
    echo "DEBUG: Getting dataflows for current owner..."
    # Get dataflows owned by current user
    OWNED_DATAFLOWS=$(get_dataflows_by_owner "$CURRENT_USER_SYSTEM_ID")
    
    if [ "$OWNED_DATAFLOWS" == "null" ]; then
        echo -e "${RED}Error retrieving dataflows for current owner${NC}"
        return 1
    fi
    
    DATAFLOW_COUNT=$(echo "$OWNED_DATAFLOWS" | jq -r '.value | length')

    if [ "$DATAFLOW_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}No dataflows found for owner '$CURRENT_USER_NAME'${NC}"
        return 0
    fi

    echo -e "\n${YELLOW}Found $DATAFLOW_COUNT dataflows owned by '$CURRENT_USER_NAME':${NC}"
    
    # Display the dataflows
    echo "$OWNED_DATAFLOWS" | jq -c '.value[]' | while IFS= read -r dataflow_json; do
        name=$(echo "$dataflow_json" | jq -r '.msdyn_name // "N/A"')
        original_id=$(echo "$dataflow_json" | jq -r '.msdyn_originaldataflowid // "N/A"')
        echo "  - $name (PQ ID: $original_id)"
    done
    
    # Confirm transfer
    echo ""
    echo -e "${YELLOW}Are you sure you want to transfer ALL these dataflows from '$CURRENT_USER_NAME' to '$NEW_USER_NAME'?${NC}"
    read -p "Continue? (y/N): " CONFIRM

    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        echo "Bulk transfer cancelled."
        return 0
    fi

    # Perform transfers
    local successful_transfers=0
    local failed_transfers=0
    
    echo -e "\n${BLUE}Starting dataflow transfers...${NC}"
    echo "$OWNED_DATAFLOWS" | jq -c '.value[]' | while IFS= read -r dataflow_json; do
        local pq_id
        pq_id=$(echo "$dataflow_json" | jq -r '.msdyn_originaldataflowid')
        local dataflow_name
        dataflow_name=$(echo "$dataflow_json" | jq -r '.msdyn_name // "N/A"')
        
        if [ -n "$pq_id" ] && [ "$pq_id" != "null" ] && [ "$pq_id" != "N/A" ]; then
            echo -e "\n${BLUE}Processing: $dataflow_name${NC}"
            if transfer_dataflow_ownership "$pq_id" "$CURRENT_USER_AZURE_ID" "$NEW_USER_AZURE_ID" "$NEW_USER_NAME"; then
                echo -e "${GREEN}✓ Successfully transferred: $dataflow_name${NC}"
                successful_transfers=$((successful_transfers + 1))
            else
                echo -e "${RED}✗ Failed to transfer: $dataflow_name${NC}"
                failed_transfers=$((failed_transfers + 1))
            fi
        else
            echo -e "${YELLOW}⚠ Skipping '$dataflow_name' - missing Power Query ID${NC}"
            failed_transfers=$((failed_transfers + 1))
        fi
    done

    echo -e "\n${GREEN}=== Transfer Summary ===${NC}"
    echo "Successful transfers: $successful_transfers"
    echo "Failed transfers: $failed_transfers"
    echo "Total dataflows processed: $DATAFLOW_COUNT"
    
    if [ $successful_transfers -gt 0 ]; then
        echo -e "\n${GREEN}Bulk transfer completed! $successful_transfers dataflows have been transferred from '$CURRENT_USER_NAME' to '$NEW_USER_NAME'.${NC}"
    fi
}

# --- Main Function ---
main() {
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: 'jq' is not installed. Please install it to continue.${NC}"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    # Authenticate for both services
    echo -e "${BLUE}Starting authentication process...${NC}"
    get_dataverse_token
    get_powerquery_token
    echo -e "${GREEN}All authentication completed!${NC}"
    
    # Main menu loop
    while true; do
        echo -e "\n${BLUE}========== Dataflow Management Menu ==========${NC}"
        echo "1. List All Dataflows (with owner information)"
        echo "2. Transfer All Dataflows by Owner Email"
        echo "3. Query Dataflows by Owner Email"
        echo "4. Exit"
        echo -e "=============================================="
        read -p "Choose an option: " choice

        case $choice in
            1) list_all_dataflows ;;
            2) transfer_dataflows_by_email ;;
            3) query_dataflows_by_owner_email ;;
            4) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}" ;;
        esac
    done
}

# Run the main function
main "$@" 