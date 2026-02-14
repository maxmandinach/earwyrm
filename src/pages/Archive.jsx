import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import History from './History'
import Collections from './Collections'

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = searchParams.get('view') === 'collections' ? 'collections' : 'memory-lane'
  const [activeView, setActiveView] = useState(initialView)

  useEffect(() => {
    const view = searchParams.get('view')
    if (view === 'collections') {
      setActiveView('collections')
    }
  }, [searchParams])

  const handleViewChange = (view) => {
    setActiveView(view)
    if (view === 'collections') {
      setSearchParams({ view: 'collections' })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Segmented toggle */}
      <div className="max-w-lg mx-auto w-full px-4 pt-8 pb-2">
        <div
          className="flex items-center justify-center gap-0 p-1 mx-auto w-fit"
          style={{
            backgroundColor: 'var(--surface-card, #F5F2ED)',
            border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          }}
        >
          <button
            onClick={() => handleViewChange('memory-lane')}
            className="px-5 py-2 text-sm transition-all duration-200"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1rem',
              backgroundColor: activeView === 'memory-lane'
                ? 'var(--text-primary, #2C2825)'
                : 'transparent',
              color: activeView === 'memory-lane'
                ? 'var(--surface-elevated, #FAF8F5)'
                : 'var(--text-muted, #9C948A)',
            }}
          >
            memory lane
          </button>
          <button
            onClick={() => handleViewChange('collections')}
            className="px-5 py-2 text-sm transition-all duration-200"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1rem',
              backgroundColor: activeView === 'collections'
                ? 'var(--text-primary, #2C2825)'
                : 'transparent',
              color: activeView === 'collections'
                ? 'var(--surface-elevated, #FAF8F5)'
                : 'var(--text-muted, #9C948A)',
            }}
          >
            collections
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeView === 'memory-lane' ? <History embedded /> : <Collections />}
      </div>
    </div>
  )
}
