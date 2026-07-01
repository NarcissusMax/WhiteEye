// shared types for the whiteeye experience

export type Role = 'user' | 'whiteeye';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

export interface IntakeAnswer {
  question: string;
  answer: string;
  order: number;
}

export interface SessionMeta {
  id: string;
  title: string;
  toneSeed: string | null;
  createdAt: string;
  updatedAt?: string;
  messageCount?: number;
  preview?: string;
}

export interface FullSession extends SessionMeta {
  messages: ChatMessage[];
  intake: IntakeAnswer[];
}

// the intake questions whiteeye asks at the door
export const INTAKE_QUESTIONS: { id: string; prompt: string; placeholder: string }[] = [
  {
    id: 'running',
    prompt: 'what are you running from?',
    placeholder: "say it plainly. don't decorate it.",
  },
  {
    id: 'want',
    prompt: 'do you want comfort or truth?',
    placeholder: 'choose one word. you already know which.',
  },
  {
    id: 'lie',
    prompt: "what's the lie you keep telling yourself?",
    placeholder: 'the one you almost believe.',
  },
];

// landing / ambient quotes pulled from canon
export const WHITEEYE_QUOTES: string[] = [
  'i wasn\u2019t suffering. i just had my eyes closed.',
  'how do you know you\u2019re suffering? by perceiving your situation in a state of suffering.',
  'nothing has value, therefore live your life as its own, not as another.',
  'you don\u2019t desire to see. you just do.',
  'do you have grace?',
  'if i didn\u2019t get to see the day, then i\u2019d get to see the grass and the moon.',
];
