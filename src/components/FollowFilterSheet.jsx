import { useState } from 'react'
import ExploreSearchInput from './ExploreSearchInput'

export default function FollowFilterSheet({ follows, activeFilterIds, onToggleFilter, onSelectAll, onClearAll, onClose }) {
  const [search, setSearch] = useState('')

  const artists = follows.filter(f => f.filter_type === 'artist')
  const songs = follows.filter(f => f.filter_type === 'song')
  const tags = follows.filter(f => f.filter_type === 'tag')

  const q = search.toLowerCase()
  const filterBySearch = (items) =>
    q ? items.filter(f => f.filter_value.toLowerCase().includes(q)) : items

  const sections = [
    { label: 'artists', items: filterBySearch(artists) },
    { label: 'songs', items: filterBySearch(songs) },
    { label: 'tags', items: filterBySearch(tags) },
  ].filter(s => s.items.length > 0)

  const isActive = (f) => activeFilterIds === null || activeFilterIds.has(f.id)

  return (
    <div className="px-5 py-4 space-y-4">
      <ExploreSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search follows..."
        autoFocus
      />

      {/* Select all / Clear all */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSelectAll}
          className="text-xs text-charcoal/50 hover:text-charcoal/70 transition-colors"
        >
          Select all
        </button>
        <span className="text-charcoal/15">|</span>
        <button
          onClick={onClearAll}
          className="text-xs text-charcoal/50 hover:text-charcoal/70 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Grouped follows */}
      {sections.map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs text-charcoal/30 lowercase mb-2">{label}</p>
          <div className="space-y-1.5">
            {items.map(f => {
              const active = isActive(f)
              return (
                <button
                  key={f.id}
                  onClick={() => onToggleFilter(f.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                    active
                      ? 'border-charcoal/30 text-charcoal/70 bg-charcoal/5'
                      : 'border-charcoal/10 text-charcoal/30'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    active ? 'border-charcoal/40 bg-charcoal/5' : 'border-charcoal/10'
                  }`}>
                    {active && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span>{label === 'tags' ? `#${f.filter_value}` : f.filter_value}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {sections.length === 0 && search && (
        <p className="text-sm text-charcoal/30 text-center py-4">No matches</p>
      )}

      {/* Done button */}
      <button
        onClick={onClose}
        className="w-full py-3 text-sm text-charcoal/60 hover:text-charcoal/80 border border-charcoal/15 rounded-lg transition-colors"
      >
        Done
      </button>
    </div>
  )
}
