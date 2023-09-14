import React, { useState, useEffect } from 'react';
import { Tree } from 'antd';
import { useFetchEntities } from '../../../powertools';
import { usePowerToolsApi } from '../../../powertools/hooks/usePowerToolsApi';

interface Entity {
  name: string;
  attributes: string[];
}

const TreeBuilderControl: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const fetchedEntities = useFetchEntities();
  
  // Destructure the get method (and any other methods you need) from the usePowerToolsApi hook
  const { get } = usePowerToolsApi();

  useEffect(() => {
    // Check if get is defined
    if (!get) {
      return;
    }

    // For each entity, fetch its attributes
    // Promise.all(
    //   fetchedEntities.map((entity: Entity) =>
    //     // Use the destructured get method here
    //     get(`/api/data/v9.2/entities/${entity.name}/attributes`).then(attributes => ({
    //       name: entity.name,
    //       attributes: attributes.map((attr: any) => attr.name)
    //     }))
    //   )
    // ).then(result => {
    //   setEntities(result);
    // });
  }, [fetchedEntities, get]); // Add get to the dependency array

  const generateTreeData = (data: Entity[]) => {
    return data.map(item => ({
      title: item.name,
      key: item.name,
      children: item.attributes.map(attr => ({
        title: attr,
        key: attr
      }))
    }));
  };

  return (
    <div className="tree-builder-control">
      <Tree
        showLine={true}
        treeData={generateTreeData(entities)}
      />
    </div>
  );
};

export default TreeBuilderControl;
