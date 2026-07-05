'use client'

import { useRef, useState } from 'react'
import type { Photo } from '@dating-app/types'

interface Props {
  photos: Photo[]
  onUpload: (file: File) => Promise<void>
  onSetPrimary: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder?: (newOrder: Photo[]) => void
}

const SLOTS = 6

function StarIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-white">
      <path d="M8 1l1.9 3.85L14 5.73l-3 2.92.71 4.14L8 10.65l-3.71 2.14.71-4.14L2 5.73l4.1-.88z" />
    </svg>
  )
}

export function PhotoGrid({ photos, onUpload, onSetPrimary, onDelete, onReorder }: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try { await onUpload(file) } finally { setUploading(false) }
  }

  const handleSetPrimary = async (id: string): Promise<void> => {
    setMenuId(null)
    await onSetPrimary(id)
  }

  const handleDelete = async (id: string): Promise<void> => {
    setMenuId(null)
    await onDelete(id)
  }

  const handleDragStart = (id: string) => {
    setDraggingId(id)
    setMenuId(null)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggingId) setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return }
    const fromIdx = photos.findIndex((p) => p.id === draggingId)
    const toIdx = photos.findIndex((p) => p.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDraggingId(null); setDragOverId(null); return }
    const next = [...photos]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved!)
    onReorder?.(next)
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => { setDraggingId(null); setDragOverId(null) }

  const slots = Array.from({ length: SLOTS }, (_, i) => photos[i] ?? null)

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} />
      <div className="grid grid-cols-3 gap-2 max-w-xs">
        {slots.map((photo, i) => {
          const isUploadSlot = i === photos.length && photos.length < SLOTS
          const isEmpty = !photo && !isUploadSlot

          if (photo) {
            const isDragging = draggingId === photo.id
            const isDragOver = dragOverId === photo.id
            return (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(photo.id)}
                onDragOver={(e) => handleDragOver(e, photo.id)}
                onDrop={(e) => handleDrop(e, photo.id)}
                onDragEnd={handleDragEnd}
                className={[
                  'aspect-square relative rounded-xl bg-muted cursor-grab active:cursor-grabbing transition-opacity',
                  isDragging ? 'opacity-40 scale-95' : '',
                  isDragOver ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : '',
                ].join(' ')}
              >
                {/* Image — overflow-hidden scoped to avoid clipping the dropdown */}
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </div>

                {photo.isPrimary && (
                  <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow pointer-events-none">
                    <StarIcon />
                  </div>
                )}
                {photo.isNsfw && (
                  <span className="absolute top-1.5 right-8 z-10 px-1.5 py-px bg-black/65 rounded text-[9px] font-bold text-white tracking-wide pointer-events-none">
                    18+
                  </span>
                )}

                {/* 3-dot menu button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuId(menuId === photo.id ? null : photo.id) }}
                  className="absolute bottom-1.5 right-1.5 z-20 w-6 h-6 bg-black/55 hover:bg-black/75 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Photo options"
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-white"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg>
                </button>

                {/* Dropdown — rendered in outer non-overflow-hidden context */}
                {menuId === photo.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                    <div className="absolute bottom-8 right-0 w-36 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 z-40">
                      {!photo.isPrimary && (
                        <button onClick={() => void handleSetPrimary(photo.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                          <StarIcon />
                          <span className="text-foreground">Set as main</span>
                        </button>
                      )}
                      <button onClick={() => void handleDelete(photo.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors">
                        <svg viewBox="0 0 16 16" className="w-3 h-3 fill-none stroke-current" strokeWidth="1.75"><polyline points="1,4 15,4"/><path d="M5 4V2h6v2M6 7v5M10 7v5M2 4l1 9a1 1 0 001 1h8a1 1 0 001-1l1-9"/></svg>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          }

          if (isUploadSlot && uploading) {
            return (
              <div key="uploading" className="aspect-square rounded-xl border-2 border-primary/30 bg-primary/5 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )
          }

          if (isUploadSlot) {
            return (
              <button key="upload" onClick={() => inputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted-foreground fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            )
          }

          return <div key={`empty-${i}`} className="aspect-square rounded-xl border-2 border-dashed border-border/30" />
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">Up to 6 photos. Drag to reorder. JPEG, PNG, or WebP · max 10 MB.</p>
    </div>
  )
}
