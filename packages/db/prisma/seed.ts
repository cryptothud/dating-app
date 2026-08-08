import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Anchor points ─────────────────────────────────────────────────────────────
// [lat, lng, weight] — weight controls relative density
const ANCHORS: [number, number, number][] = [
  // Manhattan
  [40.758, -73.9855, 14], // Midtown
  [40.7282, -73.9942, 10], // Greenwich Village / Lower Manhattan
  [40.7831, -73.9712, 7], // Upper West Side
  [40.7678, -73.9645, 6], // Upper East Side
  [40.7489, -73.968, 6], // Murray Hill / Kip's Bay
  [40.7127, -74.0134, 5], // Financial District / Battery Park
  [40.7209, -73.9973, 6], // SoHo / Little Italy
  // Brooklyn
  [40.6782, -73.9442, 12], // Crown Heights / Prospect Heights
  [40.6892, -73.9901, 9], // Park Slope / Gowanus
  [40.7081, -73.9571, 8], // Williamsburg / Bushwick
  [40.6501, -73.9496, 5], // Flatbush
  [40.7021, -73.9895, 6], // DUMBO / Downtown Brooklyn
  // Queens
  [40.7282, -73.7949, 9], // Jackson Heights / Elmhurst
  [40.7484, -73.8449, 6], // Flushing / Corona
  [40.7282, -73.853, 5], // Forest Hills / Rego Park
  // Bronx
  [40.8448, -73.8648, 7], // South Bronx / Mott Haven
  // Phoenix
  [33.4484, -112.074, 14], // Downtown Phoenix
  [33.4734, -112.074, 9], // Midtown Phoenix
  [33.4534, -112.0686, 8], // Roosevelt Row / Arts District
  [33.5093, -112.0259, 7], // Uptown / Camelback Corridor
  [33.4255, -111.94, 8], // Tempe / ASU
  [33.4942, -111.9261, 6], // Scottsdale
  [33.3062, -111.8413, 5], // Chandler / Gilbert
  [33.5386, -112.1698, 5], // Glendale / Peoria
  // San Francisco
  [37.7749, -122.4194, 14], // SoMa / Civic Center
  [37.7858, -122.4065, 10], // Mission / Castro
  [37.7749, -122.4477, 7], // Inner Sunset / Richmond
  [37.7986, -122.4375, 6], // Haight-Ashbury / Cole Valley
  [37.8068, -122.4177, 6], // North Beach / Russian Hill
  // East Bay
  [37.8044, -122.2712, 14], // Oakland / Lake Merritt
  [37.8716, -122.2727, 10], // Berkeley / Elmwood
  [37.8201, -122.2337, 7], // Emeryville / Rockridge
  [37.7652, -122.2416, 6], // Fruitvale / Temescal
  // Contra Costa
  [37.9161, -122.0608, 9], // Walnut Creek / downtown
  [37.9257, -122.0894, 7], // Concord / Pleasant Hill
  [37.8935, -122.1255, 6], // Lafayette / Orinda
  // Peninsula
  [37.6879, -122.4702, 8], // San Mateo / Burlingame
  [37.6688, -122.0808, 5], // Hayward / Castro Valley
]

// ── Demographics ──────────────────────────────────────────────────────────────
const NAMES = [
  'Alex',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Jamie',
  'Quinn',
  'Avery',
  'Blake',
  'Drew',
  'Reese',
  'Skyler',
  'Cameron',
  'Logan',
  'Peyton',
  'Dylan',
  'Harper',
  'Emery',
  'Finley',
  'Sage',
  'River',
  'Phoenix',
  'Rowan',
  'Marcus',
  'Dante',
  'Isaiah',
  'Andre',
  'Malik',
  'Jaden',
  'Chris',
  'Mike',
  'Nadia',
  'Sofia',
  'Priya',
  'Elena',
  'Maya',
  'Leila',
  'Zara',
  'Amara',
  'Ethan',
  'Liam',
  'Noah',
  'Owen',
  'Caleb',
  'Miles',
  'Kai',
  'Jin',
  'Luna',
  'Jade',
  'Iris',
  'Vera',
  'Simone',
  'Naomi',
  'Keisha',
  'Fatima',
  'Sebastian',
  'Adrian',
  'Julian',
  'Rafael',
  'Carlos',
  'Diego',
  'Marco',
  'Leo',
  'Jess',
  'Sam',
  'Ash',
  'Nico',
  'Eli',
  'Remi',
  'Sasha',
  'Charlie',
  'Whitney',
  'Brianna',
  'Talia',
  'Camille',
  'Yuki',
  'Hana',
  'Mia',
  'Zoe',
  'Tyler',
  'Brandon',
  'Devon',
  'Hayden',
  'Kendall',
  'Paige',
  'Brooke',
  'Lacey',
  'Ren',
  'Kai',
  'Soren',
  'Piper',
  'Wren',
  'Shiloh',
  'Bellamy',
  'Harlow',
]

const BODY_TYPES = [
  'slim',
  'athletic',
  'average',
  'muscular',
  'curvy',
  'average',
  'athletic',
  'slim',
]

const INTERESTS_POOL = [
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

const PROMPTS: Array<{ promptKey: string; answers: string[] }> = [
  {
    promptKey: 'two_truths_lie',
    answers: [
      "I've been to 14 countries, I make my own hot sauce, and I've never seen The Office.",
      "I learned to drive at 25, I own three plants and they're all alive, and I once met a president.",
      "I hiked the Grand Canyon rim-to-rim, I'm a certified scuba diver, and I've never eaten sushi.",
    ],
  },
  {
    promptKey: 'unpopular_opinion',
    answers: [
      'Brunch is overrated and overpriced. Fight me.',
      'Going to bed early on a Friday is a power move, not a cop-out.',
      'The subway is faster than a cab 80% of the time. I will die on this hill.',
      "Pineapple on pizza is fine. It's just food. Relax.",
    ],
  },
  {
    promptKey: 'perfect_day',
    answers: [
      'Farmers market at 9, hike by noon, outdoor concert in the evening, tacos at midnight.',
      'Sleep in, coffee shop work session, museum visit, dinner at a hole-in-the-wall, walk home.',
      'Rock climbing in the morning, dim sum after, record shop in the afternoon, home-cooked dinner.',
    ],
  },
  {
    promptKey: 'currently_obsessed',
    answers: [
      "Sourdough bread. My starter has a name. Don't ask.",
      "The first season of Survivor. I'm 24 years late. Worth it.",
      "Making cold brew at home. I've spent more on equipment than I'd spend at a coffee shop for a year.",
      'A podcast about the history of maps. This is exactly what it sounds like.',
    ],
  },
  {
    promptKey: 'change_mind',
    answers: [
      'That running was torture. Now I run 5 miles and call it a reset.',
      'That living alone would be lonely. Turns out I really like my own company.',
      'That I was a bad cook. Pandemic boredom turned me into someone who actually meal preps.',
    ],
  },
  {
    promptKey: 'go_to_karaoke',
    answers: [
      'Mr. Brightside. Every time. No notes.',
      'Total Eclipse of the Heart and I commit fully. Full drama. Full send.',
      'Jolene. I make eye contact with strangers the whole time.',
    ],
  },
]

const LOOKING_FOR_PATTERNS: string[][] = [
  ['casual', 'hookup'],
  ['dating', 'relationship'],
  ['friendship', 'casual'],
  ['dating', 'friendship'],
  ['hookup'],
  ['relationship', 'dating'],
  ['casual', 'dating', 'friendship'],
  ['hookup', 'casual'],
  ['dating'],
  ['friendship'],
  ['casual'],
  ['relationship'],
]

const BIOS = [
  'Coffee addict chasing sunsets and good conversation. Swipe right if you know a hidden gem brunch spot.',
  'Transplant from the midwest — still amazed you can get dumplings at 3am here. Show me your city.',
  'Cyclist, dog parent, and amateur chef. Will definitely make you try my homemade pasta.',
  'Marine biologist by day, vinyl collector by night. Looking for someone to geek out with.',
  "Loud laugher, bad dancer, great listener. Let's get lost in a new neighborhood.",
  'Just moved to Brooklyn and still figuring out which subway line hates me most. Help?',
  "Tech startup life means I value real connection offline. Let's actually meet for a drink.",
  'Artist who pays the bills doing UX design. Weekend farmers market devotee. Very serious about hot sauce.',
  'Former competitive swimmer turned yoga convert. Early mornings, late nights, no in-between.',
  'Bookshop browser. Museum member. Terrible at texting back fast, great at showing up.',
  'Raised in Queens, still rep it hard. Showing tourists the real NYC is basically my hobby.',
  'Gym before work, therapy on Tuesdays, rooftop drinks on Fridays. Balance matters.',
  "PhD student who escapes the library to hike, eat tacos, and pretend I'm not stressed.",
  'I will absolutely make you watch a 3-hour documentary on something obscure. Worth it.',
  "Stand-up comedy fan and aspiring comedian. If you can make me laugh first, we'll get along fine.",
  'Bartender turned marketing director. I know every hidden bar in the West Village — let me show you.',
  "Introvert who's really good at pretending to be social. Recharge with good food and quiet rooftops.",
  "Nurse who moonlights as a plant mom. My apartment is basically a jungle and I'm not sorry.",
  'Skateboarder, tattoo enthusiast, deeply into horror films. Total softie underneath.',
  'Fashion week intern energy, thrift store budget. Looking for someone with actual substance.',
  'Phoenix local — obsessed with hiking South Mountain before the heat hits. 6am starts are a lifestyle.',
  'Transplant from Chicago. Still adjusting to 115° summers but the sunsets make it worth it.',
  "Rooftop pool, In-N-Out at midnight, and a dog named Biscuit. That's my whole personality.",
  'Scottsdale by day, Roosevelt Row by night. Hunting for someone to gallery-hop with.',
  'Remote engineer who left the Bay to afford a house. Desert hiking converted me. Never going back.',
  "Elementary school teacher with a secret obsession with competitive cooking shows. Don't judge.",
  "Sports photographer who's been to 14 countries. Still can't parallel park.",
  'Music producer who also bakes really good sourdough. Probably too online about both.',
  "Flight attendant based here between trips. Love showing people my favorite spots when I'm actually home.",
  'Personal trainer who cries at dog commercials. Multitudes.',
  "Comedy writer for a show you've definitely heard of. Looking for someone funnier than me (difficult).",
  'Real estate agent who actually knows the neighborhood histories. AMA about your block.',
  'Environmental lawyer who also does improv on weekends. Chaotic good.',
  "Sous chef at a spot you've probably waited two hours for. Let me feed you.",
  'Social worker who unwinds by hiking and not talking about feelings for a little while.',
  "Photographer who only shoots film. Yes it's pretentious, yes I love it.",
  'Night shift ER nurse with the darkest sense of humor and the biggest heart.',
  'Software engineer who actually leaves the house. Concerts, museums, parks — the full thing.',
  'Fashion designer with an architecture degree. I notice when your kerning is off.',
  'Veterinarian who will absolutely show you 800 pictures of my patients.',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function gaussianFuzz(coord: number, stdDev: number): number {
  const u = Math.random(),
    v = Math.random()
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return coord + n * stdDev
}

function pickAnchorCoords(): [number, number] {
  const totalWeight = ANCHORS.reduce((sum, a) => sum + a[2], 0)
  let r = Math.random() * totalWeight
  for (const [lat, lng, w] of ANCHORS) {
    r -= w
    if (r <= 0) return [gaussianFuzz(lat, 0.008), gaussianFuzz(lng, 0.008)]
  }
  const last = ANCHORS[ANCHORS.length - 1]
  return [gaussianFuzz(last[0], 0.008), gaussianFuzz(last[1], 0.008)]
}

function pickInterests(): string[] {
  const count = randInt(3, 6)
  return shuffle(INTERESTS_POOL).slice(0, count)
}

function pickPrompts(): Array<{ promptKey: string; answer: string; order: number }> {
  const count = randInt(1, 3)
  const shuffled = shuffle(PROMPTS)
  const result: Array<{ promptKey: string; answer: string; order: number }> = []
  for (let i = 0; i < count && i < shuffled.length; i++) {
    const pool = shuffled[i]!
    result.push({ promptKey: pool.promptKey, answer: rand(pool.answers), order: i })
  }
  return result
}

function dateOfBirth(age: number): Date {
  const now = new Date()
  const year = now.getFullYear() - age
  const month = (age * 3 + 1) % 12
  const day = ((age * 7 + 1) % 28) + 1
  return new Date(year, month, day)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const existingCount = await prisma.user.count({ where: { isSeeded: true } })

  const TOTAL = process.env['SEED_TOTAL'] ? parseInt(process.env['SEED_TOTAL']) : 500

  if (existingCount >= TOTAL) {
    console.log(`Seed skipped — ${existingCount} ghost profiles already exist (target: ${TOTAL}).`)
    return
  }
  const toCreate = TOTAL - existingCount
  const startIndex = existingCount

  console.log(`Creating ${toCreate} ghost profiles...`)

  // pravatar.cc has ~70 unique portraits
  const PORTRAIT_COUNT = 70

  for (let i = 0; i < toCreate; i++) {
    const idx = startIndex + i
    const name = rand(NAMES)
    const age = randInt(21, 44)
    const bodyType = rand(BODY_TYPES)
    const bio = rand(BIOS)
    const lookingFor = rand(LOOKING_FOR_PATTERNS)
    const seedInterests = pickInterests()
    const seedPrompts = pickPrompts()
    const activelyLooking = Math.random() < 0.35
    const avatarN = (idx % PORTRAIT_COUNT) + 1
    const [lat, lng] = pickAnchorCoords()

    const r = Math.random()
    const lastActiveOffset =
      r < 0.6
        ? Math.random() * 24 * 3600_000
        : r < 0.9
          ? Math.random() * 7 * 24 * 3600_000
          : Math.random() * 30 * 24 * 3600_000
    const lastActive = new Date(Date.now() - lastActiveOffset)

    await prisma.user.create({
      data: {
        email: `seed.ghost.${idx + 1}@crush.internal`,
        phone: `+1555${String(idx + 1).padStart(7, '0')}`,
        passwordHash: null,
        dateOfBirth: dateOfBirth(age),
        verified: true,
        isSeeded: true,
        trustScore: 60,
        lastActive,
        profile: {
          create: {
            displayName: name,
            bio,
            age,
            bodyType,
            interests: seedInterests,
            lookingFor,
            activelyLooking,
            nsfwEnabled: false,
            visibility: 'public',
            photos: {
              create: {
                url: `https://i.pravatar.cc/400?img=${avatarN}`,
                thumbUrl: `https://i.pravatar.cc/150?img=${avatarN}`,
                isPrimary: true,
                isNsfw: false,
                moderationStatus: 'approved',
                csamScanned: true,
                cloudinaryPublicId: `seeded/avatar-${avatarN}`,
                order: 0,
              },
            },
            prompts: {
              createMany: {
                data: seedPrompts,
              },
            },
          },
        },
        location: {
          create: {
            latitude: lat,
            longitude: lng,
            fuzzRadius: 150,
          },
        },
      },
    })

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${toCreate} created...`)
    }
  }

  const finalCount = await prisma.user.count({ where: { isSeeded: true } })
  console.log(`Done — ${finalCount} ghost profiles seeded`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
