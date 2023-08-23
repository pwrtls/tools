export interface IPowerAutomateFlow {
    flowId: string; // Unique identifier for the Power Automate Flow
    name: string; // Name of the Power Automate Flow
    status: 'Converted' | 'Failed'; // Status of the conversion
    logs?: string[]; // Logs related to the conversion process
    // Additional properties as needed for the conversion details
  }
  