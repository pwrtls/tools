import React, { useState, useRef } from 'react';
import { Button, Space, Modal, Typography, Radio, Spin } from 'antd';
import { FileMarkdownOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { Flow, FlowAnalysisResult, FlowDetails } from '../models/Flow';
import { useFlowService } from '../api/flowService';
import { jsPDF } from 'jspdf';
import mermaid from 'mermaid';

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
  const { downloadDocumentation, generateSimplifiedFlowDiagram } = useFlowService();
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleExport = async () => {
    setIsGenerating(true);
    
    try {
      // Generate markdown content first (used for all formats)
      const markdownContent = generateDocumentation(flow, flowDetails, analysis, 'markdown');
      
      // Handle different export formats
      if (exportFormat === 'pdf') {
        // Create and configure the PDF document first
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        try {
          // Step 1: Initialize mermaid with proper settings
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: 'Arial, sans-serif',
            flowchart: {
              htmlLabels: true,
              curve: 'basis',
              useMaxWidth: false
            }
          });
          
          // Step 2: Generate diagram definition
          const diagramDefinition = generateSimplifiedFlowDiagram(flowDetails);
          
          // Step 3: Create a temporary div for rendering
          const tempDiv = document.createElement('div');
          tempDiv.style.visibility = 'hidden';
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '0';
          tempDiv.style.width = '1200px'; // Fixed width for rendering
          tempDiv.style.height = '900px'; // Fixed height
          document.body.appendChild(tempDiv);
          
          try {
            // Step 4: Render the diagram to the div
            const { svg } = await mermaid.render(`diagram-${Date.now()}`, diagramDefinition);
            
            // Step 5: Create an SVG element with the rendered content
            tempDiv.innerHTML = svg;
            
            // Get the SVG element
            const svgElement = tempDiv.querySelector('svg');
            
            if (svgElement) {
              // Set explicit width and height on the SVG
              svgElement.setAttribute('width', '1200');
              svgElement.setAttribute('height', '900');
              
              // Create a canvas
              const canvas = document.createElement('canvas');
              canvas.width = 1200;
              canvas.height = 900;
              
              // Get the 2D context
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                // Draw white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Convert SVG to an image
                const image = new Image();
                
                // Create a data URL from the SVG
                const svgAsXML = new XMLSerializer().serializeToString(svgElement);
                const svgData = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgAsXML)))}`;
                
                // Wait for the image to load
                await new Promise<void>((resolve, reject) => {
                  image.onload = () => {
                    // Draw the image on the canvas
                    ctx.drawImage(image, 0, 0);
                    
                    // Fill the PDF with content
                    generatePDFContent(pdf, flow, flowDetails, analysis, canvas.toDataURL('image/png'));
                    
                    // Save and download the PDF
                    const pdfOutput = pdf.output('blob');
                    const reader = new FileReader();
                    
                    reader.onloadend = async function() {
                      const base64data = reader.result as string;
                      const base64Content = base64data.split(',')[1];
                      
                      // Convert to binary content for download
                      const binaryString = window.atob(base64Content);
                      const bytes = new Uint8Array(binaryString.length);
                      for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                      }
                      
                      let binaryContent = '';
                      bytes.forEach(byte => {
                        binaryContent += String.fromCharCode(byte);
                      });
                      
                      // Download the file
                      const fileName = `${flow.name.replace(/[^a-zA-Z0-9-_]/g, '_')}-documentation.pdf`;
                      await downloadDocumentation(binaryContent, fileName, 'application/pdf');
                    };
                    
                    reader.readAsDataURL(pdfOutput);
                    resolve();
                  };
                  
                  image.onerror = (e) => {
                    reject(new Error(`Failed to load SVG as image: ${e}`));
                  };
                  
                  // Set the source to load the image
                  image.src = svgData;
                });
              } else {
                // If canvas context is not available, generate PDF without diagram
                generatePDFContent(pdf, flow, flowDetails, analysis, null);
                downloadPDF(pdf);
              }
            } else {
              // If SVG element not found, generate PDF without diagram
              generatePDFContent(pdf, flow, flowDetails, analysis, null);
              downloadPDF(pdf);
            }
          } catch (renderError) {
            console.error('Error rendering mermaid diagram:', renderError);
            // Generate PDF without diagram
            generatePDFContent(pdf, flow, flowDetails, analysis, null);
            downloadPDF(pdf);
          }
          
          // Clean up
          document.body.removeChild(tempDiv);
        } catch (diagramError) {
          console.error('Error in diagram generation process:', diagramError);
          // Generate PDF without diagram
          generatePDFContent(pdf, flow, flowDetails, analysis, null);
          downloadPDF(pdf);
        }
      } else {
        // For markdown and text formats
        let content = markdownContent;
        let mimeType = 'text/plain';
        let extension = 'txt';
        
        if (exportFormat === 'markdown') {
          mimeType = 'text/markdown';
          extension = 'md';
        }
        
        // Use the service to download the file
        const fileName = `${flow.name.replace(/[^a-zA-Z0-9-_]/g, '_')}-documentation.${extension}`;
        await downloadDocumentation(content, fileName, mimeType);
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error exporting documentation:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Helper function to download the PDF
  const downloadPDF = async (pdf: jsPDF) => {
    const pdfOutput = pdf.output('blob');
    const reader = new FileReader();
    
    reader.onloadend = async function() {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      
      // Convert to binary content for download
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      let binaryContent = '';
      bytes.forEach(byte => {
        binaryContent += String.fromCharCode(byte);
      });
      
      // Download the file
      const fileName = `${flow.name.replace(/[^a-zA-Z0-9-_]/g, '_')}-documentation.pdf`;
      await downloadDocumentation(binaryContent, fileName, 'application/pdf');
    };
    
    reader.readAsDataURL(pdfOutput);
  };
  
  // Function to generate PDF content
  const generatePDFContent = (
    pdf: jsPDF,
    flow: Flow, 
    flowDetails: FlowDetails, 
    analysis: FlowAnalysisResult,
    diagramImage: string | null
  ): void => {
    // Set initial position
    let y = 10;
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    
    // Helper function to add text with line breaks
    const addText = (text: string, fontSize: number, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, margin, y);
      y += (fontSize / 4) * lines.length + 3;
    };
    
    // Helper function to add a section title
    const addSectionTitle = (title: string) => {
      y += 5;
      addText(title, 16, true);
      y += 2;
    };
    
    // Helper function to add a section item
    const addItem = (label: string, value: string) => {
      const fullText = `${label}: ${value}`;
      addText(fullText, 10);
    };
    
    // Helper function to check if we need a new page
    const checkPageBreak = (estimatedHeight: number = 20) => {
      if (y + estimatedHeight > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
    };
    
    // Title
    addText(`Flow: ${flow.name}`, 20, true);
    
    // Description if available
    if (flow.description) {
      addText(flow.description, 12);
    }
    
    // Flow details
    checkPageBreak();
    addSectionTitle('Flow Details');
    
    addItem('Type', flow.type === 1 ? 'Automated' : 'Manual');
    addItem('Status', flow.status.label);
    addItem('Category', String(flow.category));
    addItem('Created On', flow.createdOn.toLocaleDateString());
    addItem('Modified On', flow.modifiedOn.toLocaleDateString());
    addItem('Actions', flowDetails.actions.length.toString());
    
    // Add Flow Diagram
    if (diagramImage) {
      checkPageBreak(100);
      addSectionTitle('Flow Diagram');
      
      try {
        // Calculate dimensions to fit within page width
        const imageWidth = maxWidth;
        const imageHeight = Math.min(imageWidth * 0.75, 120); // Limit height
        
        pdf.addImage(diagramImage, 'PNG', margin, y, imageWidth, imageHeight);
        y += imageHeight + 10;
      } catch (imgError) {
        console.error('Error adding diagram image to PDF:', imgError);
        addText('(Error embedding flow diagram - see interactive view)', 10);
        y += 10;
      }
    }
    
    // Triggers
    checkPageBreak();
    addSectionTitle('Triggers');
    
    flowDetails.triggers.forEach(trigger => {
      addText(`• ${trigger}`, 10);
    });
    
    // Connectors
    checkPageBreak();
    addSectionTitle('Connectors');
    
    analysis.connectors.forEach(connector => {
      checkPageBreak();
      addText(connector.displayName, 12, true);
      addItem('Type', connector.connectorName);
      
      if (connector.critical) {
        addItem('Critical', 'Yes');
      }
      
      if (connector.count) {
        addItem('Usage Count', connector.count.toString());
      }
      
      y += 2;
    });
    
    // Actions
    checkPageBreak();
    addSectionTitle('Actions');
    
    flowDetails.actions.forEach(action => {
      checkPageBreak();
      addText(action.name, 12, true);
      addItem('Type', action.type || 'Unknown');
      
      if (action.description) {
        addItem('Description', action.description);
      }
      
      y += 2;
    });
    
    // Issues
    if (analysis.issues.length > 0) {
      checkPageBreak();
      addSectionTitle('Issues');
      
      analysis.issues.forEach(issue => {
        checkPageBreak();
        addText(`[${issue.severity}] ${issue.description}`, 10, true);
        
        if (issue.impact) {
          addText(`Impact: ${issue.impact}`, 10);
        }
        
        if (issue.location) {
          addText(`Location: ${issue.location}`, 10);
        }
        
        y += 2;
      });
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      checkPageBreak();
      addSectionTitle('Recommendations');
      
      analysis.recommendations.forEach(recommendation => {
        checkPageBreak();
        addText(recommendation.title, 12, true);
        addItem('Priority', recommendation.priority);
        addItem('Category', recommendation.category);
        addText(recommendation.description, 10);
        y += 2;
      });
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
    doc += `- **Status**: ${flow.status.label}\n`;
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
              {exportFormat === 'pdf' && ' The PDF will also include a visual flow diagram.'}
            </Text>
            
            {/* Hidden diagram container for rendering */}
            <div ref={diagramContainerRef} style={{ display: 'none' }} />
          </Space>
        </Spin>
      </Modal>
    </>
  );
}; 