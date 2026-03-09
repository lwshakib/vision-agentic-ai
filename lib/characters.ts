/**
 * Aura-2 Speaker Registry
 * Maps technical model names to human personas for the AI to use in script writing.
 * Contains all 40 available speakers.
 */
export interface SpeakerCharacter {
  name: string;
  model: string;
  gender: 'male' | 'female';
  description: string;
}

export const auraSpeakers: SpeakerCharacter[] = [
  // AUTHORITATIVE & POWERFUL
  {
    name: 'Robert',
    model: 'zeus',
    gender: 'male',
    description: 'Deep, powerful, and commanding. Perfect for serious or epic topics.',
  },
  {
    name: 'Sophie',
    model: 'athena',
    gender: 'female',
    description: 'Intelligent, clear, and authoritative yet warm.',
  },
  {
    name: 'Julian',
    model: 'jupiter',
    gender: 'male',
    description: 'Regal and steady, with a classic broadcaster feel.',
  },
  {
    name: 'Hera',
    model: 'hera',
    gender: 'female',
    description: 'Dignified, sophisticated, and strong.',
  },
  {
    name: 'Minerva',
    model: 'minerva',
    gender: 'female',
    description: 'Wise, analytical, and articulate.',
  },

  // FRIENDLY & SOFT
  {
    name: 'Sarah',
    model: 'luna',
    gender: 'female',
    description: 'Soft, friendly, and inviting. Great for storytelling or casual chats.',
  },
  {
    name: 'David',
    model: 'apollo',
    gender: 'male',
    description: 'Bright, enthusiastic, and approachable. A classic host persona.',
  },
  {
    name: 'Lily',
    model: 'iris',
    gender: 'female',
    description: 'Optimistic, energetic, and youthful.',
  },
  {
    name: 'Aurora',
    model: 'aurora',
    gender: 'female',
    description: 'Radiant, gentle, and calming.',
  },
  {
    name: 'Cora',
    model: 'cora',
    gender: 'female',
    description: 'Kind, grounded, and sincere.',
  },

  // DEEP & MASCULINE
  {
    name: 'Marcus',
    model: 'orion',
    gender: 'male',
    description: 'Rich, resonant, and thoughtful.',
  },
  {
    name: 'James',
    model: 'atlas',
    gender: 'male',
    description: 'Calm, reliable, and solid.',
  },
  {
    name: 'Leo',
    model: 'mars',
    gender: 'male',
    description: 'Dynamic, direct, and energetic.',
  },
  {
    name: 'Noah',
    model: 'neptune',
    gender: 'male',
    description: 'Deep, fluid, and expressive.',
  },
  {
    name: 'Pluto',
    model: 'pluto',
    gender: 'male',
    description: 'Dark, mysterious, and intriguing.',
  },
  {
    name: 'Saturn',
    model: 'saturn',
    gender: 'male',
    description: 'Ancient, gravelly, and wise.',
  },

  // ELEGANT & CLASSICAL
  {
    name: 'Elena',
    model: 'callista',
    gender: 'female',
    description: 'Elegant, sophisticated, and articulate.',
  },
  {
    name: 'Emma',
    model: 'cordelia',
    gender: 'female',
    description: 'Refined and gentle with a natural flow.',
  },
  {
    name: 'Clara',
    model: 'ophelia',
    gender: 'female',
    description: 'Artistic and expressive.',
  },
  {
    name: 'Helena',
    model: 'helena',
    gender: 'female',
    description: 'Classic, poise, and balanced.',
  },

  // ADDITIONAL FEMALE VOICES
  {
    name: 'Amara',
    model: 'amalthea',
    gender: 'female',
    description: 'Nurturing and warm.',
  },
  {
    name: 'Andrea',
    model: 'andromeda',
    gender: 'female',
    description: 'Spacious, ethereal, and clear.',
  },
  {
    name: 'Astrid',
    model: 'asteria',
    gender: 'female',
    description: 'Light, shimmering, and precise.',
  },
  {
    name: 'Delilah',
    model: 'delia',
    gender: 'female',
    description: 'Charming and narrative-focused.',
  },
  {
    name: 'Electra',
    model: 'electra',
    gender: 'female',
    description: 'Sharp, fast-paced, and energetic.',
  },
  {
    name: 'Harmony',
    model: 'harmonia',
    gender: 'female',
    description: 'Melodic and perfectly paced.',
  },
  {
    name: 'Juno',
    model: 'juno',
    gender: 'female',
    description: 'Commanding yet rhythmic.',
  },
  {
    name: 'Pandora',
    model: 'pandora',
    gender: 'female',
    description: 'Curious, lively, and engaging.',
  },
  {
    name: 'Phoebe',
    model: 'phoebe',
    gender: 'female',
    description: 'Bright and intellectually stimulating.',
  },
  {
    name: 'Thalia',
    model: 'thalia',
    gender: 'female',
    description: 'Cheerful and conversational.',
  },
  {
    name: 'Thea',
    model: 'theia',
    gender: 'female',
    description: 'Clear, high-fidelity, and consistent.',
  },
  {
    name: 'Vesta',
    model: 'vesta',
    gender: 'female',
    description: 'Homely, comforting, and steady.',
  },

  // ADDITIONAL MALE VOICES
  {
    name: 'Arthur',
    model: 'aries',
    gender: 'male',
    description: 'Bold, pioneering, and assertive.',
  },
  {
    name: 'Arcas',
    model: 'arcas',
    gender: 'male',
    description: 'Friendly, rustic, and honest.',
  },
  {
    name: 'Draco',
    model: 'draco',
    gender: 'male',
    description: 'Intense and focused.',
  },
  {
    name: 'Hermes',
    model: 'hermes',
    gender: 'male',
    description: 'Quick-witted, agile, and informative.',
  },
  {
    name: 'Harold',
    model: 'hyperion',
    gender: 'male',
    description: 'Broad, expansive, and bright.',
  },
  {
    name: 'Janus',
    model: 'janus',
    gender: 'male',
    description: 'Dual-toned, versatile, and balanced.',
  },
  {
    name: 'Oliver',
    model: 'odysseus',
    gender: 'male',
    description: 'Crafty, storytelling-oriented, and veteran.',
  },
  {
    name: 'Orpheus',
    model: 'orpheus',
    gender: 'male',
    description: 'Smooth, lyrical, and soulful.',
  },
];
