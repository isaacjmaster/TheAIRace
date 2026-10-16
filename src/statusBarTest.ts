// Isolated test entry only. Capture startup geometry without covering the intro.
import './main';
import {installDisplayDiagnostics} from './ui/displayDiagnostics';
const quiet=document.createElement('style');
quiet.textContent='#display-diagnostics{visibility:hidden}';
document.head.append(quiet);
installDisplayDiagnostics(false);
setTimeout(()=>quiet.remove(),2600);
