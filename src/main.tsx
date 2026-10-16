import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/FoundationApp';
import './styles.css';
import {installViewport} from './ui/viewport';
// Keep one viewport listener for the lifetime of this application.
installViewport(window,document.documentElement);
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
