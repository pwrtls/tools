import React, { useState, useEffect } from 'react';
import { Tree } from 'antd';

interface Entity {
  name: string;
  attributes: string[];
}

const TreeBuilderControl: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    // Fetch entities using window.PowerTools.get
    window.PowerTools.get('/api/data/v9.2/entities').then(fetchedEntities => {
      // For each entity, fetch its attributes
      Promise.all(
        fetchedEntities.map((entity: any) =>
          window.PowerTools.get(`/api/data/v9.2/entities/${entity.name}/attributes`).then(attributes => ({
            name: entity.name,
            attributes: attributes.map((attr: any) => attr.name)
          }))
        )
      ).then(result => {
        setEntities(result);
      });
    });
  }, []);

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