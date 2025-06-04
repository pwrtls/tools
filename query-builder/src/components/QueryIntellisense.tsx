import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, List, Typography, Spin, Tag } from 'antd';
import { DatabaseOutlined, FieldStringOutlined } from '@ant-design/icons';
import { MetadataService } from '../services/metadataService';
import { QueryParser } from '../utils/queryParser';

const { TextArea } = Input;
const { Text } = Typography;

interface Suggestion {
  type: 'entity' | 'attribute';
  value: string;
  displayName?: string;
  description?: string;
  attributeType?: string;
}

interface QueryIntellisenseProps {
  value: string;
  onChange: (value: string) => void;
  metadataService: MetadataService;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
}

// Helper function to extract display name from complex Dataverse format
const getDisplayName = (displayName: any): string => {
  if (typeof displayName === 'string') {
    return displayName;
  }
  
  if (displayName?.UserLocalizedLabel?.Label) {
    return displayName.UserLocalizedLabel.Label;
  }
  
  if (displayName?.LocalizedLabels && displayName.LocalizedLabels.length > 0) {
    return displayName.LocalizedLabels[0].Label;
  }
  
  return '';
};

export const QueryIntellisense: React.FC<QueryIntellisenseProps> = ({
  value,
  onChange,
  metadataService,
  placeholder,
  rows = 4,
  style
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  
  // Use 'any' type to access Ant Design's internal textarea
  const textAreaRef = useRef<any>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Check metadata loading status and show debug info
  useEffect(() => {
    if (metadataService) {
      // Check if metadata is already loaded or loading
      const checkMetadataStatus = async () => {
        setIsLoading(true); // Assume loading initially
        try {
          const entities = metadataService.searchEntities('');
          
          if (entities.length > 0) {
            // We have entities - enable the interface immediately
            console.log('QueryIntellisense: Metadata available:', entities.length, 'entities');
            setIsLoading(false);
            
            // Debug: Log first 10 entities to see what's available
            console.log('QueryIntellisense: First 10 entities:', entities.slice(0, 10).map(e => ({
              LogicalName: e.LogicalName,
              DisplayName: getDisplayName(e.DisplayName)
            })));
            
            // Look for account-related entities specifically  
            const accountEntities = entities.filter(e => 
              e.LogicalName.toLowerCase().includes('account')
            );
            console.log('QueryIntellisense: Account-related entities:', accountEntities.map(e => ({
              LogicalName: e.LogicalName,
              DisplayName: getDisplayName(e.DisplayName)
            })));
            
          } else {
            // No entities yet - wait for background loading to complete
            console.log('QueryIntellisense: No metadata available yet, waiting for background load...');
            
            const waitForMetadata = () => {
              setTimeout(async () => {
                const newEntities = metadataService.searchEntities('');
                if (newEntities.length > 0) {
                  console.log('QueryIntellisense: Metadata now available:', newEntities.length, 'entities');
                  setIsLoading(false);
                } else if (metadataService.isLoading()) {
                  // Still actively loading, keep waiting
                  waitForMetadata();
                } else {
                  // Not loading and no entities - assume it failed
                  console.log('QueryIntellisense: Metadata loading appears to have failed or is empty');
                  setIsLoading(false);
                }
              }, 500);
            };
            waitForMetadata();
          }
        } catch (error) {
          console.error('QueryIntellisense: Error checking metadata status:', error);
          setIsLoading(false);
        }
      };
      
      checkMetadataStatus();
    } else {
      // No metadata service yet - show loading
      setIsLoading(true);
    }
  }, [metadataService]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && suggestionListRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex, showSuggestions]);

  // Calculate cursor position for suggestions
  const calculateSuggestionPosition = useCallback((textArea: HTMLTextAreaElement, position: number) => {
    // Safety check - ensure textArea is valid
    if (!textArea || !textArea.isConnected) {
      console.warn('QueryIntellisense: Invalid textArea passed to calculateSuggestionPosition');
      return { top: 0, left: 0 };
    }

    try {
      // Create a mirror div to calculate text position
      const mirror = document.createElement('div');
      const styles = window.getComputedStyle(textArea);
      
      // Copy styles to mirror
      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.fontFamily = styles.fontFamily;
      mirror.style.fontSize = styles.fontSize;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.padding = styles.padding;
      mirror.style.border = styles.border;
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.width = `${textArea.offsetWidth}px`;
      
      document.body.appendChild(mirror);
      
      // Get text up to cursor
      const textBeforeCursor = value.substring(0, position);
      mirror.textContent = textBeforeCursor;
      
      // Create a span for the cursor position
      const cursorSpan = document.createElement('span');
      cursorSpan.textContent = '|';
      mirror.appendChild(cursorSpan);
      
      const rect = textArea.getBoundingClientRect();
      const cursorRect = cursorSpan.getBoundingClientRect();
      
      document.body.removeChild(mirror);
      
      return {
        top: rect.top + (cursorRect.top - mirror.getBoundingClientRect().top) + 20,
        left: rect.left + (cursorRect.left - mirror.getBoundingClientRect().left)
      };
    } catch (error) {
      console.error('QueryIntellisense: Error calculating suggestion position:', error);
      return { top: 0, left: 0 };
    }
  }, [value]);

  // Generate suggestions based on query context
  const generateSuggestions = useCallback(async (query: string, position: number) => {
    console.log('QueryIntellisense: Generating suggestions for query:', query, 'at position:', position);
    
    if (metadataService.isLoading()) {
      console.log('QueryIntellisense: Metadata still loading, no suggestions');
      return [];
    }

    const context = QueryParser.parseQueryContext(query, position);
    console.log('QueryIntellisense: Query context:', context);
    
    const newSuggestions: Suggestion[] = [];

    try {
      await metadataService.getMetadata();

      if (context.type === 'entity') {
        console.log('QueryIntellisense: Looking for entity suggestions with query:', context.currentWord);
        // Suggest entity logical names (users see familiar names like "account", "contact")
        const filteredEntities = metadataService.searchEntities(context.currentWord);
        console.log('QueryIntellisense: Found', filteredEntities.length, 'matching entities');
        filteredEntities.slice(0, 10).forEach(entity => {
          const displayName = getDisplayName(entity.DisplayName);
          newSuggestions.push({
            type: 'entity',
            value: entity.LogicalName, // Use logical name for user-facing suggestions
            displayName: displayName,
            description: `Table: ${entity.LogicalName}`
          });
        });
      } else if (context.type === 'attribute' && context.entityName) {
        console.log('QueryIntellisense: Looking for attribute suggestions for entity:', context.entityName, 'with query:', context.currentWord);
        // Use the entity name directly (it should be the logical name from user input)
        const attributes = metadataService.searchAttributes(context.entityName, context.currentWord);
        console.log('QueryIntellisense: Found', attributes.length, 'matching attributes');
        attributes.slice(0, 10).forEach(attribute => {
          const displayName = getDisplayName(attribute.DisplayName);
          newSuggestions.push({
            type: 'attribute',
            value: attribute.LogicalName,
            displayName: displayName,
            description: `${context.entityName}.${attribute.LogicalName}`,
            attributeType: attribute.AttributeType
          });
        });
      } else {
        console.log('QueryIntellisense: No suggestions needed for context type:', context.type);
      }
    } catch (error) {
      console.error('QueryIntellisense: Error generating suggestions:', error);
    }

    console.log('QueryIntellisense: Generated', newSuggestions.length, 'suggestions:', newSuggestions);
    return newSuggestions;
  }, [metadataService]);

  // Handle input changes and trigger suggestions
  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart || 0;
    
    console.log('QueryIntellisense: Input changed:', newValue, 'cursor at:', newCursorPosition);
    
    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // Generate suggestions
    const newSuggestions = await generateSuggestions(newValue, newCursorPosition);
    setSuggestions(newSuggestions);
    setSelectedIndex(0);
    const shouldShow = newSuggestions.length > 0;
    console.log('QueryIntellisense: Setting showSuggestions to:', shouldShow);
    setShowSuggestions(shouldShow);

    // Calculate suggestion position
    if (newSuggestions.length > 0 && textAreaRef.current) {
      const nativeTextArea = textAreaRef.current?.resizableTextArea?.textArea;
      if (nativeTextArea) {
        const position = calculateSuggestionPosition(nativeTextArea, newCursorPosition);
        setSuggestionPosition(position);
        console.log('QueryIntellisense: Suggestion position calculated:', position);
      }
    }
  }, [onChange, generateSuggestions, calculateSuggestionPosition]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    const insertCurrentSuggestion = (suggestion: Suggestion) => {
      const context = QueryParser.parseQueryContext(value, cursorPosition);
      const beforeCursor = value.substring(0, cursorPosition);
      const afterCursor = value.substring(cursorPosition);
      
      let newValue: string;
      let newCursorPosition: number;

      if (context.type === 'attribute' && context.entityName) {
        // Replace the partial attribute name after the dot
        const dotIndex = beforeCursor.lastIndexOf('.');
        const beforeDot = value.substring(0, dotIndex + 1);
        newValue = beforeDot + suggestion.value + afterCursor;
        newCursorPosition = dotIndex + 1 + suggestion.value.length;
      } else {
        // Replace the current word
        const wordStart = beforeCursor.lastIndexOf(' ') + 1;
        const beforeWord = value.substring(0, wordStart);
        newValue = beforeWord + suggestion.value + afterCursor;
        newCursorPosition = wordStart + suggestion.value.length;
      }

      onChange(newValue);
      setCursorPosition(newCursorPosition);
      setShowSuggestions(false);

      // Set cursor position after state update
      setTimeout(() => {
        const nativeTextArea = textAreaRef.current?.resizableTextArea?.textArea;
        if (nativeTextArea) {
          nativeTextArea.setSelectionRange(newCursorPosition, newCursorPosition);
          nativeTextArea.focus();
        }
      }, 0);
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          insertCurrentSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, value, cursorPosition, onChange]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    const context = QueryParser.parseQueryContext(value, cursorPosition);
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    let newValue: string;
    let newCursorPosition: number;

    if (context.type === 'attribute' && context.entityName) {
      // Replace the partial attribute name after the dot
      const dotIndex = beforeCursor.lastIndexOf('.');
      const beforeDot = value.substring(0, dotIndex + 1);
      newValue = beforeDot + suggestion.value + afterCursor;
      newCursorPosition = dotIndex + 1 + suggestion.value.length;
    } else {
      // Replace the current word
      const wordStart = beforeCursor.lastIndexOf(' ') + 1;
      const beforeWord = value.substring(0, wordStart);
      newValue = beforeWord + suggestion.value + afterCursor;
      newCursorPosition = wordStart + suggestion.value.length;
    }

    onChange(newValue);
    setCursorPosition(newCursorPosition);
    setShowSuggestions(false);

    // Set cursor position after state update
    setTimeout(() => {
      const nativeTextArea = textAreaRef.current?.resizableTextArea?.textArea;
      if (nativeTextArea) {
        nativeTextArea.setSelectionRange(newCursorPosition, newCursorPosition);
        nativeTextArea.focus();
      }
    }, 0);
  }, [value, cursorPosition, onChange]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionListRef.current && !suggestionListRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderSuggestionItem = (suggestion: Suggestion, index: number) => (
    <List.Item
      key={`${suggestion.type}-${suggestion.value}`}
      ref={index === selectedIndex ? selectedItemRef : null}
      onClick={() => handleSuggestionClick(suggestion)}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        backgroundColor: index === selectedIndex ? '#f0f0f0' : 'transparent',
        borderRadius: '4px',
        margin: '2px 0'
      }}
      onMouseEnter={() => setSelectedIndex(index)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {suggestion.type === 'entity' ? (
          <DatabaseOutlined style={{ color: '#1890ff' }} />
        ) : (
          <FieldStringOutlined style={{ color: '#52c41a' }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text strong>{suggestion.value}</Text>
            {suggestion.attributeType && (
              <Tag color="blue">{suggestion.attributeType}</Tag>
            )}
          </div>
          {suggestion.displayName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {suggestion.displayName}
            </Text>
          )}
        </div>
      </div>
    </List.Item>
  );

  return (
    <div style={{ position: 'relative', ...style }}>
      <TextArea
        ref={textAreaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? "⏳ Loading entity metadata, please wait..." : placeholder}
        rows={rows}
        disabled={isLoading}
        style={{ 
          fontFamily: 'monospace',
          backgroundColor: isLoading ? '#f5f5f5' : undefined,
          cursor: isLoading ? 'not-allowed' : undefined
        }}
      />
      
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: '8px', 
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Spin size="small" />
          <span style={{ fontSize: '12px', color: '#666' }}>Loading metadata...</span>
        </div>
      )}

      {/* Helper text */}
      <div style={{ 
        fontSize: '11px', 
        color: isLoading ? '#999' : '#8c8c8c', 
        marginTop: '4px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        {isLoading ? (
          <span>⏳ Loading entity metadata from Dataverse...</span>
        ) : (
          <span>💡 Type entity names after FROM, attributes after entity.</span>
        )}
        <span style={{ opacity: isLoading ? 0.5 : 1 }}>
          ⌨️ Use ↑↓ arrows, Tab/Enter to select, Esc to close
        </span>
      </div>

      {showSuggestions && suggestions.length > 0 && !isLoading && (
        <div
          ref={suggestionListRef}
          style={{
            position: 'fixed',
            top: suggestionPosition.top,
            left: suggestionPosition.left,
            backgroundColor: 'white',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            maxHeight: '200px',
            minWidth: '250px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '4px'
          }}
        >
          <List
            size="small"
            dataSource={suggestions}
            renderItem={renderSuggestionItem}
            split={false}
          />
        </div>
      )}
    </div>
  );
}; 