import {createRoot} from 'react-dom/client';
import {registerPWA} from './pwa';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')!).render(<App/>);
registerPWA();
