import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCollection } from '../contexts/CollectionContext'

export default function SavePopover({ lyricId, onClose, portal = false }) {
  const { collections, addLyricToCollection, removeLyricFromCollection, getCollectionsForLyric } = useCollection()
  const [savedCollections, setSavedCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) handleClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    async function load() {
      try {
        const lyricCollections = await getCollectionsForLyric(lyricId)
        setSavedCollections(lyricCollections.map(c => c.id))
      } catch (err) {
        console.error('Error loading save data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lyricId])

  async function handleToggle(collectionId) {
    const isSaved = savedCollections.includes(collectionId)
    try {
      if (isSaved) {
        await removeLyricFromCollection(lyricId, collectionId)
        setSavedCollections(prev => prev.filter(id => id !== collectionId))
      } else {
        await addLyricToCollection(lyricId, collectionId)
        setSavedCollections(prev => [...prev, collectionId])
      }
    } catch (err) {
      console.error('Error toggling collection:', err)
    }
  }

  // All non-smart collections shown, default (first) gets visual emphasis
  const manualCollections = collections.filter(c => !c.is_smart)
  const defaultCollection = manualCollections[0]
  const otherCollections = manualCollections.slice(1)

  const popoverContent = (
    <div
      ref={ref}
      className={portal
        ? 'fixed z-[9999] min-w-[240px] py-2 px-1 transition-all duration-200 ease-out'
        : 'absolute bottom-full mb-2 left-0 z-50 min-w-[200px] py-1 transition-all duration-200 ease-out'
      }
      style={portal ? {
        top: '50%',
        left: '50%',
        transform: visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -48%) scale(0.95)',
        opacity: visible ? 1 : 0,
        backgroundColor: 'var(--surface-card, #F5F2ED)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
      } : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        backgroundColor: 'var(--surface-card, #F5F2ED)',
        border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      {portal && (
        <div className="flex items-center justify-between px-3 pb-2 mb-1"
          style={{ borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
        >
          <span className="text-xs text-charcoal/40 lowercase">save to collection</span>
          <button onClick={handleClose} className="text-charcoal/25 hover:text-charcoal/50 transition-colors text-xs p-1">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-2 text-xs text-charcoal/30">loading...</div>
      ) : (
        <>
          {/* Default collection — prominent */}
          {defaultCollection && (
            <button
              onClick={() => handleToggle(defaultCollection.id)}
              className="w-full text-left px-3 py-2 text-sm text-charcoal/60 hover:bg-charcoal/5 transition-colors flex items-center gap-2.5"
            >
              <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${
                savedCollections.includes(defaultCollection.id)
                  ? 'border-charcoal/40 bg-charcoal/10'
                  : 'border-charcoal/15'
              }`}>
                {savedCollections.includes(defaultCollection.id) && (
                  <span className="text-charcoal/60 text-[10px]">✓</span>
                )}
              </span>
              <span>{defaultCollection.name}</span>
            </button>
          )}

          {/* Other collections — same style */}
          {otherCollections.map(col => (
            <button
              key={col.id}
              onClick={() => handleToggle(col.id)}
              className="w-full text-left px-3 py-2 text-sm text-charcoal/60 hover:bg-charcoal/5 transition-colors flex items-center gap-2.5"
            >
              <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${
                savedCollections.includes(col.id)
                  ? 'border-charcoal/40 bg-charcoal/10'
                  : 'border-charcoal/15'
              }`}>
                {savedCollections.includes(col.id) && (
                  <span className="text-charcoal/60 text-[10px]">✓</span>
                )}
              </span>
              <span>{col.name}</span>
            </button>
          ))}

          {manualCollections.length === 0 && (
            <div className="px-3 py-2 text-xs text-charcoal/25">no collections yet</div>
          )}
        </>
      )}
    </div>
  )

  if (portal) {
    return createPortal(
      <div className="fixed inset-0 z-[9998]">
        <div
          className="absolute inset-0 transition-opacity duration-200"
          style={{ backgroundColor: `rgba(44,40,37,${visible ? 0.12 : 0})` }}
          onClick={handleClose}
        />
        {popoverContent}
      </div>,
      document.body
    )
  }

  return popoverContent
}
