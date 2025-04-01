import React, { useEffect, useState, useRef } from 'react';
import { Flow, FlowDetails } from '../models/Flow';
import { Button, Card, Divider, Tooltip, Spin } from 'antd';
import { DownloadOutlined, FullscreenOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import mermaid from 'mermaid';
import { useFlowService } from '../api/flowService';

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
  
  const { generateFlowDiagram, generateSimplifiedFlowDiagram, getFlowDetailsWithChildren } = useFlowService();

  useEffect(() => {
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
        
        // Generate a safe ID by removing problematic characters
        const safeId = flow.id.replace(/[^a-zA-Z0-9-_]/g, '-');
        const diagramId = `flowdiagram-${safeId}-${Date.now()}`;
        console.log(`Using diagram ID: ${diagramId}`);
        
        // Use getFlowDetailsWithChildren to include child flow details
        const details = await getFlowDetailsWithChildren(flow.id);
        
        // Generate the diagram from the flow details
        const diagramDefinition = generateFlowDiagram(details);
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
        
        // Use a longer timeout to ensure DOM is ready
        setTimeout(async () => {
          try {
            if (!containerRef.current) {
              console.error('Container ref is not available');
              setError('Diagram container not found');
              setLoading(false);
              return;
            }
            
            console.log('Container ref is available, clearing previous content');
            // Clear previous content
            containerRef.current.innerHTML = '';
            
            // Create container for the flow diagram
            console.log('Creating diagram container');
            const diagramContainer = document.createElement('div');
            diagramContainer.id = diagramId; 
            diagramContainer.className = 'mermaid';
            
            // Use the simplified flow diagram generator
            const simplifiedFlowDiagram = generateSimplifiedFlowDiagram(details);
            console.log(`Using simplified flow diagram (${simplifiedFlowDiagram.length} chars, first 100 chars):\n${simplifiedFlowDiagram.substring(0, 100)}...`);
            diagramContainer.textContent = simplifiedFlowDiagram;
            
            // Add the flow diagram container
            containerRef.current.appendChild(diagramContainer);
            
            console.log('Attempting to render flow diagram with ID:', diagramId);
            try {
              // Try the simplest approach for CSP-restricted environments
              console.log('Using mermaid.init to process all diagrams in the container');
              await mermaid.init(undefined, '.mermaid');
              
              // Find the SVG inside the container
              const renderedSvg = containerRef.current.querySelector('.mermaid svg');
              if (renderedSvg) {
                console.log('Flow diagram rendered successfully with simplified method');
                setSvg(renderedSvg.outerHTML);
                setLoading(false);
              } else {
                // Try the standard rendering method as fallback
                console.log('No SVG found with simplified method, trying standard render');
                const renderResult = await mermaid.render(diagramId, simplifiedFlowDiagram);
                console.log('Flow diagram rendered successfully with standard method');
                setSvg(renderResult.svg);
                
                // Replace the container with the rendered SVG
                diagramContainer.innerHTML = renderResult.svg;
                
                setLoading(false);
              }
            } catch (renderError) {
              console.error('Flow diagram rendering failed:', renderError);
              setError(`Failed to render diagram: ${renderError instanceof Error ? renderError.message : String(renderError)}`);
              setLoading(false);
            }
          } catch (err) {
            console.error('Error in rendering process:', err);
            setError(`Rendering error: ${err instanceof Error ? err.message : String(err)}`);
            setLoading(false);
          }
        }, 300); // Longer timeout for iframe environments
      } catch (err) {
        console.error('Error in diagram preparation:', err);
        setError(`Error preparing diagram: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
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
  }, [flow, flowDetails, generateFlowDiagram, generateSimplifiedFlowDiagram, getFlowDetailsWithChildren]);
  
  // Handle download SVG
  const handleDownloadSVG = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}_flow_diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
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
  
  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: '12px' }}>
        <Tooltip title="Download SVG">
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadSVG} 
            disabled={!svg || loading}
            style={{ marginRight: '8px' }}
          >
            Download SVG
          </Button>
        </Tooltip>
        <Tooltip title="Zoom In">
          <Button 
            icon={<ZoomInOutlined />} 
            onClick={handleZoomIn}
            disabled={loading || zoom >= 2.5}
            style={{ marginRight: '4px' }}
          />
        </Tooltip>
        <Tooltip title="Reset Zoom">
          <Button 
            icon={<FullscreenOutlined />} 
            onClick={handleResetZoom}
            disabled={loading}
            style={{ marginRight: '4px' }}
          />
        </Tooltip>
        <Tooltip title="Zoom Out">
          <Button 
            icon={<ZoomOutOutlined />} 
            onClick={handleZoomOut}
            disabled={loading || zoom <= 0.5}
          />
        </Tooltip>
      </div>
      
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
    </div>
  );
}; 