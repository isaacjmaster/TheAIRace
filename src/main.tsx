import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/FoundationApp';
import './styles.css';
import {installViewport} from './ui/viewport';
// Keep one viewport listener for the lifetime of this application.
installViewport(window,document.documentElement);
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

// This branch and its lazy module are eliminated from production builds.
if(import.meta.env.DEV && (location.pathname==='/diagnostics'||new URLSearchParams(location.search).get('display-diagnostics')==='1')){
 document.querySelector('link[rel="manifest"]')?.setAttribute('href','/diagnostics.webmanifest');
 void import('./ui/displayDiagnostics').then(m=>m.installDisplayDiagnostics());
}
