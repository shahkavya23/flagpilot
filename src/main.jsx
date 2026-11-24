import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import flagsmith from '@flagsmith/flagsmith'
import { FlagsmithProvider } from '@flagsmith/flagsmith/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FlagsmithProvider
      flagsmith={flagsmith}
      options={{
        environmentID: import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_ID,
        enableAnalytics: true,
      }}
    >
      <App />
    </FlagsmithProvider>
  </StrictMode>,
)
