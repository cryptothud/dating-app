import { api } from './api'
import type { UserProfile, ProfilePrompt, Photo } from '@dating-app/types'

export const profileApi = {
  getMe: () => api.get<UserProfile>('/profile/me'),
  getUser: (userId: string) => api.get<UserProfile>(`/profile/${userId}`),

  update: (data: {
    displayName?: string
    bio?: string
    nsfwEnabled?: boolean
    lookingFor?: string[]
    bodyType?: string
    sexuality?: string
    interests?: string[]
    age?: number
  }) => api.patch<UserProfile>('/profile', data),

  getViewers: () =>
    api.get<
      { id: string; displayName: string | null; photoUrl: string | null; viewedAt: string }[]
    >('/profile/me/viewers'),

  upsertPrompt: (data: { promptKey: string; answer: string; order?: number }) =>
    api.post<ProfilePrompt>('/profile/prompts', data),

  deletePrompt: (id: string) => api.del<{ ok: true }>(`/profile/prompts/${id}`),

  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload<Photo>('/photos', form)
  },

  updatePhoto: (id: string, data: { isPrimary?: boolean; blurEnabled?: boolean; order?: number }) =>
    api.patch<{ ok: true }>(`/photos/${id}`, data),

  deletePhoto: (id: string) => api.del<{ ok: true }>(`/photos/${id}`),
}

export const ICEBREAKER_PROMPTS = [
  { key: 'looking_for', label: "I'm looking for…" },
  { key: 'ideal_sunday', label: 'My ideal Sunday looks like…' },
  { key: 'green_flag', label: 'A green flag in a partner…' },
  { key: 'spontaneous', label: "The most spontaneous thing I've done…" },
  { key: 'love_language', label: 'My love language is…' },
  { key: 'passionate_about', label: "I'm passionate about…" },
  { key: 'change_my_mind', label: 'Change my mind about…' },
  { key: 'fun_fact', label: 'A fun fact about me…' },
  { key: 'currently_binging', label: 'Currently binging…' },
  { key: 'best_travel', label: 'Best travel story…' },
  { key: 'hot_take', label: 'Hot take…' },
  { key: 'conversation_starter', label: 'Good conversation starter…' },
  { key: 'first_date', label: 'Perfect first date…' },
  { key: 'dealbreaker', label: 'My biggest dealbreaker…' },
  { key: 'know_before_dating', label: 'Something to know before dating me…' },
  { key: 'need_partner', label: 'I need a partner who…' },
  { key: 'will_make_you_laugh', label: "I'll make you laugh by…" },
  { key: 'always_down', label: 'Always down for…' },
  { key: 'free_time', label: "In my free time you'll find me…" },
  { key: 'guilty_pleasure', label: 'My guilty pleasure…' },
  { key: 'two_truths', label: 'Two truths and a lie…' },
  { key: 'two_truths_lie', label: 'Two truths and a lie…' },
  { key: 'perfect_day', label: 'My perfect day looks like…' },
  { key: 'change_mind', label: 'Change my mind about…' },
  { key: 'go_to_karaoke', label: 'My go-to karaoke song…' },
  { key: 'never_have_i', label: 'Never have I ever…' },
  { key: 'unpopular_opinion', label: 'Unpopular opinion…' },
  { key: 'one_thing', label: "One thing I can't live without…" },
  { key: 'life_goal', label: 'A life goal of mine…' },
  { key: 'currently_obsessed', label: 'Currently obsessed with…' },
  { key: 'recently_learned', label: 'Something I recently learned…' },
  { key: 'dinner_guest', label: 'Dream dinner guest…' },
  { key: 'pet_peeve', label: 'My biggest pet peeve…' },
  { key: 'proud_of', label: "Something I'm proud of…" },
  { key: 'love_story', label: 'My ideal love story…' },
  { key: 'morning_night', label: 'Morning person or night owl…' },
] as const

export type PromptKey = (typeof ICEBREAKER_PROMPTS)[number]['key']

export function promptLabel(key: string): string {
  return ICEBREAKER_PROMPTS.find((p) => p.key === key)?.label ?? key
}
