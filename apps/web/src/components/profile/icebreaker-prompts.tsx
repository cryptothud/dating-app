'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProfilePrompt } from '@dating-app/types'
import { ICEBREAKER_PROMPTS, promptLabel } from '@/lib/profile'

interface Props {
  prompts: ProfilePrompt[]
  onSave: (promptKey: string, answer: string, order: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const MAX_PROMPTS = 3

export function IcebreakerPrompts({ prompts, onSave, onDelete }: Props): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editAnswer, setEditAnswer] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const usedKeys = new Set(prompts.map((p) => p.promptKey))
  const availablePrompts = ICEBREAKER_PROMPTS.filter((p) => !usedKeys.has(p.key))

  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  const handleAdd = async (): Promise<void> => {
    if (!newKey || !newAnswer.trim()) return
    setSaving(true)
    try {
      await onSave(newKey, newAnswer.trim(), prompts.length)
      setAdding(false)
      setNewKey('')
      setNewAnswer('')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (prompt: ProfilePrompt): Promise<void> => {
    if (!editAnswer.trim()) return
    setSaving(true)
    try {
      await onSave(prompt.promptKey, editAnswer.trim(), prompt.order)
      setEditId(null)
    } finally {
      setSaving(false)
    }
  }

  const selectedLabel = availablePrompts.find((p) => p.key === newKey)?.label

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <div key={prompt.id} className="border-border bg-card space-y-2 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-primary text-xs font-semibold">{promptLabel(prompt.promptKey)}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => {
                  setEditId(prompt.id)
                  setEditAnswer(prompt.answer)
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 fill-none stroke-current"
                  strokeWidth="1.75"
                >
                  <path d="M11 2l3 3-9 9H2v-3l9-9z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(prompt.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 fill-none stroke-current"
                  strokeWidth="1.75"
                >
                  <path d="M2 4h12M5 4V2h6v2M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
                </svg>
              </button>
            </div>
          </div>
          {editId === prompt.id ? (
            <div className="space-y-2">
              <textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                maxLength={200}
                rows={2}
                className="dark:bg-white/8 border-black/8 dark:border-white/12 text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-xl border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditId(null)}
                  className="border-border text-muted-foreground hover:bg-muted h-8 flex-1 rounded-xl border text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleEdit(prompt)}
                  disabled={saving}
                  className="bg-primary h-8 flex-1 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-foreground text-sm">{prompt.answer}</p>
          )}
        </div>
      ))}

      {prompts.length < MAX_PROMPTS && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-medium transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M8 2v12M2 8h12" />
          </svg>
          Add a prompt
        </button>
      )}

      {adding && (
        <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
          {/* Custom prompt picker — replaces native <select> which looks awful on desktop */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="dark:bg-white/8 border-black/8 dark:border-white/12 focus:ring-ring flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-black/5 px-3 text-left text-sm transition-colors focus:outline-none focus:ring-1"
            >
              <span
                className={newKey ? 'text-foreground dark:text-white' : 'text-muted-foreground'}
              >
                {selectedLabel ?? 'Choose a prompt…'}
              </span>
              <svg
                viewBox="0 0 16 16"
                className={[
                  'stroke-muted-foreground h-4 w-4 shrink-0 fill-none transition-transform duration-150',
                  pickerOpen ? 'rotate-180' : '',
                ].join(' ')}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>

            {pickerOpen && (
              <div className="border-border absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border bg-white shadow-xl dark:bg-neutral-900">
                <div className="max-h-52 overflow-y-auto py-1">
                  {availablePrompts.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setNewKey(p.key)
                        setPickerOpen(false)
                      }}
                      className={[
                        'w-full px-3 py-2 text-left text-sm transition-colors',
                        p.key === newKey
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Your answer…"
            maxLength={200}
            rows={2}
            className="dark:bg-white/8 border-black/8 dark:border-white/12 text-foreground placeholder:text-muted-foreground/60 focus:ring-ring w-full resize-none rounded-xl border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAdding(false)
                setNewKey('')
                setNewAnswer('')
              }}
              className="border-border text-muted-foreground hover:bg-muted h-9 flex-1 rounded-xl border text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleAdd()}
              disabled={!newKey || !newAnswer.trim() || saving}
              className="bg-primary h-9 flex-1 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
