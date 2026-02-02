import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LyricProvider } from './contexts/LyricContext'
import { CollectionProvider } from './contexts/CollectionContext'
import { FollowProvider } from './contexts/FollowContext'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { initializePageTexture } from './lib/paperTexture'

// Initialize the beautiful paper background texture
initializePageTexture()

createRoot(document.getElementById('root')).render(
  // <StrictMode> - Temporarily disabled due to React 19 + Supabase compatibility issue
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <LyricProvider>
            <CollectionProvider>
              <FollowProvider>
                <App />
              </FollowProvider>
            </CollectionProvider>
          </LyricProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  // </StrictMode>
)
