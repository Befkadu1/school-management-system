import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { makeStore } from './store';
import { createPlatform } from './core/setup';
import { PlatformProvider } from './core/PlatformProvider';
import './styles.css';

const store = makeStore();
// Registers every command, handler and view factory, once, before the app renders.
const platform = createPlatform(store);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PlatformProvider platform={platform}>
        <BrowserRouter><App /></BrowserRouter>
      </PlatformProvider>
    </Provider>
  </StrictMode>,
);
