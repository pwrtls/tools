import React, { useState, useEffect } from 'react';
import { Table, Button } from 'antd';

import { IConversionMapping } from '../models/conversion';
import { getConversionMappings, saveConversionMapping } from '../services/conversionService';

export const ConversionMapping: React.FC = () => {
  const [mappings, setMappings] = useState<IConversionMapping[]>([]);

  useEffect(() => {
    const loadMappings = async () => {
      const res = await getConversionMappings();
      setMappings(res);
    };

    loadMappings();
  }, []);

  const handleSaveMapping = (mapping: IConversionMapping) => {
    saveConversionMapping(mapping).then(() => {
      setMappings([...mappings, mapping]);
    });
  };

  return (
    <div>
      <h2>Conversion Mapping</h2>
      <Table dataSource={mappings} /* columns and other props */ />
      <Button>Add Mapping</Button>
    </div>
  );
};
