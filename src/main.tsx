import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import AccessGate from './access/AccessGate';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AccessGate>
      <HashRouter>
        <App />
      </HashRouter>
    </AccessGate>
  </React.StrictMode>,
);
