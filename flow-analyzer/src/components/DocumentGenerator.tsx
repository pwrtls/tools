import React, { useState } from 'react';
import { Button, Space, Modal, Typography, Radio, Spin } from 'antd';
import { FileMarkdownOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { Flow, FlowAnalysisResult, FlowDetails } from '../models/Flow';
import { useFlowService } from '../api/flowService';

const { Title, Paragraph, Text } = Typography;
const { Group, Button: RadioButton } = Radio;

interface DocumentGeneratorProps {
  flow: Flow;
  flowDetails: FlowDetails;
  analysis: FlowAnalysisResult;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ flow, flowDetails, analysis }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'pdf' | 'text'>('markdown');
  const [isGenerating, setIsGenerating] = useState(false);
  const { downloadDocumentation } = useFlowService();

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleExport = async () => {
    setIsGenerating(true);
    
    try {
      // Generate the documentation content
      const content = generateDocumentation(flow, flowDetails, analysis, exportFormat);
      
      // Determine MIME type and file extension
      let mimeType = 'text/plain';
      let extension = 'txt';
      
      if (exportFormat === 'markdown') {
        mimeType = 'text/markdown';
        extension = 'md';
      } else if (exportFormat === 'pdf') {
        // Note: In a real implementation, we would use a library like jsPDF
        // to generate a PDF file. For this example, we'll just use text.
        mimeType = 'application/pdf';
        extension = 'pdf';
      }

      // Use the service to download the file
      const fileName = `${flow.name}-documentation.${extension}`;
      await downloadDocumentation(content, fileName, mimeType);
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error exporting documentation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDocumentation = (
    flow: Flow, 
    flowDetails: FlowDetails, 
    analysis: FlowAnalysisResult, 
    format: string
  ): string => {
    // Generate markdown by default
    let doc = `# Flow: ${flow.name}\n\n`;
    
    // Add description if available
    if (flow.description) {
      doc += `${flow.description}\n\n`;
    }
    
    // Add flow details based on the Workflow table schema from MS docs
    doc += `## Flow Details\n\n`;
    doc += `- **Type**: ${flow.type === 1 ? 'Automated' : 'Manual'}\n`;
    doc += `- **Status**: ${flow.status}\n`;
    doc += `- **Category**: ${flow.category}\n`;
    doc += `- **Created On**: ${flow.createdOn.toLocaleDateString()}\n`;
    doc += `- **Modified On**: ${flow.modifiedOn.toLocaleDateString()}\n`;
    doc += `- **Actions**: ${flowDetails.actions.length}\n\n`;
    
    // Add triggers
    doc += `## Triggers\n\n`;
    flowDetails.triggers.forEach(trigger => {
      doc += `- ${trigger}\n`;
    });
    doc += '\n';
    
    // Add connectors
    doc += `## Connectors\n\n`;
    analysis.connectors.forEach(connector => {
      doc += `### ${connector.displayName}\n`;
      doc += `- **Type**: ${connector.connectorName}\n`;
      if (connector.critical) {
        doc += `- **Critical**: Yes\n`;
      }
      if (connector.count) {
        doc += `- **Usage Count**: ${connector.count}\n`;
      }
      doc += '\n';
    });
    
    // Add actions
    doc += `## Actions\n\n`;
    flowDetails.actions.forEach(action => {
      doc += `### ${action.name}\n`;
      doc += `- **Type**: ${action.type}\n`;
      if (action.description) {
        doc += `- **Description**: ${action.description}\n`;
      }
      doc += '\n';
    });
    
    // Add issues and recommendations
    if (analysis.issues.length > 0) {
      doc += `## Issues\n\n`;
      analysis.issues.forEach(issue => {
        doc += `- **[${issue.severity}]** ${issue.description}\n`;
        if (issue.impact) {
          doc += `  **Impact**: ${issue.impact}\n`;
        }
        if (issue.location) {
          doc += `  **Location**: ${issue.location}\n`;
        }
        doc += '\n';
      });
    }
    
    if (analysis.recommendations.length > 0) {
      doc += `## Recommendations\n\n`;
      analysis.recommendations.forEach(recommendation => {
        doc += `### ${recommendation.title}\n`;
        doc += `- **Priority**: ${recommendation.priority}\n`;
        doc += `- **Category**: ${recommendation.category}\n`;
        doc += `- ${recommendation.description}\n\n`;
      });
    }
    
    return doc;
  };

  return (
    <>
      <Button 
        icon={<FileMarkdownOutlined />} 
        onClick={showModal}
      >
        Generate Documentation
      </Button>
      
      <Modal
        title="Generate Flow Documentation"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isGenerating}
            onClick={handleExport}
          >
            Export
          </Button>,
        ]}
      >
        <Spin spinning={isGenerating}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>Select Export Format</Title>
            <Group 
              value={exportFormat} 
              onChange={e => setExportFormat(e.target.value)}
              style={{ marginBottom: 16 }}
            >
              <RadioButton value="markdown">
                <FileMarkdownOutlined /> Markdown
              </RadioButton>
              <RadioButton value="pdf">
                <FilePdfOutlined /> PDF
              </RadioButton>
              <RadioButton value="text">
                <FileTextOutlined /> Text
              </RadioButton>
            </Group>
            
            <Paragraph>
              <Text strong>Flow Name:</Text> {flow.name}
            </Paragraph>
            <Paragraph>
              <Text strong>Actions:</Text> {flowDetails.actions.length}
            </Paragraph>
            <Paragraph>
              <Text strong>Connectors:</Text> {analysis.connectors.length}
            </Paragraph>
            
            <Text type="secondary">
              Documentation will include flow structure, connectors, actions, issues and recommendations.
            </Text>
          </Space>
        </Spin>
      </Modal>
    </>
  );
}; 