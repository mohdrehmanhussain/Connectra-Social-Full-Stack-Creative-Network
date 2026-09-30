export interface DBUser {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  full_name: string;
  profile_picture: string;
  cover_image: string;
  bio: string;
  location: string;
  website: string;
  is_online: boolean;
  created_at: string;
}

export interface DBPost {
  id: number;
  user_id: number;
  content: string;
  image: string;
  images: string[];
  location: string;
  hashtags: string[];
  mentions: string[];
  shares_count: number;
  created_at: string;
  updated_at: string;
}

export interface DBComment {
  id: number;
  post_id: number;
  user_id: number;
  parent_comment_id: number | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DBLike {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
}

export interface DBCommentLike {
  id: number;
  user_id: number;
  comment_id: number;
}

export interface DBFollow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
}

export interface DBNotification {
  id: number;
  recipient_id: number;
  sender_id: number;
  notification_type: 'follow' | 'like' | 'comment' | 'reply' | 'mention';
  post_id: number | null;
  comment_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface DBBookmark {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
}

export interface DBMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  attachment: string;
  is_read: boolean;
  created_at: string;
}

export interface DBStory {
  id: number;
  user_id: number;
  media: string;
  caption: string;
  created_at: string;
  expires_at: string;
  viewed_by: number[];
}

export interface DatabaseSchema {
  users: DBUser[];
  posts: DBPost[];
  comments: DBComment[];
  likes: DBLike[];
  commentLikes: DBCommentLike[];
  follows: DBFollow[];
  notifications: DBNotification[];
  bookmarks: DBBookmark[];
  messages: DBMessage[];
  stories: DBStory[];
}

function makeAvatarSvg(initials: string, bg: string, accent: string, fg = '#F8F7F4'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#g)"/>
    <circle cx="122" cy="38" r="28" fill="${fg}" fill-opacity="0.12"/>
    <circle cx="34" cy="128" r="36" fill="${fg}" fill-opacity="0.08"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="Georgia, serif" font-size="54" font-weight="500" letter-spacing="1">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeEditorialCanvasSvg(title: string, subtitle: string, bg1: string, bg2: string, accent: string, shapeType: 'arch' | 'waves' | 'grid' | 'botanical' | 'kinetic'): string {
  let innerGraphic = '';
  if (shapeType === 'arch') {
    innerGraphic = `
      <rect x="280" y="90" width="240" height="340" rx="120" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="1.5"/>
      <circle cx="400" cy="210" r="64" fill="#F8F7F4" fill-opacity="0.14"/>
      <line x1="120" y1="430" x2="680" y2="430" stroke="#F8F7F4" stroke-opacity="0.25" stroke-width="1"/>
    `;
  } else if (shapeType === 'waves') {
    innerGraphic = `
      <path d="M 80 320 Q 240 180 400 320 T 720 320" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity="0.7"/>
      <path d="M 80 360 Q 240 220 400 360 T 720 360" fill="none" stroke="#F8F7F4" stroke-width="1.5" stroke-opacity="0.4"/>
      <circle cx="400" cy="240" r="48" fill="${accent}" fill-opacity="0.3"/>
    `;
  } else if (shapeType === 'grid') {
    innerGraphic = `
      <g stroke="#F8F7F4" stroke-opacity="0.16" stroke-width="1">
        <line x1="160" y1="80" x2="160" y2="440"/><line x1="320" y1="80" x2="320" y2="440"/>
        <line x1="480" y1="80" x2="480" y2="440"/><line x1="640" y1="80" x2="640" y2="440"/>
        <line x1="100" y1="160" x2="700" y2="160"/><line x1="100" y1="280" x2="700" y2="280"/>
      </g>
      <rect x="280" y="140" width="240" height="160" fill="${accent}" fill-opacity="0.28" stroke="#F8F7F4" stroke-opacity="0.4"/>
    `;
  } else if (shapeType === 'botanical') {
    innerGraphic = `
      <circle cx="400" cy="250" r="110" fill="${accent}" fill-opacity="0.2"/>
      <path d="M400 380 C400 260 310 200 310 130 C380 130 400 210 400 380 Z" fill="#F8F7F4" fill-opacity="0.24"/>
      <path d="M400 380 C400 260 490 200 490 130 C420 130 400 210 400 380 Z" fill="${accent}" fill-opacity="0.45"/>
    `;
  } else {
    innerGraphic = `
      <circle cx="350" cy="240" r="95" fill="none" stroke="#F8F7F4" stroke-opacity="0.3" stroke-width="1.5"/>
      <circle cx="450" cy="240" r="95" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="1.5"/>
      <line x1="200" y1="240" x2="600" y2="240" stroke="#F8F7F4" stroke-opacity="0.25"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="520" fill="url(#bg)"/>
    ${innerGraphic}
    <text x="64" y="445" fill="#F8F7F4" font-family="Georgia, serif" font-size="30" font-weight="400">${title}</text>
    <text x="64" y="476" fill="#F8F7F4" fill-opacity="0.7" font-family="sans-serif" font-size="14" letter-spacing="1.5">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// High-resolution generated photography paths from Phase 1
export const GENERATED_IMAGES = {
  pavilion: '/src/assets/images/post_architectural_pavilion_1790770462987.jpg',
  workspace: '/src/assets/images/post_studio_workspace_1790770481816.jpg',
  alpine: '/src/assets/images/post_alpine_expedition_1790770495001.jpg',
  banner: '/src/assets/images/cover_profile_banner_1790770507160.jpg',
  storyAtelier: '/src/assets/images/story_vertical_atelier_1790770521054.jpg',
};

export const EDITORIAL_CANVASES = {
  acoustics: makeEditorialCanvasSvg('Harmonic Resonance Study IV', 'ANALOG TAPE & MODULAR SYNTHESIS · BERLIN', '#1B2430', '#0F172A', '#E05A40', 'waves'),
  ceramics: makeEditorialCanvasSvg('Raw Stoneware Reduction Firing', 'IRON-RICH GLAZE TRIALS · STUDIO 04', '#2C221E', '#4A3728', '#D97706', 'arch'),
  typography: makeEditorialCanvasSvg('Swiss Grid & Serif Proportions', 'EDITORIAL SYSTEM SPECIMEN · STOCKHOLM', '#18181B', '#27272A', '#A1A1AA', 'grid'),
  botany: makeEditorialCanvasSvg('Arid Flora & Oasis Microclimates', 'BOTANICAL FIELD ARCHIVE · FAYOUM', '#14291E', '#1E3A2F', '#34D399', 'botanical'),
  kinetics: makeEditorialCanvasSvg('Refractive Pendulum Array', 'LIGHT & BRASS INSTALLATION · SOHO', '#1F1924', '#31253B', '#F59E0B', 'kinetic'),
};

export function createInitialSeedDatabase(): DatabaseSchema {
  const users: DBUser[] = [
    {
      id: 1,
      username: 'elena_rostova',
      email: 'elena@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Elena Rostova',
      profile_picture: makeAvatarSvg('ER', '#1E293B', '#475569'),
      cover_image: GENERATED_IMAGES.banner,
      bio: 'Principal Spatial Architect exploring monolithic timber, cast glass, and daylight choreography. Lecturer at ETH Zurich.',
      location: 'Zurich, Switzerland',
      website: 'https://rostova-studio.ch',
      is_online: true,
      created_at: '2025-01-14T09:30:00Z',
    },
    {
      id: 2,
      username: 'marcus_vance',
      email: 'marcus@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Marcus Vance',
      profile_picture: makeAvatarSvg('MV', '#7C2D12', '#C2410C'),
      cover_image: GENERATED_IMAGES.workspace,
      bio: 'Industrial designer & tactile hardware builder. Crafting brass-milled rotary interfaces and analog polyphonic instruments.',
      location: 'Berlin, Germany',
      website: 'https://vance-instruments.de',
      is_online: true,
      created_at: '2025-02-03T14:15:00Z',
    },
    {
      id: 3,
      username: 'sora_takahashi',
      email: 'sora@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Sora Takahashi',
      profile_picture: makeAvatarSvg('ST', '#0F172A', '#334155'),
      cover_image: GENERATED_IMAGES.alpine,
      bio: 'Medium-format documentary photographer chronicling high-altitude alpine passes, silent monasteries, and coastal fog.',
      location: 'Kyoto, Japan',
      website: 'https://soratakahashi.jp',
      is_online: true,
      created_at: '2025-02-18T07:45:00Z',
    },
    {
      id: 4,
      username: 'liam_oconnor',
      email: 'liam@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: "Liam O'Connor",
      profile_picture: makeAvatarSvg('LO', '#064E3B', '#047857'),
      cover_image: GENERATED_IMAGES.banner,
      bio: 'Distributed systems architect & local-first software researcher. Obsessed with deterministic state machines and zero-latency UI.',
      location: 'Dublin, Ireland',
      website: 'https://liamoconnor.dev',
      is_online: false,
      created_at: '2025-03-01T11:20:00Z',
    },
    {
      id: 5,
      username: 'amara_okafor',
      email: 'amara@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Amara Okafor',
      profile_picture: makeAvatarSvg('AO', '#78350F', '#B45309'),
      cover_image: GENERATED_IMAGES.pavilion,
      bio: 'Ceramicist & material alchemist working with wild-foraged Nigerian clays, wood ash glazes, and architectural vessel forms.',
      location: 'Lagos / London',
      website: 'https://amaraokafor.art',
      is_online: true,
      created_at: '2025-03-19T16:10:00Z',
    },
    {
      id: 6,
      username: 'clara_lindqvist',
      email: 'clara@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Clara Lindqvist',
      profile_picture: makeAvatarSvg('CL', '#31102F', '#701A75'),
      cover_image: GENERATED_IMAGES.banner,
      bio: 'Typeface designer & editorial art director. Reviving 16th-century calligraphic proportions for high-density digital reading.',
      location: 'Stockholm, Sweden',
      website: 'https://lindqvistfoundry.se',
      is_online: true,
      created_at: '2025-04-05T10:00:00Z',
    },
    {
      id: 7,
      username: 'devon_brooks',
      email: 'devon@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Devon Brooks',
      profile_picture: makeAvatarSvg('DB', '#1E1B4B', '#4338CA'),
      cover_image: GENERATED_IMAGES.workspace,
      bio: 'Acoustic architect & mastering engineer. Designing birch-baffle listening rooms and recording spatial field ambiences.',
      location: 'Montreal, Canada',
      website: 'https://brooksacoustics.ca',
      is_online: false,
      created_at: '2025-04-22T18:30:00Z',
    },
    {
      id: 8,
      username: 'nadia_mansour',
      email: 'nadia@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Nadia Mansour',
      profile_picture: makeAvatarSvg('NM', '#14532D', '#15803D'),
      cover_image: GENERATED_IMAGES.alpine,
      bio: 'Botanical illustrator & arid-climate landscape architect researching ancient courtyard cooling and desert flora preservation.',
      location: 'Cairo, Egypt',
      website: 'https://nadiamansour.org',
      is_online: true,
      created_at: '2025-05-10T08:05:00Z',
    },
    {
      id: 9,
      username: 'julian_mercer',
      email: 'julian@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Julian Mercer',
      profile_picture: makeAvatarSvg('JM', '#3F2E21', '#9A3412'),
      cover_image: GENERATED_IMAGES.pavilion,
      bio: 'Kinetic sculptor working with counterweighted brass pendulums, heliostats, and natural solar caustics.',
      location: 'New York, NY',
      website: 'https://mercerkinetics.com',
      is_online: true,
      created_at: '2025-05-28T13:40:00Z',
    },
    {
      id: 10,
      username: 'hannah_kim',
      email: 'hannah@aether.social',
      passwordHash: 'AetherPass2026!',
      full_name: 'Hannah Kim',
      profile_picture: makeAvatarSvg('HK', '#111827', '#4B5563'),
      cover_image: GENERATED_IMAGES.workspace,
      bio: 'Computational designer & creative technologist bridging generative shaders, paper folding geometry, and tactile print.',
      location: 'Seoul, South Korea',
      website: 'https://hannahkim.kr',
      is_online: true,
      created_at: '2025-06-12T15:55:00Z',
    },
  ];

  const posts: DBPost[] = [
    {
      id: 1,
      user_id: 1,
      content: 'Evening light grazing the cantilevered travertine roof at our Lake Como pavilion study. By angling the western aperture at 14 degrees, the reflecting pool projects slow-moving ripples across the ceiling for the final forty minutes of sunset. #architecture #daylight #minimalism #materiality',
      image: GENERATED_IMAGES.pavilion,
      images: [GENERATED_IMAGES.pavilion, GENERATED_IMAGES.banner],
      location: 'Lake Como, Italy',
      hashtags: ['architecture', 'daylight', 'minimalism', 'materiality'],
      mentions: [],
      shares_count: 18,
      created_at: '2026-09-30T10:40:00Z',
      updated_at: '2026-09-30T10:40:00Z',
    },
    {
      id: 2,
      user_id: 2,
      content: 'Morning calibration on the MK-IV polyphonic voice card alongside fresh V60 coffee and schematic revisions. Switched the filter resonance pots to custom-machined phosphor bronze knurled knobs—the rotational damping feels unmistakable under the fingertips. Collaboration notes with @devon_brooks incoming. #industrialdesign #synthesizer #hardware #craft',
      image: GENERATED_IMAGES.workspace,
      images: [GENERATED_IMAGES.workspace],
      location: 'Kreuzberg Studio, Berlin',
      hashtags: ['industrialdesign', 'synthesizer', 'hardware', 'craft'],
      mentions: ['devon_brooks'],
      shares_count: 24,
      created_at: '2026-09-30T09:15:00Z',
      updated_at: '2026-09-30T09:15:00Z',
    },
    {
      id: 3,
      user_id: 3,
      content: 'At 2,940 meters in the Southern Japanese Alps, twenty minutes before sunrise broke through the valley inversion. Shot on 6x7 medium format film with a 90mm lens after a four-hour nocturnal ascent. Silence at this elevation has a physical weight. #photography #alpine #documentary #filmphotography',
      image: GENERATED_IMAGES.alpine,
      images: [GENERATED_IMAGES.alpine],
      location: 'Kita-dake Ridge, Yamanashi',
      hashtags: ['photography', 'alpine', 'documentary', 'filmphotography'],
      mentions: [],
      shares_count: 31,
      created_at: '2026-09-30T07:50:00Z',
      updated_at: '2026-09-30T07:50:00Z',
    },
    {
      id: 4,
      user_id: 5,
      content: 'Unloading reduction kiln batch #42 this morning. Using unrefined basalt dust mixed with locust bean ash gave these stoneware amphorae a satin metallic crust that shifts from charcoal to warm ochre depending on window angle. Thank you @elena_rostova for the spatial placement notes! #ceramics #materiality #atelier #craft',
      image: GENERATED_IMAGES.storyAtelier,
      images: [GENERATED_IMAGES.storyAtelier, EDITORIAL_CANVASES.ceramics],
      location: 'Peckham Kiln Works, London',
      hashtags: ['ceramics', 'materiality', 'atelier', 'craft'],
      mentions: ['elena_rostova'],
      shares_count: 14,
      created_at: '2026-09-29T21:10:00Z',
      updated_at: '2026-09-29T21:10:00Z',
    },
    {
      id: 5,
      user_id: 6,
      content: 'Finalizing optical size masters for "Vespera Serif"—our new editorial typeface engineered specifically for long-form essays and architectural monographs. Notice how the high x-height and bracketed terminals maintain razor crispness at 15px while singing at 48px display scale. #typography #editorial #designsystems #graphicdesign',
      image: EDITORIAL_CANVASES.typography,
      images: [EDITORIAL_CANVASES.typography],
      location: 'Södermalm, Stockholm',
      hashtags: ['typography', 'editorial', 'designsystems', 'graphicdesign'],
      mentions: [],
      shares_count: 19,
      created_at: '2026-09-29T18:25:00Z',
      updated_at: '2026-09-29T18:25:00Z',
    },
    {
      id: 6,
      user_id: 4,
      content: 'Why do so many modern web interfaces feel sluggish despite running on gigahertz multi-core silicon? Because layout thrashing and unbatched network waterfalls destroy perceived immediacy. We just benchmarked our CRDT sync engine at 0.4ms frame commit latency. #softwarecraft #localfirst #systems #webdev',
      image: '',
      images: [],
      location: 'Dublin, Ireland',
      hashtags: ['softwarecraft', 'localfirst', 'systems', 'webdev'],
      mentions: [],
      shares_count: 42,
      created_at: '2026-09-29T16:00:00Z',
      updated_at: '2026-09-29T16:00:00Z',
    },
    {
      id: 7,
      user_id: 7,
      content: 'Measured the impulse response of our new slotted Baltic birch diffuser wall today. Reverberation time sits at a remarkably linear 0.28 seconds from 125Hz up to 8kHz. Testing it tonight with @marcus_vance’s prototype analog tape loops. #acoustics #sounddesign #synthesizer #studio',
      image: EDITORIAL_CANVASES.acoustics,
      images: [EDITORIAL_CANVASES.acoustics],
      location: 'Mile End Studio, Montreal',
      hashtags: ['acoustics', 'sounddesign', 'synthesizer', 'studio'],
      mentions: ['marcus_vance'],
      shares_count: 11,
      created_at: '2026-09-29T14:15:00Z',
      updated_at: '2026-09-29T14:15:00Z',
    },
    {
      id: 8,
      user_id: 8,
      content: 'Field documentation from the Fayoum Oasis permaculture plots. By pairing traditional sunken courtyard wind-catchers (malqaf) with deep-rooted desert acacia canopy layers, surface soil temperatures dropped by 9.4°C compared to adjacent exposed plots. #botany #architecture #ecology #permaculture',
      image: EDITORIAL_CANVASES.botany,
      images: [EDITORIAL_CANVASES.botany],
      location: 'Fayoum Oasis, Egypt',
      hashtags: ['botany', 'architecture', 'ecology', 'permaculture'],
      mentions: [],
      shares_count: 27,
      created_at: '2026-09-29T11:30:00Z',
      updated_at: '2026-09-29T11:30:00Z',
    },
    {
      id: 9,
      user_id: 9,
      content: 'Installed "Helios Pendulum No. 7" in the south atrium this afternoon. Twelve hand-polished optical prisms suspended on phosphor-bronze cables trace the solar arc across raw lime-plaster walls. #kineticart #sculpture #daylight #installation',
      image: EDITORIAL_CANVASES.kinetics,
      images: [EDITORIAL_CANVASES.kinetics],
      location: 'SoHo, New York',
      hashtags: ['kineticart', 'sculpture', 'daylight', 'installation'],
      mentions: [],
      shares_count: 16,
      created_at: '2026-09-28T22:05:00Z',
      updated_at: '2026-09-28T22:05:00Z',
    },
    {
      id: 10,
      user_id: 10,
      content: 'Translating differential growth algorithms from WebGL compute shaders into 300gsm cotton rag risograph prints. When digital math meets imperfect soy ink registration, the emergent moiré patterns feel genuinely alive. #generativeart #computationaldesign #printmaking #shaders',
      image: GENERATED_IMAGES.banner,
      images: [GENERATED_IMAGES.banner],
      location: 'Mapo-gu, Seoul',
      hashtags: ['generativeart', 'computationaldesign', 'printmaking', 'shaders'],
      mentions: [],
      shares_count: 22,
      created_at: '2026-09-28T19:40:00Z',
      updated_at: '2026-09-28T19:40:00Z',
    },
    {
      id: 11,
      user_id: 1,
      content: 'Material board for the Basel Kunsthalle reading room: untreated silver fir, beeswax-rubbed blackened steel, and compressed wool felt for acoustic dampening. Architecture should age with dignity rather than fight patina. #architecture #materiality #minimalism #interiors',
      image: GENERATED_IMAGES.banner,
      images: [GENERATED_IMAGES.banner],
      location: 'ETH Hönggerberg, Zurich',
      hashtags: ['architecture', 'materiality', 'minimalism', 'interiors'],
      mentions: [],
      shares_count: 9,
      created_at: '2026-09-28T15:20:00Z',
      updated_at: '2026-09-28T15:20:00Z',
    },
    {
      id: 12,
      user_id: 2,
      content: 'Three rules we follow in our hardware lab: 1) Every primary control gets a dedicated physical potentiometer—no menu diving. 2) Fasteners remain visible and serviceable with a standard hex key. 3) Schematics ship inside the lid. #industrialdesign #hardware #righttorepair #craft',
      image: '',
      images: [],
      location: 'Berlin, Germany',
      hashtags: ['industrialdesign', 'hardware', 'righttorepair', 'craft'],
      mentions: [],
      shares_count: 35,
      created_at: '2026-09-28T12:10:00Z',
      updated_at: '2026-09-28T12:10:00Z',
    },
    {
      id: 13,
      user_id: 3,
      content: 'Darkroom contact sheets from the Noto Peninsula coastal series. Silver gelatin fiber prints toned in selenium—there is a depth in the shadow transitions of wet darkroom paper that inkjet pigments still struggle to emulate. #photography #filmphotography #darkroom #documentary',
      image: GENERATED_IMAGES.alpine,
      images: [GENERATED_IMAGES.alpine],
      location: 'Kyoto Darkroom Collective',
      hashtags: ['photography', 'filmphotography', 'darkroom', 'documentary'],
      mentions: [],
      shares_count: 13,
      created_at: '2026-09-27T20:45:00Z',
      updated_at: '2026-09-27T20:45:00Z',
    },
    {
      id: 14,
      user_id: 4,
      content: 'Published our open-source SQLite-to-PostgreSQL migration toolkit for Django REST applications. Zero-downtime schema validation, strict foreign key indexing, and deterministic seed runners included. #django #python #postgresql #softwarecraft',
      image: '',
      images: [],
      location: 'Dublin, Ireland',
      hashtags: ['django', 'python', 'postgresql', 'softwarecraft'],
      mentions: [],
      shares_count: 29,
      created_at: '2026-09-27T17:30:00Z',
      updated_at: '2026-09-27T17:30:00Z',
    },
    {
      id: 15,
      user_id: 5,
      content: 'Testing raw termite-mound clay harvested near Enugu blended with 15% crushed feldspar. Fired to Cone 10, the natural iron oxide blooms through the translucent celadon glaze like constellations. #ceramics #materiality #craft #atelier',
      image: EDITORIAL_CANVASES.ceramics,
      images: [EDITORIAL_CANVASES.ceramics],
      location: 'Lagos, Nigeria',
      hashtags: ['ceramics', 'materiality', 'craft', 'atelier'],
      mentions: [],
      shares_count: 17,
      created_at: '2026-09-27T14:00:00Z',
      updated_at: '2026-09-27T14:00:00Z',
    },
    {
      id: 16,
      user_id: 6,
      content: 'Why tabular numerals (`font-variant-numeric: tabular-nums`) matter in interface design: without fixed-width glyph metrics, live counters, timestamps, and financial tables jitter horizontally on every state tick. Details make the grid. #typography #designsystems #ui #editorial',
      image: '',
      images: [],
      location: 'Stockholm, Sweden',
      hashtags: ['typography', 'designsystems', 'ui', 'editorial'],
      mentions: [],
      shares_count: 38,
      created_at: '2026-09-27T10:15:00Z',
      updated_at: '2026-09-27T10:15:00Z',
    },
    {
      id: 17,
      user_id: 7,
      content: 'Dawn chorus field recording session in the Laurentian boreal forest using a matched pair of omnidirectional condensers on a Jecklin disc. Pure, uncompressed spatial air before the wind rose. #sounddesign #acoustics #fieldrecording #nature',
      image: EDITORIAL_CANVASES.acoustics,
      images: [EDITORIAL_CANVASES.acoustics],
      location: 'Laurentides, Quebec',
      hashtags: ['sounddesign', 'acoustics', 'fieldrecording', 'nature'],
      mentions: [],
      shares_count: 8,
      created_at: '2026-09-26T22:50:00Z',
      updated_at: '2026-09-26T22:50:00Z',
    },
    {
      id: 18,
      user_id: 8,
      content: 'Completed the watercolor plates for our monograph on Sinai medicinal endemics. Hand-ground malachite and ochre pigments on cold-pressed cotton paper preserve botanical color accuracy for centuries. #botany #illustration #ecology #archive',
      image: EDITORIAL_CANVASES.botany,
      images: [EDITORIAL_CANVASES.botany],
      location: 'Cairo, Egypt',
      hashtags: ['botany', 'illustration', 'ecology', 'archive'],
      mentions: [],
      shares_count: 21,
      created_at: '2026-09-26T18:00:00Z',
      updated_at: '2026-09-26T18:00:00Z',
    },
    {
      id: 19,
      user_id: 9,
      content: 'Sketching the counterweight geometry for our upcoming Venice Architecture Biennale commission with @elena_rostova. A 6-meter cantilevered bronze arm balanced by a single basalt boulder from the Ticino valley. #architecture #sculpture #kineticart #materiality',
      image: GENERATED_IMAGES.pavilion,
      images: [GENERATED_IMAGES.pavilion],
      location: 'Brooklyn Navy Yard, NY',
      hashtags: ['architecture', 'sculpture', 'kineticart', 'materiality'],
      mentions: ['elena_rostova'],
      shares_count: 15,
      created_at: '2026-09-26T13:20:00Z',
      updated_at: '2026-09-26T13:20:00Z',
    },
    {
      id: 20,
      user_id: 10,
      content: 'Weekend studio study: writing a custom raymarching signed-distance-field renderer to simulate how morning light scatters through translucent porcelain vessels inspired by @amara_okafor’s latest kiln batch. #shaders #computationaldesign #ceramics #daylight',
      image: GENERATED_IMAGES.workspace,
      images: [GENERATED_IMAGES.workspace],
      location: 'Seoul, South Korea',
      hashtags: ['shaders', 'computationaldesign', 'ceramics', 'daylight'],
      mentions: ['amara_okafor'],
      shares_count: 20,
      created_at: '2026-09-26T09:10:00Z',
      updated_at: '2026-09-26T09:10:00Z',
    },
  ];

  // Nested comments demonstrating Post -> Comment -> Reply -> Reply
  const comments: DBComment[] = [
    {
      id: 1,
      post_id: 1,
      user_id: 3,
      parent_comment_id: null,
      content: 'The caustic reflections on the underside of that travertine soffit are extraordinary, Elena. Did you treat the pool basin with dark basalt to increase surface reflectivity?',
      created_at: '2026-09-30T10:52:00Z',
      updated_at: '2026-09-30T10:52:00Z',
    },
    {
      id: 2,
      post_id: 1,
      user_id: 1,
      parent_comment_id: 1,
      content: 'Spot on, @sora_takahashi! We lined the shallow basin with honed Valser quartzite slabs—only 18cm of water depth, but the dark stone acts like a black mirror.',
      created_at: '2026-09-30T11:04:00Z',
      updated_at: '2026-09-30T11:04:00Z',
    },
    {
      id: 3,
      post_id: 1,
      user_id: 9,
      parent_comment_id: 2,
      content: 'That 18cm depth also tunes the wave frequency when the lake breeze picks up—we noticed the exact same optical cadence on our Venice bronze basin mockup!',
      created_at: '2026-09-30T11:15:00Z',
      updated_at: '2026-09-30T11:15:00Z',
    },
    {
      id: 4,
      post_id: 1,
      user_id: 5,
      parent_comment_id: null,
      content: 'The warmth of the travertine against that cool twilight sky feels timeless. Would love to see how raw stoneware vessels sit in the entry loggia.',
      created_at: '2026-09-30T11:22:00Z',
      updated_at: '2026-09-30T11:22:00Z',
    },
    {
      id: 5,
      post_id: 2,
      user_id: 7,
      parent_comment_id: null,
      content: 'Cannot wait to run the stereo output through our birch room this weekend. Did you keep the discrete JFET saturation stage on the master bus?',
      created_at: '2026-09-30T09:35:00Z',
      updated_at: '2026-09-30T09:35:00Z',
    },
    {
      id: 6,
      post_id: 2,
      user_id: 2,
      parent_comment_id: 5,
      content: 'Yes! Kept the dual JFET drive with a true-bypass relay toggle right above the output transformers.',
      created_at: '2026-09-30T09:48:00Z',
      updated_at: '2026-09-30T09:48:00Z',
    },
    {
      id: 7,
      post_id: 3,
      user_id: 6,
      parent_comment_id: null,
      content: 'The tonal separation in the granite ridge versus the cloud sea is breathtaking. Medium format film grain has such an organic architecture.',
      created_at: '2026-09-30T08:15:00Z',
      updated_at: '2026-09-30T08:15:00Z',
    },
    {
      id: 8,
      post_id: 4,
      user_id: 1,
      parent_comment_id: null,
      content: 'The iron-rich reduction texture on the tall vessel on the second shelf is sublime, Amara. Setting two of those aside for the Zurich pavilion library.',
      created_at: '2026-09-29T21:40:00Z',
      updated_at: '2026-09-29T21:40:00Z',
    },
    {
      id: 9,
      post_id: 6,
      user_id: 10,
      parent_comment_id: null,
      content: '100% agreed. Moving state mutations to optimistic local stores with compositor-only CSS transitions completely transforms how tactile web software feels.',
      created_at: '2026-09-29T16:45:00Z',
      updated_at: '2026-09-29T16:45:00Z',
    },
  ];

  const likes: DBLike[] = [
    { id: 1, user_id: 2, post_id: 1, created_at: '2026-09-30T10:45:00Z' },
    { id: 2, user_id: 3, post_id: 1, created_at: '2026-09-30T10:48:00Z' },
    { id: 3, user_id: 5, post_id: 1, created_at: '2026-09-30T10:55:00Z' },
    { id: 4, user_id: 6, post_id: 1, created_at: '2026-09-30T11:02:00Z' },
    { id: 5, user_id: 9, post_id: 1, created_at: '2026-09-30T11:10:00Z' },
    { id: 6, user_id: 1, post_id: 2, created_at: '2026-09-30T09:20:00Z' },
    { id: 7, user_id: 4, post_id: 2, created_at: '2026-09-30T09:25:00Z' },
    { id: 8, user_id: 7, post_id: 2, created_at: '2026-09-30T09:30:00Z' },
    { id: 9, user_id: 10, post_id: 2, created_at: '2026-09-30T09:42:00Z' },
    { id: 10, user_id: 1, post_id: 3, created_at: '2026-09-30T08:00:00Z' },
    { id: 11, user_id: 2, post_id: 3, created_at: '2026-09-30T08:10:00Z' },
    { id: 12, user_id: 5, post_id: 3, created_at: '2026-09-30T08:22:00Z' },
    { id: 13, user_id: 6, post_id: 3, created_at: '2026-09-30T08:30:00Z' },
    { id: 14, user_id: 8, post_id: 3, created_at: '2026-09-30T08:45:00Z' },
    { id: 15, user_id: 1, post_id: 4, created_at: '2026-09-29T21:30:00Z' },
    { id: 16, user_id: 3, post_id: 4, created_at: '2026-09-29T21:50:00Z' },
    { id: 17, user_id: 8, post_id: 4, created_at: '2026-09-29T22:10:00Z' },
    { id: 18, user_id: 1, post_id: 5, created_at: '2026-09-29T19:00:00Z' },
    { id: 19, user_id: 4, post_id: 5, created_at: '2026-09-29T19:15:00Z' },
    { id: 20, user_id: 10, post_id: 6, created_at: '2026-09-29T16:30:00Z' },
    { id: 21, user_id: 2, post_id: 6, created_at: '2026-09-29T16:40:00Z' },
    { id: 22, user_id: 2, post_id: 7, created_at: '2026-09-29T14:25:00Z' },
    { id: 23, user_id: 1, post_id: 8, created_at: '2026-09-29T12:00:00Z' },
    { id: 24, user_id: 1, post_id: 9, created_at: '2026-09-28T22:30:00Z' },
    { id: 25, user_id: 5, post_id: 10, created_at: '2026-09-28T20:00:00Z' },
  ];

  const commentLikes: DBCommentLike[] = [
    { id: 1, user_id: 1, comment_id: 1 },
    { id: 2, user_id: 9, comment_id: 1 },
    { id: 3, user_id: 3, comment_id: 2 },
    { id: 4, user_id: 1, comment_id: 3 },
    { id: 5, user_id: 1, comment_id: 4 },
    { id: 6, user_id: 2, comment_id: 5 },
  ];

  const follows: DBFollow[] = [
    { id: 1, follower_id: 1, following_id: 2, created_at: '2026-09-01T10:00:00Z' },
    { id: 2, follower_id: 1, following_id: 3, created_at: '2026-09-01T10:05:00Z' },
    { id: 3, follower_id: 1, following_id: 5, created_at: '2026-09-02T11:00:00Z' },
    { id: 4, follower_id: 1, following_id: 6, created_at: '2026-09-03T12:00:00Z' },
    { id: 5, follower_id: 1, following_id: 9, created_at: '2026-09-04T14:00:00Z' },
    { id: 6, follower_id: 2, following_id: 1, created_at: '2026-09-01T15:00:00Z' },
    { id: 7, follower_id: 3, following_id: 1, created_at: '2026-09-02T09:00:00Z' },
    { id: 8, follower_id: 4, following_id: 1, created_at: '2026-09-03T09:00:00Z' },
    { id: 9, follower_id: 5, following_id: 1, created_at: '2026-09-04T09:00:00Z' },
    { id: 10, follower_id: 6, following_id: 1, created_at: '2026-09-05T09:00:00Z' },
    { id: 11, follower_id: 8, following_id: 1, created_at: '2026-09-06T09:00:00Z' },
    { id: 12, follower_id: 9, following_id: 1, created_at: '2026-09-07T09:00:00Z' },
    { id: 13, follower_id: 10, following_id: 1, created_at: '2026-09-08T09:00:00Z' },
    { id: 14, follower_id: 2, following_id: 7, created_at: '2026-09-05T10:00:00Z' },
    { id: 15, follower_id: 7, following_id: 2, created_at: '2026-09-05T10:05:00Z' },
    { id: 16, follower_id: 3, following_id: 5, created_at: '2026-09-06T11:00:00Z' },
    { id: 17, follower_id: 5, following_id: 3, created_at: '2026-09-06T11:10:00Z' },
  ];

  const notifications: DBNotification[] = [
    {
      id: 1,
      recipient_id: 1,
      sender_id: 3,
      notification_type: 'comment',
      post_id: 1,
      comment_id: 1,
      is_read: false,
      created_at: '2026-09-30T10:52:00Z',
    },
    {
      id: 2,
      recipient_id: 1,
      sender_id: 9,
      notification_type: 'reply',
      post_id: 1,
      comment_id: 3,
      is_read: false,
      created_at: '2026-09-30T11:15:00Z',
    },
    {
      id: 3,
      recipient_id: 1,
      sender_id: 5,
      notification_type: 'mention',
      post_id: 4,
      comment_id: null,
      is_read: false,
      created_at: '2026-09-29T21:10:00Z',
    },
    {
      id: 4,
      recipient_id: 1,
      sender_id: 2,
      notification_type: 'like',
      post_id: 1,
      comment_id: null,
      is_read: true,
      created_at: '2026-09-30T10:45:00Z',
    },
    {
      id: 5,
      recipient_id: 1,
      sender_id: 10,
      notification_type: 'follow',
      post_id: null,
      comment_id: null,
      is_read: true,
      created_at: '2026-09-28T09:00:00Z',
    },
  ];

  const bookmarks: DBBookmark[] = [
    { id: 1, user_id: 1, post_id: 3, created_at: '2026-09-30T08:05:00Z' },
    { id: 2, user_id: 1, post_id: 4, created_at: '2026-09-29T21:35:00Z' },
    { id: 3, user_id: 1, post_id: 6, created_at: '2026-09-29T17:00:00Z' },
  ];

  const messages: DBMessage[] = [
    {
      id: 1,
      sender_id: 2,
      receiver_id: 1,
      content: 'Hi Elena! We just finished milling the bronze acoustic sconces for the Zurich reading room mockup. Would love to send over the CAD tolerances.',
      attachment: '',
      is_read: true,
      created_at: '2026-09-30T08:30:00Z',
    },
    {
      id: 2,
      sender_id: 1,
      receiver_id: 2,
      content: 'Morning Marcus! That timing is ideal—we are reviewing the timber joinery details at 14:00 CET today. Send the drawings right over.',
      attachment: '',
      is_read: true,
      created_at: '2026-09-30T08:36:00Z',
    },
    {
      id: 3,
      sender_id: 2,
      receiver_id: 1,
      content: 'Here is the bench prototype photo from Kreuzberg this morning. Notice the brushed bevel along the mounting plate.',
      attachment: GENERATED_IMAGES.workspace,
      is_read: false,
      created_at: '2026-09-30T09:18:00Z',
    },
    {
      id: 4,
      sender_id: 5,
      receiver_id: 1,
      content: 'Elena, the two basalt-glazed amphorae from Kiln Batch #42 survived reduction firing without a single crazing line! Shipping crates leave London on Thursday.',
      attachment: '',
      is_read: false,
      created_at: '2026-09-30T10:12:00Z',
    },
    {
      id: 5,
      sender_id: 3,
      receiver_id: 1,
      content: 'I will be in Zurich next Tuesday with the silver gelatin prints from the Lake Como dusk study. Coffee near Limmatquai?',
      attachment: '',
      is_read: true,
      created_at: '2026-09-29T19:00:00Z',
    },
  ];

  const stories: DBStory[] = [
    {
      id: 1,
      user_id: 5,
      media: GENERATED_IMAGES.storyAtelier,
      caption: 'Morning sun across reduction batch #42 in Peckham Atelier',
      created_at: '2026-09-30T06:30:00Z',
      expires_at: '2026-10-02T06:30:00Z',
      viewed_by: [],
    },
    {
      id: 2,
      user_id: 1,
      media: GENERATED_IMAGES.pavilion,
      caption: 'Golden hour reflection tests at Lake Como Pavilion',
      created_at: '2026-09-30T07:15:00Z',
      expires_at: '2026-10-02T07:15:00Z',
      viewed_by: [2, 3],
    },
    {
      id: 3,
      user_id: 2,
      media: GENERATED_IMAGES.workspace,
      caption: 'Voice card calibration & V60 pour-over in Kreuzberg',
      created_at: '2026-09-30T08:00:00Z',
      expires_at: '2026-10-02T08:00:00Z',
      viewed_by: [],
    },
    {
      id: 4,
      user_id: 3,
      media: GENERATED_IMAGES.alpine,
      caption: '2,940m ridge ascent before first light · Yamanashi',
      created_at: '2026-09-30T08:45:00Z',
      expires_at: '2026-10-02T08:45:00Z',
      viewed_by: [],
    },
    {
      id: 5,
      user_id: 6,
      media: EDITORIAL_CANVASES.typography,
      caption: 'Vespera Serif optical size specimen proofing',
      created_at: '2026-09-30T09:10:00Z',
      expires_at: '2026-10-02T09:10:00Z',
      viewed_by: [],
    },
    {
      id: 6,
      user_id: 9,
      media: EDITORIAL_CANVASES.kinetics,
      caption: 'Caustic prism alignment in the SoHo atrium',
      created_at: '2026-09-30T09:50:00Z',
      expires_at: '2026-10-02T09:50:00Z',
      viewed_by: [],
    },
  ];

  return {
    users,
    posts,
    comments,
    likes,
    commentLikes,
    follows,
    notifications,
    bookmarks,
    messages,
    stories,
  };
}
