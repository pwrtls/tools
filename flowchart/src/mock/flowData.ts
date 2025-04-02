// Mock flow data based on Microsoft Dataverse API schema
// Reference: https://learn.microsoft.com/en-us/power-automate/manage-flows-with-code

import { WorkflowResponse, WorkflowDefinition } from '../models/Flow';

/**
 * Mock response for the Dataverse API endpoint: /api/data/v9.2/workflows
 * This simulates the response when listing flows
 */
export const mockFlowsResponse: WorkflowResponse = {
  value: [
    {
      workflowid: "f2095d5c-651a-4c42-a965-4d16d59d841a",
      name: "Process Approval Requests",
      description: "Automated flow to process approval requests from multiple sources",
      category: 5, // Modern Flow (Cloud Flow)
      createdon: "2023-09-15T14:32:10Z",
      modifiedon: "2023-10-20T09:45:22Z",
      statecode: 1, // Active
      type: 1, // Automated
      _createdby_value: "a8c47e5d-fb1a-4840-9c67-86a857c7a6e0",
      _modifiedby_value: "a8c47e5d-fb1a-4840-9c67-86a857c7a6e0",
      _ownerid_value: "a8c47e5d-fb1a-4840-9c67-86a857c7a6e0"
    },
    {
      workflowid: "d7a8bf56-c7d2-4d34-8f12-ef124a492d05",
      name: "Sync Customer Records",
      description: "Synchronizes customer data between Dataverse and external systems",
      category: 5, // Modern Flow (Cloud Flow)
      createdon: "2023-08-20T10:15:30Z",
      modifiedon: "2023-10-18T16:22:45Z",
      statecode: 1, // Active
      type: 1, // Automated
      _createdby_value: "a8c47e5d-fb1a-4840-9c67-86a857c7a6e0",
      _modifiedby_value: "b9d58e6f-c421-4b3a-9581-fd5ae3354c82",
      _ownerid_value: "a8c47e5d-fb1a-4840-9c67-86a857c7a6e0"
    },
    {
      workflowid: "e5c3f87b-8e45-4b9a-b65c-3a2d18cd63d1",
      name: "Send Email Notifications",
      description: "Sends email notifications for various business events",
      category: 5, // Modern Flow (Cloud Flow)
      createdon: "2023-07-05T08:45:12Z",
      modifiedon: "2023-09-30T11:18:33Z",
      statecode: 0, // Inactive
      type: 1, // Automated
      _createdby_value: "b9d58e6f-c421-4b3a-9581-fd5ae3354c82",
      _modifiedby_value: "a8c47e5d-fb1a-4840-9c67-86a857c7a6e0",
      _ownerid_value: "b9d58e6f-c421-4b3a-9581-fd5ae3354c82"
    }
  ]
};

/**
 * Mock flow definition for the Dataverse API endpoint: /api/data/v9.2/workflows({id})
 * This simulates the clientdata field from the response when fetching flow details
 */
export const mockFlowDefinition: WorkflowDefinition = {
  properties: {
    displayName: "Process Approval Requests",
    description: "Automated flow to process approval requests from multiple sources",
    connectionReferences: {
      shared_commondataserviceforapps: {
        connectionName: "shared_dataverse",
        displayName: "Microsoft Dataverse",
        connectorName: "shared_commondataserviceforapps",
        iconUri: "https://connectoricons-prod.azureedge.net/releases/v1.0.1615/1.0.1615.3163/commondataserviceforapps/icon.png",
        connection: {
          id: "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps/connections/shared-commondataserv-00000000-0000-0000-0000-000000000000"
        },
        api: {
          name: "shared_commondataserviceforapps"
        }
      },
      shared_office365: {
        connectionName: "shared_office365",
        displayName: "Office 365 Outlook",
        connectorName: "shared_office365",
        iconUri: "https://connectoricons-prod.azureedge.net/releases/v1.0.1615/1.0.1615.3163/office365/icon.png",
        connection: {
          id: "/providers/Microsoft.PowerApps/apis/shared_office365/connections/shared-office365-00000000-0000-0000-0000-000000000000"
        },
        api: {
          name: "shared_office365"
        }
      }
    },
    definition: {
      $schema: "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      contentVersion: "1.0.0.0",
      parameters: {
        $connections: {
          defaultValue: {},
          type: "Object"
        }
      },
      triggers: {
        "When_a_new_approval_request_is_created": {
          type: "OpenApiConnectionWebhook",
          inputs: {
            host: {
              connectionName: "shared_commondataserviceforapps",
              operationId: "SubscribeWebhookTrigger",
              apiId: "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
            },
            parameters: {
              subscriptionRequest: {
                source: "dataverse",
                type: "table",
                tableName: "flowapprovaltable"
              }
            }
          }
        }
      },
      actions: {
        "Get_approval_record": {
          type: "OpenApiConnection",
          inputs: {
            host: {
              connectionName: "shared_commondataserviceforapps",
              operationId: "GetItem",
              apiId: "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
            },
            parameters: {
              entityName: "flowapprovaltable",
              recordId: "@triggerOutputs()?['body/flowapprovalid']"
            }
          },
          runAfter: {}
        },
        "Condition_-_Check_approval_status": {
          type: "If",
          expression: {
            equals: [
              "@outputs('Get_approval_record')?['body/statuscode']",
              1 // Pending
            ]
          },
          actions: {
            "Send_approval_email": {
              type: "OpenApiConnection",
              inputs: {
                host: {
                  connectionName: "shared_office365",
                  operationId: "SendEmailV2",
                  apiId: "/providers/Microsoft.PowerApps/apis/shared_office365"
                },
                parameters: {
                  emailMessage: {
                    To: "@outputs('Get_approval_record')?['body/approver_email']",
                    Subject: "New Approval Request: @{outputs('Get_approval_record')?['body/title']}",
                    Body: "<p>You have a new approval request:</p><p><strong>Title:</strong> @{outputs('Get_approval_record')?['body/title']}</p><p><strong>Requested by:</strong> @{outputs('Get_approval_record')?['body/requestor_name']}</p><p><strong>Description:</strong> @{outputs('Get_approval_record')?['body/description']}</p>"
                  }
                }
              },
              runAfter: {}
            }
          },
          runAfter: {
            "Get_approval_record": ["Succeeded"]
          }
        },
        "HTTP_request_to_external_system": {
          type: "Http",
          inputs: {
            method: "POST",
            uri: "https://api.example.com/notifications",
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              requestType: "approval",
              requestId: "@triggerOutputs()?['body/flowapprovalid']",
              status: "@outputs('Get_approval_record')?['body/statuscode']"
            }
          },
          runAfter: {
            "Condition_-_Check_approval_status": ["Succeeded"]
          }
        }
      },
      outputs: {}
    }
  }
}; 