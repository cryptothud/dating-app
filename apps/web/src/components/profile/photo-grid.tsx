'use client'

import { useRef, useState } from 'react'
import type { Photo } from '@dating-app/types'
import Image from 'next/image'

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
    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-white">
      <path d="M8 1l1.9 3.85L14 5.73l-3 2.92.71 4.14L8 10.65l-3.71 2.14.71-4.14L2 5.73l4.1-.88z" />
    </svg>
  )
}

export function PhotoGrid({
  photos,
  onUpload,
  onSetPrimary,
  onDelete,
  onReorder,
}: Props): React.JSX.Element {
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
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
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
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    const fromIdx = photos.findIndex((p) => p.id === draggingId)
    const toIdx = photos.findIndex((p) => p.id === targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    const next = [...photos]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved!)
    onReorder?.(next)
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const slots = Array.from({ length: SLOTS }, (_, i) => photos[i] ?? null)

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
      />
      <div className="grid max-w-xs grid-cols-3 gap-2">
        {slots.map((photo, i) => {
          const isUploadSlot = i === photos.length && photos.length < SLOTS

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
                  'bg-muted relative aspect-square cursor-grab rounded-xl transition-opacity active:cursor-grabbing',
                  isDragging ? 'scale-95 opacity-40' : '',
                  isDragOver ? 'ring-primary ring-offset-background ring-2 ring-offset-1' : '',
                ].join(' ')}
              >
                {/* Image — overflow-hidden scoped to avoid clipping the dropdown */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 33vw, 180px"
                    className="object-cover"
                  />
                </div>

                {photo.isPrimary && (
                  <div className="bg-primary pointer-events-none absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full shadow">
                    <StarIcon />
                  </div>
                )}
                {photo.isNsfw && (
                  <span className="pointer-events-none absolute right-8 top-1.5 z-10 rounded bg-black/65 px-1.5 py-px text-[9px] font-bold tracking-wide text-white">
                    18+
                  </span>
                )}

                {/* 3-dot menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuId(menuId === photo.id ? null : photo.id)
                  }}
                  className="absolute bottom-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 transition-colors hover:bg-black/75"
                  aria-label="Photo options"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-white">
                    <circle cx="8" cy="3" r="1.2" />
                    <circle cx="8" cy="8" r="1.2" />
                    <circle cx="8" cy="13" r="1.2" />
                  </svg>
                </button>

                {/* Dropdown — rendered in outer non-overflow-hidden context */}
                {menuId === photo.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                    <div className="absolute bottom-8 right-0 z-40 w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                      {!photo.isPrimary && (
                        <button
                          onClick={() => void handleSetPrimary(photo.id)}
                          className="text-foreground hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
                        >
                          <StarIcon />
                          <span className="text-foreground">Set as main</span>
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(photo.id)}
                        className="text-destructive hover:bg-destructive/5 flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3 w-3 fill-none stroke-current"
                          strokeWidth="1.75"
                        >
                          <polyline points="1,4 15,4" />
                          <path d="M5 4V2h6v2M6 7v5M10 7v5M2 4l1 9a1 1 0 001 1h8a1 1 0 001-1l1-9" />
                        </svg>
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
              <div
                key="uploading"
                className="border-primary/30 bg-primary/5 flex aspect-square items-center justify-center rounded-xl border-2"
              >
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            )
          }

          if (isUploadSlot) {
            return (
              <button
                key="upload"
                onClick={() => inputRef.current?.click()}
                className="border-border hover:border-primary/50 hover:bg-primary/5 flex aspect-square items-center justify-center rounded-xl border-2 border-dashed transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="text-muted-foreground h-6 w-6 fill-none stroke-current"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )
          }

          return (
            <div
              key={`empty-${i}`}
              className="border-border/30 aspect-square rounded-xl border-2 border-dashed"
            />
          )
        })}
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Up to 6 photos. Drag to reorder. JPEG, PNG, or WebP · max 10 MB.
      </p>
    </div>
  )
}
