import React, { useEffect, useState, useRef } from 'react';
import { Flow, FlowDetails } from '../models/Flow';
import { Button, Card, Divider, Tooltip, Spin, Space, Dropdown, message } from 'antd';
import { DownloadOutlined, FullscreenOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import mermaid from 'mermaid';
import { useFlowService } from '../api/flowService';
import { usePowerToolsApi } from '../powertools/apiHook';

// Add a polyfill for getBBox which is needed for mermaid in some environments
const addSVGBBoxPolyfill = () => {
  try {
    // Check if we're in an iframe where SVGElement.prototype.getBBox might not work properly
    const isSVGAvailable = typeof SVGElement !== 'undefined';
    
    if (isSVGAvailable && window !== window.top) {
      // Original getBBox method might be broken in iframe context
      // Using any type to bypass TypeScript restrictions for this polyfill
      const svgProto = SVGElement.prototype as any;
      const originalGetBBox = svgProto.getBBox;
      
      // Replace with a polyfill that returns default values
      svgProto.getBBox = function() {
        try {
          // Try the original method first
          return originalGetBBox.apply(this);
        } catch (error) {
          console.log('getBBox polyfill used with fallback values');
          // Return dummy values that are sufficient for mermaid's needs
          return { 
            x: 0, 
            y: 0, 
            width: (this as any).width?.baseVal?.value || 1000, 
            height: (this as any).height?.baseVal?.value || 1000 
          };
        }
      };
      console.log('Applied SVG getBBox polyfill for iframe environment');
    }
  } catch (error) {
    console.warn('Could not apply SVG getBBox polyfill:', error);
  }
};

interface FlowVisualizerProps {
  flow: Flow;
  flowDetails: FlowDetails;
}

export const FlowVisualizer: React.FC<FlowVisualizerProps> = ({ flow, flowDetails }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  
  const { generateFlowDiagram, generateSimplifiedFlowDiagram } = useFlowService();
  const { download } = usePowerToolsApi();

  useEffect(() => {
    // Skip rendering if we're already rendering to prevent loops
    if (isRendering) {
      console.log('Skipping re-render while already rendering');
      return;
    }

    console.log('FlowVisualizer effect triggered', { 
      flowId: flow?.id,
      hasFlowDetails: !!flowDetails,
      actionsCount: flowDetails?.actions?.length,
      triggersCount: flowDetails?.triggers?.length
    });
    
    // Apply SVG polyfill for iframe environments
    addSVGBBoxPolyfill();
    
    // Reset mermaid before initializing to clear any cached state
    try {
      // Clear any previous mermaid state without using reset()
      // We'll do this by re-initializing with default settings
      console.log('Clearing mermaid state');
    } catch (e) {
      console.warn('Could not clear mermaid state:', e);
    }
    
    // Initialize mermaid with appropriate settings
    console.log('Initializing mermaid');
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Roboto, sans-serif',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        useMaxWidth: false
      },
      logLevel: 4, // Set to verbose logging for debugging
      er: { useMaxWidth: false },
      sequence: { useMaxWidth: false },
      gantt: { useMaxWidth: false }
    });
    
    const renderDiagram = async () => {
      if (!flow || !flowDetails) {
        console.warn('Missing flow or flowDetails, cannot render diagram');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setIsRendering(true);
        
        // Generate a safe ID by removing problematic characters
        const safeId = flow.id.replace(/[^a-zA-Z0-9-_]/g, '-');
        const diagramId = `flowdiagram-${safeId}-${Date.now()}`;
        console.log(`Using diagram ID: ${diagramId}`);
        
        // We'll use the flowDetails directly rather than fetching them again
        // No need to call getFlowDetailsWithChildren here
        
        // Generate the diagram from the flow details
        const diagramDefinition = generateFlowDiagram(flowDetails);
        console.log('Generated diagram definition length:', diagramDefinition.length);
        console.log('First 100 chars of diagram:', diagramDefinition.substring(0, 100));
        
        // Log parsed diagram details for debugging
        try {
          console.log('Attempting to parse diagram with mermaid.parse');
          await mermaid.parse(diagramDefinition);
          console.log('Diagram parsed successfully');
        } catch (parseError) {
          console.error('Mermaid parse error:', parseError);
          // Continue with rendering despite parse error - mermaid.init may still work
        }
        
        if (containerRef.current) {
          // Clear existing content
          console.log('Container ref is available, clearing previous content');
          containerRef.current.innerHTML = '';
          
          // Create a container for the diagram
          console.log('Creating diagram container');
          const diagramContainer = document.createElement('div');
          diagramContainer.id = diagramId;
          diagramContainer.innerHTML = generateSimplifiedFlowDiagram(flowDetails);
          containerRef.current.appendChild(diagramContainer);
          
          // Render the simplified diagram with mermaid
          console.log('Using simplified flow diagram (1881 chars, first 100 chars):\n' + 
                    diagramContainer.innerHTML.substring(0, 100) + '...');
          
          // Use mermaid.init to render all diagrams in the container
          console.log(`Attempting to render flow diagram with ID: ${diagramId}`);
          try {
            console.log('Using mermaid.init to process all diagrams in the container');
            await mermaid.init(undefined, document.querySelectorAll(`#${diagramId}`));
            
            // Get the rendered SVG and store it in state
            console.log('Flow diagram rendered successfully with simplified method');
            const svgElement = diagramContainer.querySelector('svg');
            if (svgElement) {
              setSvg(svgElement.outerHTML);
            }
          } catch (renderError) {
            console.error('Error rendering diagram with mermaid.init:', renderError);
            setError(`Failed to render diagram: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`);
          }
        } else {
          console.warn('Container ref is not available, cannot render diagram');
          setError('Cannot render diagram: container not available');
        }
      } catch (err) {
        console.error('Error rendering diagram:', err);
        setError(`Error rendering diagram: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
        setIsRendering(false);
      }
    };
    
    if (flow && flowDetails) {
      console.log('Flow and details available, starting render process');
      renderDiagram();
    } else {
      console.warn('Missing flow or flow details, cannot render');
      setLoading(false);
    }
    
    // Cleanup function
    return () => {
      console.log('FlowVisualizer unmounting, cleaning up');
      // Any cleanup needed
    };
  }, [flow, flowDetails, generateFlowDiagram, generateSimplifiedFlowDiagram, isRendering]);
  
  // Convert SVG to PNG
  const convertSvgToPng = async (svgString: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary container for the SVG
        const container = document.createElement('div');
        container.innerHTML = svgString;
        const svgElement = container.querySelector('svg');
        
        if (!svgElement) {
          throw new Error('No SVG element found');
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Create image from SVG
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the image
          ctx.drawImage(img, 0, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          }, 'image/png');
          
          // Clean up
          URL.revokeObjectURL(url);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG image'));
        };

        img.src = url;
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handle downloads
  const handleDownloadSVG = async () => {
    if (!svg) return;
    
    try {
      const fileName = `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}_flow_diagram.svg`;
      await download(svg, fileName, 'image/svg+xml');
    } catch (error) {
      console.error('Error downloading SVG:', error);
      message.error('Failed to download SVG file');
    }
  };

  const handleDownloadPNG = async () => {
    if (!svg) return;
    
    try {
      const pngBlob = await convertSvgToPng(svg);
      const fileName = `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}_flow_diagram.png`;
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          await download(reader.result.split(',')[1], fileName, 'image/png');
        }
      };
      reader.readAsDataURL(pngBlob);
    } catch (error) {
      console.error('Error downloading PNG:', error);
      message.error('Failed to download PNG file');
    }
  };

  const downloadItems: MenuProps['items'] = [
    {
      key: 'svg',
      label: 'Download as SVG',
      onClick: handleDownloadSVG,
    },
    {
      key: 'png',
      label: 'Download as PNG',
      onClick: handleDownloadPNG,
    },
  ];
  
  // Handle zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2.5));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const handleResetZoom = () => {
    setZoom(1);
  };

  // Generate flow details 
  const renderFlowDetails = () => {
    if (!flowDetails) return null;
    
    // Count the types of nodes in the flow
    const triggerCount = flowDetails.triggers?.length || 0;
    const actionCount = flowDetails.actions?.length || 0;
    
    // Count the connectors used in the flow
    const connectorCount = flowDetails.connectionReferences?.length || 0;
    const connectors = flowDetails.connectionReferences?.map(c => c.displayName) || [];
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>Flow Details</h3>
        <p>
          <strong>Triggers:</strong> {triggerCount} | 
          <strong> Actions:</strong> {actionCount} | 
          <strong> Connectors:</strong> {connectorCount}
        </p>
        {connectors.length > 0 && (
          <p>
            <strong>Connectors used:</strong> {connectors.join(', ')}
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div style={{ padding: '8px' }}>
      <Card
        title={flow?.name || 'Flow Diagram'}
        extra={
          <Space>
            <Dropdown menu={{ items: downloadItems }} disabled={!svg}>
              <Button type="text" icon={<DownloadOutlined />}>
                Download
              </Button>
            </Dropdown>
            <Tooltip title="Zoom In">
              <Button
                type="text"
                icon={<ZoomInOutlined />}
                onClick={handleZoomIn}
              />
            </Tooltip>
            <Tooltip title="Zoom Out">
              <Button
                type="text"
                icon={<ZoomOutOutlined />}
                onClick={handleZoomOut}
              />
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <Button
                type="text"
                icon={<FullscreenOutlined />}
                onClick={handleResetZoom}
              />
            </Tooltip>
          </Space>
        }
      >
        {renderFlowDetails()}
        
        <Divider />
      
        <div 
          style={{ 
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
            padding: '16px',
            minHeight: '300px', 
            position: 'relative',
            overflow: 'auto'
          }}
        >
          {loading && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.7)'
            }}>
              <Spin />
              <div style={{ marginLeft: '10px' }}>Rendering diagram...</div>
            </div>
          )}
          
          {error && (
            <div style={{ color: 'red', padding: '16px', textAlign: 'center' }}>
              <p>Error rendering diagram:</p>
              <pre>{error}</pre>
            </div>
          )}
          
          <div 
            ref={containerRef} 
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.3s ease-in-out',
              display: 'flex',
              justifyContent: 'center',
              width: '100%'
            }}
          />

          {!loading && !error && (!svg || svg.trim() === '') && (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <p>No diagram could be generated for this flow.</p>
              <p>The flow may not have proper triggers or actions defined.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 