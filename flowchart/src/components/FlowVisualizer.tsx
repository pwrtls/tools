import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Flow, FlowDetails, FlowAnalysisResult } from '../models/Flow';
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
  flowAnalysis?: FlowAnalysisResult;
}

export const FlowVisualizer: React.FC<FlowVisualizerProps> = ({ flow, flowDetails, flowAnalysis }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const [shortcutMessageShown, setShortcutMessageShown] = useState(false);
  const [renderAttempts, setRenderAttempts] = useState(0); // Track render attempts
  
  // Add pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  
  const { generateFlowDiagram } = useFlowService();
  const { download } = usePowerToolsApi();

  // Track whether the wheel event listener has been added
  const wheelListenerAdded = useRef(false);

  // Use debugging function
  const debugLog = (message: string, ...args: any[]) => {
    // Skip wheel-related logs to prevent console flooding
    if (message.includes('wheel') || message.includes('Wheel')) {
      return;
    }
    console.log(`[FlowVisualizer] ${message}`, ...args);
  };

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
    
    // Initialize mermaid only once with appropriate settings
    try {
      // Initialize mermaid with updated configuration
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
        logLevel: 0, // 0=error only (complete silence except for errors)
        er: { useMaxWidth: false },
        sequence: { useMaxWidth: false },
        gantt: { useMaxWidth: false }
      });
    } catch (e) {
      console.warn('Could not initialize mermaid:', e);
    }
    
    const renderDiagram = async () => {
      if (!flow || !flowDetails) {
        console.warn('Missing flow or flowDetails, cannot render diagram');
        setLoading(false);
        return;
      }
      
      // Prevent excessive re-rendering
      if (isRendering) {
        console.log('Already rendering, skipping');
        return;
      }

      // Track render attempts to avoid infinite loops
      if (renderAttempts > 3) {
        console.log('Too many render attempts, aborting');
        setLoading(false);
        setError('Failed to render diagram after multiple attempts');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setIsRendering(true);
        setRenderAttempts(prev => prev + 1);
        
        debugLog('Starting diagram rendering', { 
          flowId: flow.id,
          renderAttempt: renderAttempts + 1
        });
        
        // Reset pan position when rendering a new diagram
        setPanPosition({ x: 0, y: 0 });
        
        // Generate a safe ID by removing problematic characters
        const safeId = flow.id.replace(/[^a-zA-Z0-9-_]/g, '-');
        const diagramId = `flowdiagram-${safeId}-${Date.now()}`;
        debugLog(`Using diagram ID: ${diagramId}`);
        
        // First generate the diagram definition
        const diagramDefinition = generateFlowDiagram(flowDetails);
        debugLog('Generated diagram definition', { 
          length: diagramDefinition.length, 
          preview: diagramDefinition.substring(0, 100) + '...' 
        });
        
        // Use mermaid.render directly
        try {
          debugLog('Attempting to render with mermaid.render...');
          const { svg: renderedSvg } = await mermaid.render(diagramId, diagramDefinition);
          
          if (renderedSvg) {
            debugLog(`Render successful! SVG length: ${renderedSvg.length}`);
            setSvg(renderedSvg);
            debugLog("SVG set in state, length:", renderedSvg.length);
          } else {
            throw new Error('Mermaid rendering did not produce SVG output');
          }
        } catch (renderError) {
          debugLog('Error with mermaid.render, trying fallback approach', renderError);
          
          // Fallback to DOM-based approach
          if (containerRef.current) {
            // Clear existing content
            containerRef.current.innerHTML = '';
            
            // Create a container for the diagram
            const diagramContainer = document.createElement('div');
            diagramContainer.id = diagramId;
            diagramContainer.innerHTML = diagramDefinition;
            containerRef.current.appendChild(diagramContainer);
            
            // Allow the DOM to update before rendering
            await new Promise(resolve => setTimeout(resolve, 200)); 
            
            try {
              // Use mermaid.run (replacement for init)
              await mermaid.run({
                nodes: document.querySelectorAll(`#${diagramId}`)
              });
              
              // Get the rendered SVG
              const svgElement = containerRef.current.querySelector('svg');
              if (svgElement) {
                debugLog('Fallback rendering successful, found SVG');
                const svgContent = svgElement.outerHTML;
                setSvg(svgContent);
                debugLog("SVG set in state via fallback, length:", svgContent.length);
              } else {
                throw new Error('No SVG element found after fallback rendering');
              }
            } catch (fallbackError) {
              debugLog('Fallback rendering also failed', fallbackError);
              setError(`Failed to render diagram: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
            }
          }
        }
      } catch (err) {
        debugLog('Error in render process', err);
        setError(`Error rendering diagram: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        debugLog('Rendering process complete, setting loading=false, isRendering=false');
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
  }, [flow, flowDetails, generateFlowDiagram, isRendering, renderAttempts]);
  
  // Convert SVG to PNG
  const convertSvgToPng = async (svgString: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Create an SVG with proper XML declaration
        const svgWithXmlDeclaration = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgString}`;
        
        // Convert SVG to a base64 data URL to avoid cross-origin issues
        const encodedSvg = encodeURIComponent(svgWithXmlDeclaration)
          .replace(/'/g, '%27')
          .replace(/"/g, '%22');
        
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
        
        // Create and load the image
        const img = new Image();
        
        img.onload = () => {
          try {
            // Create canvas with appropriate dimensions
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 1200;
            canvas.height = img.height || 900;
            
            // Get the canvas context
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }
            
            // Draw white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the image
            ctx.drawImage(img, 0, 0);
            
            // Convert to URL for download
            const downloadUrl = canvas.toDataURL('image/png');
            
            // Convert the data URL to a Blob
            const byteString = atob(downloadUrl.split(',')[1]);
            const mimeType = downloadUrl.split(',')[0].split(':')[1].split(';')[0];
            
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([ab], {type: mimeType});
            resolve(blob);
          } catch (error) {
            console.error('Error processing canvas:', error);
            reject(error);
          }
        };
        
        img.onerror = (event) => {
          console.error('Image load error:', event);
          reject(new Error(`Failed to load SVG image: ${event}`));
        };
        
        // Set the source to load the image
        img.src = dataUrl;
      } catch (error) {
        console.error('SVG conversion error:', error);
        reject(error);
      }
    });
  };

  // Handle downloads
  const handleDownloadSVG = async () => {
    if (!svg) return;
    
    try {
      // Fix XML issues with HTML tags by properly converting HTML to XHTML
      // Replace self-closing tags that need proper XML formatting
      let cleanedSvg = svg
        .replace(/<br>/g, '<br/>')
        .replace(/<hr>/g, '<hr/>')
        .replace(/<img([^>]*)>/g, '<img$1/>')
        .replace(/<input([^>]*)>/g, '<input$1/>')
        // Fix unclosed spans or other mismatched tags if present
        .replace(/<br([^>]*)><\/span>/g, '<br$1/></span>')
        // Replace HTML entities with XML entities
        .replace(/&nbsp;/g, '&#160;');
      
      // Serialize and re-parse to ensure well-formed XML
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(cleanedSvg, 'image/svg+xml');
        
        // Check for parsing errors
        const parserErrors = xmlDoc.getElementsByTagName('parsererror');
        if (parserErrors.length > 0) {
          console.warn('XML parsing errors detected, falling back to basic cleanup:', 
            parserErrors[0].textContent);
        } else {
          // Re-serialize if no errors to ensure clean XML
          const serializer = new XMLSerializer();
          cleanedSvg = serializer.serializeToString(xmlDoc);
        }
      } catch (parseError) {
        console.warn('Error during XML parsing cleanup:', parseError);
        // Continue with the basic cleaned version
      }
      
      const fileName = `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}_flow_diagram.svg`;
      await download(cleanedSvg, fileName, 'image/svg+xml');
    } catch (error) {
      console.error('Error downloading SVG:', error);
      message.error('Failed to download SVG file');
    }
  };

  const handleDownloadPNG = async () => {
    if (!svg) return;
    
    try {
      // Fix any XML issues in the SVG
      let cleanedSvg = svg
        .replace(/<br>/g, '<br/>')
        .replace(/<hr>/g, '<hr/>')
        .replace(/<img([^>]*)>/g, '<img$1/>')
        .replace(/<input([^>]*)>/g, '<input$1/>');
      
      // Create a sanitized file name
      const fileName = `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}_flow_diagram.png`;
      
      // APPROACH 1: Create a larger canvas for better quality
      const svgElement = new DOMParser().parseFromString(cleanedSvg, 'image/svg+xml').documentElement;
      
      // Get original SVG dimensions
      const rect = svgElement.getBoundingClientRect();
      const width = Math.max(rect.width, 800);
      const height = Math.max(rect.height, 600);
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;  // Multiply by 2 for better resolution
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Create image from SVG
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanedSvg);
      
      // Wait for image to load, then draw to canvas
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Draw the image scaled up to fill the canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(null);
        };
        img.onerror = reject;
      });
      
      // Try direct download approach
      const link = document.createElement('a');
      link.download = fileName;
      
      // First try the blob approach
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
            'image/png',
            1.0 // Use maximum quality
          );
        });
        
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        return;
      } catch (blobError) {
        console.warn('Blob approach failed, trying data URL method:', blobError);
      }
      
      // Fallback to data URL method
      try {
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (dataUrlError) {
        console.error('Data URL approach also failed:', dataUrlError);
        message.error('PNG export failed. Security settings may be preventing canvas export.');
        throw dataUrlError;
      }
    } catch (error) {
      console.error('Error in PNG export:', error);
      message.error(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    setPanPosition({ x: 0, y: 0 });
  };

  // Add panning handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only start panning on left mouse button
    if (e.button !== 0) return;
    
    setIsPanning(true);
    setStartPanPosition({
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    });
    
    // Change cursor to indicate panning
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  // Add keyboard event handler for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the container has focus or is a parent of the active element
      const containerElement = containerRef.current;
      if (!containerElement) return;
      
      // Only handle keyboard events when diagram is visible and container is in view
      const rect = containerElement.getBoundingClientRect();
      const isVisible = 
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;
      
      if (!isVisible) return;

      // Handle zoom shortcuts
      if ((e.key === '+' || e.key === '=') || (e.ctrlKey && (e.key === '+' || e.key === '='))) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.key === '-' || e.key === '_') || (e.ctrlKey && (e.key === '-' || e.key === '_'))) {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    // Add the event listener
    window.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleZoomIn, handleZoomOut, handleResetZoom]);  // Include handlers in dependency array

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    
    const newX = e.clientX - startPanPosition.x;
    const newY = e.clientY - startPanPosition.y;
    
    setPanPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    
    // Reset cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  // Add event to handle case when mouse leaves the component while panning
  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false);
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    }
  };

  // Properly memoize the wheel handler with useCallback
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only zoom if Ctrl key is pressed
    if (e.ctrlKey) {
      // Stop propagation and prevent default to ensure parent window doesn't scroll
      e.stopPropagation();
      e.preventDefault();
      
      if (e.deltaY < 0) {
        // Scroll up - zoom in
        setZoom(prev => Math.min(prev + 0.1, 2.5));
      } else {
        // Scroll down - zoom out
        setZoom(prev => Math.max(prev - 0.1, 0.5));
      }
    }
    // If Ctrl is not pressed, let the default scroll behavior happen
  }, []);

  // Add wheel event listener with non-passive option, using wheelListenerAdded ref
  useEffect(() => {
    // Only attach event listener when SVG is rendered and visible
    if (!svg || loading) {
      debugLog('Skipping wheel listener - SVG not ready or still loading');
      return;
    }
    
    const container = containerRef.current;
    if (!container) {
      debugLog('Skipping wheel listener - container ref not available');
      return;
    }
    
    // Remove previous listener if it exists
    if (wheelListenerAdded.current) {
      debugLog('Removing existing wheel listener before adding a new one');
      container.removeEventListener('wheel', handleWheel);
      wheelListenerAdded.current = false;
    }

    // Mark that we're adding the listener
    wheelListenerAdded.current = true;
    
    // Add wheel event with the non-passive option
    debugLog('Adding wheel event listener to container');
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      // Only try to remove if the container still exists
      if (container) {
        debugLog('Cleanup: removing wheel event listener');
        container.removeEventListener('wheel', handleWheel);
        wheelListenerAdded.current = false;
      }
    };
  }, [svg, loading, handleWheel]); // Add svg and loading as dependencies

  useEffect(() => {
    // Show keyboard shortcut message once after diagram loads
    if (svg && !shortcutMessageShown && !loading) {
      setShortcutMessageShown(true);
      message.info(
        'Keyboard shortcuts: + to zoom in, - to zoom out, 0 to reset zoom. Hold Ctrl + mouse wheel to zoom.',
        4 // Display for 4 seconds to give users time to read
      );
    }
  }, [svg, loading, shortcutMessageShown]);

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <Space>
          <Dropdown menu={{ items: downloadItems }} disabled={!svg}>
            <Button type="text" icon={<DownloadOutlined />}>
              Download
            </Button>
          </Dropdown>
          <Tooltip title="Zoom In (+ key or Ctrl + mouse wheel up)">
            <Button
              type="text"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
            />
          </Tooltip>
          <Tooltip title="Zoom Out (- key or Ctrl + mouse wheel down)">
            <Button
              type="text"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
            />
          </Tooltip>
          <Tooltip title="Reset Zoom (0 key)">
            <Button
              type="text"
              icon={<FullscreenOutlined />}
              onClick={handleResetZoom}
            />
          </Tooltip>
        </Space>
      </div>
      
      <div 
        style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px',
          minHeight: '300px', 
          position: 'relative',
          overflow: 'hidden' // Change to hidden to prevent scrollbars during loading
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        // Add onWheel prop to capture wheel events with React's synthetic events
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            
            if (e.deltaY < 0) {
              // Scroll up - zoom in
              setZoom(prev => Math.min(prev + 0.1, 2.5));
            } else {
              // Scroll down - zoom out
              setZoom(prev => Math.max(prev - 0.1, 0.5));
            }
          }
        }}
      >
        {/* Loading indicator */}
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.9)',
            zIndex: 20
          }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', fontWeight: 'bold' }}>Generating Flowchart...</div>
          </div>
        )}
        
        {/* Error display */}
        {error && !svg && (
          <div style={{ color: 'red', padding: '16px', textAlign: 'center' }}>
            <p>Error rendering diagram:</p>
            <pre>{error}</pre>
          </div>
        )}
        
        {/* Diagram display - simplified to use dangerouslySetInnerHTML instead of ref manipulation */}
        {svg && !loading && (
          <div 
            style={{ 
              transform: `scale(${zoom}) translate(${panPosition.x}px, ${panPosition.y}px)`,
              transformOrigin: 'top center',
              transition: isPanning ? 'none' : 'transform 0.3s ease-in-out',
              cursor: 'grab',
              minHeight: '200px'
            }}
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}

        {/* Empty state message */}
        {!loading && !svg && !error && (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>No diagram could be generated for this flow.</p>
            <p>The flow may not have proper triggers or actions defined.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 