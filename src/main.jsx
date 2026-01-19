import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LyricProvider } from './contexts/LyricContext'
import { CollectionProvider } from './contexts/CollectionContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  // <StrictMode> - Temporarily disabled due to React 19 + Supabase compatibility issue
    <BrowserRouter>
      <AuthProvider>
        <LyricProvider>
          <CollectionProvider>
            <App />
          </CollectionProvider>
        </LyricProvider>
      </AuthProvider>
    </BrowserRouter>
  // </StrictMode>
)
