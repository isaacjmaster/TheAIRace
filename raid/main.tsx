import { createRoot } from 'react-dom/client';
import { RaidScreen } from './RaidScreen';
import './standalone.css';

// Standalone launcher. A future app can mount RaidScreen with its own lifecycle.
createRoot(document.getElementById('root')!).render(<RaidScreen/>);
