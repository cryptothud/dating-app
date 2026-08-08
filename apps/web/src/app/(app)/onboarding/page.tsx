'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { profileApi } from '@/lib/profile'
import { PhotoGrid } from '@/components/profile/photo-grid'
import type { UserProfile } from '@dating-app/types'

const STORAGE_KEY = 'crush_onboarded'

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

const INTERESTS_OPTIONS = [
  'Hiking',
  'Gaming',
  'Cooking',
  'Travel',
  'Music',
  'Art',
  'Fitness',
  'Reading',
  'Movies',
  'Photography',
  'Dancing',
  'Yoga',
  'Sports',
  'Tech',
  'Fashion',
  'Foodies',
  'Outdoors',
  'Nightlife',
  'Pets',
  'Wellness',
]

const STEPS = ['Welcome', 'Photo', 'About you', 'Done'] as const
type Step = 0 | 1 | 2 | 3

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-1 rounded-full transition-all duration-300',
            i === current
              ? 'bg-primary w-6'
              : i < current
                ? 'bg-primary/40 w-2'
                : 'bg-muted-foreground/20 w-2',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [bodyType, setBodyType] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const direction = useRef<1 | -1>(1)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
      router.replace('/map')
      return
    }
    profileApi
      .getMe()
      .then((p) => {
        setProfile(p)
        setDisplayName(p.displayName ?? '')
        setBio(p.bio ?? '')
        setLookingFor(p.lookingFor ?? [])
        setBodyType(p.bodyType ?? '')
        setInterests(p.interests ?? [])
        if ((p.photos?.length ?? 0) > 0 && p.displayName) {
          localStorage.setItem(STORAGE_KEY, '1')
          router.replace('/map')
        }
      })
      .catch(() => {})
  }, [router])

  function toggleLookingFor(val: string) {
    setLookingFor((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]))
  }

  function toggleInterest(val: string) {
    setInterests((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : prev.length < 10 ? [...prev, val] : prev,
    )
  }

  const handleUpload = async (file: File) => {
    const photo = await profileApi.uploadPhoto(file)
    setProfile((p) => (p ? { ...p, photos: [...p.photos, photo] } : p))
  }

  const handleSetPrimary = async (id: string) => {
    await profileApi.updatePhoto(id, { isPrimary: true })
    setProfile((p) =>
      p ? { ...p, photos: p.photos.map((ph) => ({ ...ph, isPrimary: ph.id === id })) } : p,
    )
  }

  const handleDeletePhoto = async (id: string) => {
    await profileApi.deletePhoto(id)
    setProfile((p) => (p ? { ...p, photos: p.photos.filter((ph) => ph.id !== id) } : p))
  }

  const next = () => {
    direction.current = 1
    setStep((s) => Math.min(s + 1, 3) as Step)
  }

  const back = () => {
    direction.current = -1
    setStep((s) => Math.max(s - 1, 0) as Step)
  }

  const finish = async () => {
    setSaving(true)
    try {
      await profileApi.update({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        lookingFor: lookingFor.length > 0 ? lookingFor : undefined,
        bodyType: bodyType || undefined,
        interests: interests.length > 0 ? interests : undefined,
      })
      localStorage.setItem(STORAGE_KEY, '1')
      router.push('/map')
    } catch {
      setSaving(false)
    }
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-6 pb-2 pt-5">
        <ProgressDots current={step} total={STEPS.length} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction.current}>
          <motion.div
            key={step}
            custom={direction.current}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="px-6 py-4"
          >
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="space-y-6 pt-4">
                <div className="space-y-3 text-center">
                  <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-3xl">
                    <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="20" cy="20" r="3" fill="hsl(var(--primary))" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="font-display text-foreground text-2xl font-bold">
                      Welcome to CRUSH
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      Meet people nearby, right now. Let&apos;s set up your profile so others can
                      find you.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" className="fill-primary h-5 w-5" aria-hidden>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      ),
                      title: 'Show up on the map',
                      desc: "Your dot appears when you're actively looking",
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" className="fill-primary h-5 w-5" aria-hidden>
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                        </svg>
                      ),
                      title: 'Free 1:1 messaging',
                      desc: 'DM anyone you connect with, no paywall',
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" className="fill-primary h-5 w-5" aria-hidden>
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                      ),
                      title: 'Private by default',
                      desc: 'Your exact location is always fuzzed',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="bg-muted/50 flex items-start gap-3 rounded-xl p-3"
                    >
                      <span className="mt-0.5 shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-foreground text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Photo */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-foreground text-xl font-bold">
                    Add your best photo
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    A photo helps others recognize and trust you.
                  </p>
                </div>
                {profile && (
                  <PhotoGrid
                    photos={profile.photos}
                    onUpload={handleUpload}
                    onSetPrimary={handleSetPrimary}
                    onDelete={handleDeletePhoto}
                  />
                )}
                {(profile?.photos?.length ?? 0) === 0 && (
                  <p className="text-center text-xs text-amber-500">
                    You can add a photo later from your profile
                  </p>
                )}
              </div>
            )}

            {/* Step 2: About you */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-foreground text-xl font-bold">About you</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Help others get to know you.</p>
                </div>

                <div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    maxLength={32}
                    className="bg-muted border-border text-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                    I&apos;m looking for
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LOOKING_FOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleLookingFor(opt.value)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          lookingFor.includes(opt.value)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-muted text-foreground border-border hover:border-primary/50',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                    My body type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BODY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBodyType(bodyType === opt.value ? '' : opt.value)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          bodyType === opt.value
                            ? 'bg-primary border-primary text-white'
                            : 'bg-muted text-foreground border-border hover:border-primary/50',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                    My interests{' '}
                    <span className="text-muted-foreground/50">({interests.length}/10)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleInterest(opt)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          interests.includes(opt)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-muted text-foreground border-border hover:border-primary/50',
                        ].join(' ')}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people a bit about yourself..."
                    maxLength={500}
                    rows={3}
                    className="bg-muted border-border text-foreground focus:ring-ring w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
              <div className="space-y-6 pt-4 text-center">
                <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                  <svg
                    viewBox="0 0 24 24"
                    className="stroke-primary h-10 w-10 fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-foreground text-2xl font-bold">
                    You&apos;re all set!
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Your profile is ready. Head to the map to see who&apos;s nearby.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="shrink-0 space-y-2 px-6 pb-6 pt-3">
        <button
          onClick={step === 3 ? () => void finish() : step === 2 ? () => void finish() : next}
          disabled={saving}
          className="bg-primary h-12 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : step === 3 || step === 2 ? 'Go to map' : "Let's go"}
        </button>
        {step < 2 && (
          <button
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, '1')
              router.push('/map')
            }}
            className="text-muted-foreground hover:text-foreground h-10 w-full text-sm transition-colors"
          >
            Skip for now
          </button>
        )}
        {step > 0 && step < 3 && (
          <button
            onClick={back}
            className="text-muted-foreground hover:text-foreground h-10 w-full text-sm transition-colors"
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}
