'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { profileApi } from '@/lib/profile'
import type { UserProfile } from '@dating-app/types'
import { PhotoGrid } from '@/components/profile/photo-grid'
import { IcebreakerPrompts } from '@/components/profile/icebreaker-prompts'
import { ApiRequestError, api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/hooks/use-subscription'

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">{title}</h2>
      {children}
    </section>
  )
}

function VerifiedBadge(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-primary"><path d="M8 1l1.48 3.01 3.32.48-2.4 2.34.57 3.3L8 8.57 5.03 10.13l.57-3.3-2.4-2.34 3.32-.48z"/></svg>
      Verified
    </span>
  )
}

export default function ProfilePage(): React.JSX.Element {
  const { isAuthenticated } = useAuth()
  const { isPremium, isPremiumPlus } = useSubscription(isAuthenticated)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [bodyType, setBodyType] = useState('')
  const [sexuality, setSexuality] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [boosting, setBoosting] = useState(false)
  const [boostMsg, setBoostMsg] = useState('')

  const handleBoost = async (): Promise<void> => {
    setBoosting(true); setBoostMsg('')
    try {
      const res = await api.post<{ boostedUntil: string }>('/location/boost')
      const until = new Date(res.boostedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setBoostMsg(`Boosted until ${until}!`)
    } catch (e) {
      setBoostMsg(e instanceof ApiRequestError ? e.message : 'Boost unavailable')
    } finally { setBoosting(false) }
  }

  useEffect(() => {
    profileApi.getMe()
      .then((p) => {
        setProfile(p)
        setDisplayName(p.displayName ?? '')
        setBio(p.bio ?? '')
        setAge(p.age != null ? String(p.age) : '')
        setLookingFor(p.lookingFor ?? [])
        setBodyType(p.bodyType ?? '')
        setSexuality(p.sexuality ?? '')
        setInterests(p.interests ?? [])
      })
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveInfo = async (): Promise<void> => {
    setSaving(true)
    try {
      const ageNum = parseInt(age, 10)
      const updated = await profileApi.update({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        lookingFor: lookingFor.length > 0 ? lookingFor : undefined,
        bodyType: bodyType || undefined,
        sexuality: sexuality || undefined,
        interests: interests.length > 0 ? interests : undefined,
        // Only send age when there's no DOB-derived age (legacy accounts)
        age: profile?.age == null && !isNaN(ageNum) && ageNum >= 18 ? ageNum : undefined,
      })
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* noop */ } finally { setSaving(false) }
  }

  const LOOKING_FOR_OPTIONS = [
    { value: 'casual', label: 'Casual' },
    { value: 'dating', label: 'Dating' },
    { value: 'friendship', label: 'Friendship' },
    { value: 'hookup', label: 'Hookup' },
    { value: 'relationship', label: 'Relationship' },
  ]

  const BODY_TYPE_OPTIONS = [
    { value: 'slim', label: 'Slim' },
    { value: 'athletic', label: 'Athletic' },
    { value: 'average', label: 'Average' },
    { value: 'muscular', label: 'Muscular' },
    { value: 'curvy', label: 'Curvy' },
    { value: 'full', label: 'Full' },
  ]

  const SEXUALITY_OPTIONS = [
    { value: 'straight', label: 'Straight' },
    { value: 'gay', label: 'Gay' },
    { value: 'lesbian', label: 'Lesbian' },
    { value: 'bisexual', label: 'Bisexual' },
    { value: 'pansexual', label: 'Pansexual' },
    { value: 'queer', label: 'Queer' },
    { value: 'curious', label: 'Curious' },
    { value: 'trans', label: 'Trans' },
    { value: 'asexual', label: 'Asexual' },
    { value: 'other', label: 'Other' },
  ]

  const INTERESTS_OPTIONS = [
    'Hiking', 'Gaming', 'Cooking', 'Travel', 'Music', 'Art', 'Fitness',
    'Reading', 'Movies', 'Photography', 'Dancing', 'Yoga', 'Sports', 'Tech',
    'Fashion', 'Foodies', 'Outdoors', 'Nightlife', 'Pets', 'Wellness',
  ]

  function toggleLookingFor(val: string) {
    setLookingFor((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }

  function toggleInterest(val: string) {
    setInterests((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : prev.length < 10 ? [...prev, val] : prev,
    )
  }

  const handleUpload = async (file: File): Promise<void> => {
    const isFirst = (profile?.photos.length ?? 0) === 0
    const photo = await profileApi.uploadPhoto(file)
    if (isFirst) {
      await profileApi.updatePhoto(photo.id, { isPrimary: true })
      setProfile((p) => p ? { ...p, photos: [{ ...photo, isPrimary: true }] } : p)
    } else {
      setProfile((p) => p ? { ...p, photos: [...p.photos, photo] } : p)
    }
  }

  const handleSetPrimary = async (id: string): Promise<void> => {
    await profileApi.updatePhoto(id, { isPrimary: true })
    setProfile((p) => p ? { ...p, photos: p.photos.map((ph) => ({ ...ph, isPrimary: ph.id === id })) } : p)
  }

  const handleDeletePhoto = async (id: string): Promise<void> => {
    await profileApi.deletePhoto(id)
    setProfile((p) => p ? { ...p, photos: p.photos.filter((ph) => ph.id !== id) } : p)
  }

  const handleReorderPhotos = (newOrder: UserProfile['photos']): void => {
    setProfile((p) => p ? { ...p, photos: newOrder } : p)
    void Promise.all(newOrder.map((ph, idx) => profileApi.updatePhoto(ph.id, { order: idx })))
  }

  const handleUpsertPrompt = async (promptKey: string, answer: string, order: number): Promise<void> => {
    const updated = await profileApi.upsertPrompt({ promptKey, answer, order })
    setProfile((p) => {
      if (!p) return p
      const exists = p.prompts.find((pr) => pr.promptKey === promptKey)
      const prompts = exists
        ? p.prompts.map((pr) => pr.promptKey === promptKey ? updated : pr)
        : [...p.prompts, updated]
      return { ...p, prompts }
    })
  }

  const handleDeletePrompt = async (id: string): Promise<void> => {
    await profileApi.deletePrompt(id)
    setProfile((p) => p ? { ...p, prompts: p.prompts.filter((pr) => pr.id !== id) } : p)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">{error ?? 'Something went wrong'}</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">My Profile</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Trust score: {profile.trustScore}</span>
              {profile.verified && <VerifiedBadge />}
            </div>
          </div>
          {!profile.verified && (
            <a href="/settings/verify" className="text-xs font-medium text-primary hover:underline">
              Get verified →
            </a>
          )}
        </div>

        {/* Boost */}
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Map Boost</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPremium
                ? isPremiumPlus ? '3 boosts/week — appear at top of map for 30 min' : '1 boost/week — appear at top of map for 30 min'
                : 'Premium — appear at top of map for 30 min'}
            </p>
            {boostMsg && <p className="text-xs text-purple-400 mt-1">{boostMsg}</p>}
          </div>
          {isPremium ? (
            <button
              onClick={() => void handleBoost()}
              disabled={boosting}
              className="shrink-0 rounded-xl bg-purple-600 text-white text-xs font-semibold px-4 py-2 hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {boosting ? '…' : '⚡ Boost'}
            </button>
          ) : (
            <Link href="/upgrade" className="shrink-0 rounded-xl border border-purple-500 text-purple-500 dark:text-purple-400 dark:border-purple-400 text-xs font-semibold px-4 py-2 hover:bg-purple-500/10 transition-colors">
              Upgrade
            </Link>
          )}
        </div>

        {/* Photos */}
        <Section title="Photos">
          <PhotoGrid
            photos={profile.photos}
            onUpload={handleUpload}
            onSetPrimary={handleSetPrimary}
            onDelete={handleDeletePhoto}
            onReorder={handleReorderPhotos}
          />
        </Section>

        {/* Basic info */}
        <Section title="About you">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                placeholder="Your name"
                className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-sm text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Age
                {profile.age === null && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60 font-normal normal-case tracking-normal">
                    (set once — derived from your date of birth for new accounts)
                  </span>
                )}
              </label>
              <input
                value={age}
                onChange={profile.age === null ? (e) => setAge(e.target.value) : undefined}
                readOnly={profile.age !== null}
                tabIndex={profile.age !== null ? -1 : 0}
                placeholder="—"
                inputMode="numeric"
                maxLength={3}
                className={[
                  'w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-sm text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none transition-all',
                  profile.age !== null ? 'cursor-default select-none' : 'focus:ring-1 focus:ring-ring',
                ].join(' ')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">I&apos;m looking for</label>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleLookingFor(opt.value)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      lookingFor.includes(opt.value)
                        ? 'bg-primary border-primary text-white'
                        : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">My body type</label>
              <div className="flex flex-wrap gap-2">
                {BODY_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBodyType((prev) => prev === opt.value ? '' : opt.value)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      bodyType === opt.value
                        ? 'bg-primary border-primary text-white'
                        : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">My sexuality</label>
              <div className="flex flex-wrap gap-2">
                {SEXUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSexuality((prev) => prev === opt.value ? '' : opt.value)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      sexuality === opt.value
                        ? 'bg-primary border-primary text-white'
                        : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                My interests <span className="text-muted-foreground/50">({interests.length}/10)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleInterest(opt)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      interests.includes(opt)
                        ? 'bg-primary border-primary text-white'
                        : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell people a little about yourself…"
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-sm text-foreground dark:text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
              <p className="text-right text-[11px] text-muted-foreground/60 mt-1">{bio.length}/500</p>
            </div>
            <button
              onClick={handleSaveInfo}
              disabled={saving}
              className="w-full h-11 bg-primary rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Section>

        {/* Icebreakers */}
        <Section title="Icebreakers">
          <IcebreakerPrompts
            prompts={profile.prompts}
            onSave={handleUpsertPrompt}
            onDelete={handleDeletePrompt}
          />
        </Section>

      </div>
    </div>
  )
}
