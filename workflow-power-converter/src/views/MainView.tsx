import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Button } from 'antd'; // Import the Button component from antd
import { getWorkflows } from '../services/workflowService'; // Import the getWorkflows function
import { IWorkflow } from '../models/workflows'; // Import the IWorkflow model

export const MainView: React.FC = () => {
  const location = useLocation();
  const [workflows, setWorkflows] = useState<IWorkflow[]>([]); // State to hold the fetched workflows

  useEffect(() => {
    console.log(location);

    // Fetch the workflows when the component mounts
    const fetchWorkflows = async () => {
      try {
        const fetchedWorkflows = await getWorkflows();
        setWorkflows(fetchedWorkflows);
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
      }
    };

    fetchWorkflows();
  }, [location]); // Dependency array

  return (
    <div className="main-container">
      <header className="main-header">
        <h1>Workflow Power Converter</h1>
        <nav>
          {/* Convert list of links to antd Buttons */}
          <Button type="primary" href="#/">Workflow Identification</Button>
          <Button type="primary" href="#/conversion">Workflow Conversion</Button>
          <Button type="primary" href="#/testing">Testing & Validation</Button>
          <Button type="primary" href="#/deployment">Deployment & Monitoring</Button>
          <Button type="primary" href="#/compliance">Compliance & Performance</Button>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
        {/* This will render the specific view based on the route */}
      </main>
    </div>
  );
};