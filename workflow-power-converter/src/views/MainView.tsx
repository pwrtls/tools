import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export const MainView: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    console.log(location);
  }, [location]);

  return (
    <div className="main-container">
      <header className="main-header">
        <h1>Workflow Power Converter</h1>
        <nav>
          <ul>
            <li><a href="#/">Workflow Identification</a></li>
            <li><a href="#/conversion">Workflow Conversion</a></li>
            <li><a href="#/testing">Testing & Validation</a></li>
            <li><a href="#/deployment">Deployment & Monitoring</a></li>
            <li><a href="#/compliance">Compliance & Performance</a></li>
          </ul>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
        {/* This will render the specific view based on the route */}
      </main>
      <footer className="main-footer">
        <p>© 2023 Power Platform Power Tools</p>
      </footer>
    </div>
  );
};

// Optional: Add corresponding CSS classes in your stylesheets