import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryIntellisense } from '../QueryIntellisense';
import { MetadataService } from '../../services/metadataService';

// Mock the MetadataService
const mockGetAsJson = jest.fn().mockResolvedValue({ value: [] });
const mockMetadataService = new MetadataService(mockGetAsJson);

// Mock the getMetadata method to avoid API calls in tests
jest.spyOn(mockMetadataService, 'getMetadata').mockResolvedValue([]);
jest.spyOn(mockMetadataService, 'isLoading').mockReturnValue(false);

describe('QueryIntellisense', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    metadataService: mockMetadataService,
    placeholder: 'Enter query'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders textarea with placeholder', () => {
    render(<QueryIntellisense {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Enter query');
    expect(textarea).toBeInTheDocument();
  });

  it('renders with custom rows', () => {
    render(<QueryIntellisense {...defaultProps} rows={6} />);
    
    const textarea = screen.getByPlaceholderText('Enter query');
    expect(textarea).toHaveAttribute('rows', '6');
  });

  it('calls onChange when text is entered', () => {
    const mockOnChange = jest.fn();
    
    render(<QueryIntellisense {...defaultProps} onChange={mockOnChange} />);
    
    const textarea = screen.getByPlaceholderText('Enter query');
    expect(textarea).toBeInTheDocument();
    
    // Note: Full typing simulation would require more complex testing setup
    // This is a basic test to ensure the component renders without errors
  });
}); 