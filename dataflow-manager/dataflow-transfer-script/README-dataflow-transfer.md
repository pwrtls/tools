# Power Query Dataflow Ownership Transfer Script

This script allows you to transfer ownership of Power Query dataflows directly using the Power Query API.

## Prerequisites

1. **jq**: JSON command-line processor
   - macOS: `brew install jq`
   - Ubuntu/Debian: `sudo apt-get install jq`
   - Other systems: [Download from jqlang.github.io](https://jqlang.github.io/jq/)

2. **curl**: Usually pre-installed on most systems

## Configuration

The script is pre-configured with KeHE's environment details:
- **Tenant ID**: `cee4a410-821e-4b7e-992d-ec3bc2d33292`
- **Client ID**: `05aec6ff-18da-42b1-8261-ce4d99fdaf30` (PowerTools)
- **Environment ID**: `2907c6d4-b9fc-ee08-b734-b0cb22538609`

## Usage

1. **Run the script**:
   ```bash
   ./transfer-dataflows.sh
   ```

2. **Authenticate**: 
   - The script will provide a device code and URL
   - Open the URL in your browser
   - Enter the device code
   - Sign in with your KeHE account
   - Press Enter in the terminal after completing authentication

3. **Enter current owner details**:
   - Provide the Azure AD Object ID of the current dataflow owner

4. **Select dataflow**:
   - The script will list all dataflows owned by that user
   - Copy and paste the Dataflow ID you want to transfer

5. **Enter new owner details**:
   - Provide the Azure AD Object ID of the new owner
   - Provide the display name of the new owner

6. **Confirm transfer**:
   - Review the details and confirm the transfer

## Example Usage

### Known User IDs for KeHE:
- **Microsoft Dynamics**: `810c9a57-7ccd-40a1-8638-f90dca28507c`
- **Stephanie Wymore**: `de2cb672-db17-4cfb-aa79-54d825ef0823`
- **Jared Hilton**: `2842494b-2ac3-4151-8211-02555a3ca4fb`

### Sample Transfer:
```
Current Owner ID: de2cb672-db17-4cfb-aa79-54d825ef0823
Dataflow ID: 06185779-0ce0-ef11-a730-000d3a103fb9
New Owner Azure AD Object ID: 810c9a57-7ccd-40a1-8638-f90dca28507c
New Owner Display Name: # Microsoft Dynamics
```

## Troubleshooting

### Authentication Issues
- Ensure you have the correct permissions in the Power Platform environment
- Make sure you're signing in with your KeHE account
- Check that the PowerTools app has the necessary permissions

### Permission Errors (403)
- The authenticated user must have permission to transfer ownership of the dataflow
- You may need to be an environment administrator or the current owner
- Check with your Power Platform administrator for proper permissions

### API Errors
- Verify the dataflow ID is correct
- Ensure the new owner exists in the system
- Check that all Azure AD Object IDs are valid

## Script Output

The script provides colorized output:
- 🔵 **Blue**: Information prompts
- 🟡 **Yellow**: Progress updates
- 🟢 **Green**: Success messages
- 🔴 **Red**: Error messages

## Security Notes

- The script uses Azure AD device code flow for secure authentication
- Access tokens are only stored in memory during script execution
- No credentials are saved to disk
- The script uses HTTPS for all API calls 