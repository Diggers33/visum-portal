import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n'; // Import i18n configuration
import App from './App';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster position="top-right" />
  </>,
);
