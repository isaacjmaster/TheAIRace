// Only selected by scripts/build-display-test.mjs; never part of a normal build.
import {installDisplayDiagnostics} from './ui/displayDiagnostics';
installDisplayDiagnostics(true);
void import('./main');
