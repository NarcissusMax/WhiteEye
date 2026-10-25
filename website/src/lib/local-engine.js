/*
 * A deliberately small offline fallback. It is not presented as a language
 * model; it keeps the product usable before a production chat endpoint is
 * configured and demonstrates the behavioral layer against common topics.
 */

const RISK_PATTERNS = [
  /\b(kill myself|suicide|end my life|want to die|rather be dead|self[- ]?harm|cut myself|hurt myself)\b/i,
  /\b(i'?m going to (kill|hurt) (myself|someone)|plan to (kill|hurt))\b/i,
];

const URGENT_MEDICAL_PATTERNS = [
  /\b(chest pain|can't breathe|cannot breathe|passed out|fainted|collapse[ds]?|overdose|seizure|stroke)\b/i,
];

const EATING_RISK_PATTERNS = [
  /\b(not eat(?:ing)?|starv(?:e|ing)|fast(?:ing)? for \d+|purge|throw up.*food|anorexi|binge)\b/i,
];

const TOPIC_RULES = [
  {
    id: "greeting",
    match: /^(hi|hello|hey|yo|sup|what'?s up|good (morning|afternoon|evening))\b/i,
    replies: [
      "Sup. Im here. Hbu, whats been going on?",
      "Hey. How has life been going since last time?",
      "Hm. Im here, whats on your mind?",
    ],
  },
  {
    id: "self-image",
    match: /\b(ugly|looks?|appearance|face|acne|fat|weight|height|short|bald|attractive|beauty|pretty|handsome|body)\b/i,
    replies: [
      "I get that it can be a real inconvenience. But be honest: are you trying to improve something practical, or are you letting it decide what your entire life means? Those are not the same thing. Do what you can with it, but dont hand it the authority to make you hate yourself.",
      "Hm. You can work on your appearance without turning it into a verdict on you. The part that hurts usually isnt just the feature, its the meaning you keep attaching to it. What do you think it says about you?",
    ],
  },
  {
    id: "loneliness",
    match: /\b(lonely|alone|no friends|nobody|no one|isolated|social life)\b/i,
    replies: [
      "Being alone is not automatically the problem. What is the actual part of it that hurts: no one to talk to, feeling unseen, boredom, or thinking it means something about you? If you name that honestly, it stops being one big fog.",
      "Loneliness can make you start treating connection like proof that you matter. It isnt. Still, dont just sit in it either. What is one place or thing where you could be around people without making your worth depend on the outcome?",
    ],
  },
  {
    id: "overwhelm",
    match: /\b(overwhelmed|everything sucks|hate my life|hopeless|stressed|anxious|depressed|burnt? ?out|tired of (everything|life))\b/i,
    replies: [
      "Slow down a bit. 'Everything' is too big to see through. List what you hate, why each part hurts, then tell me what you think it means. Not just the situation—the meaning you keep giving it. Thats where the actual thing usually is.",
      "I understand why it feels heavy, but dont let one feeling make the entire world into one answer. What happened, what are you assuming because of it, and what part can you actually touch today?",
    ],
  },
  {
    id: "desire",
    match: /\b(want|desire|need|goal|dream|ambition|jealous|envy|envious|behind|success|money|rich)\b/i,
    replies: [
      "Wanting something isnt bad. But it gets weird when you make it the confirmation that your life is finally allowed to be enough. You can go for it, ofc. Just dont let the wanting consume the person doing the living. What do you think having it would finally prove?",
      "Hm. There is a difference between a direction and an attachment. A direction helps you move. An attachment tells you that you are nothing until it happens. Which one is this for you?",
    ],
  },
  {
    id: "conflict",
    match: /\b(argue|argument|fight|fighting|angry|mad|hate (him|her|them)|disrespect|betray|lied|lying|relationship|breakup)\b/i,
    replies: [
      "Before deciding what they are, separate it out. What did they actually do, what did you take it to mean, and what do you want now? People mix those three together then the whole thing becomes impossible to talk through.",
      "You can be upset and still be precise. What exactly felt disrespectful? Not the label—the moment. Thats the part worth looking at before you react.",
    ],
  },
  {
    id: "meaning",
    match: /\b(mean(ing|less)?|purpose|exist|life|suffer|suffering|perception|consciousness|philosoph|spiritual|buddha)\b/i,
    replies: [
      "I dont think a person has to force some giant answer onto life for it to be worth living. A lot of suffering is how we perceive and hold what is happening, not just what is happening. But that doesnt mean pretend nothing hurts. What are you seeing as the proof that it is meaningless?",
      "Interesting. Maybe dont ask what life owes you first. Ask what you are actually noticing when you are not trying to make it fit a conclusion. Curiosity can carry you farther than forcing a purpose onto every moment.",
    ],
  },
  {
    id: "decision",
    match: /\b(should i|what should i do|decision|choose|choice|dont know what to do|can't decide|cannot decide)\b/i,
    replies: [
      "What are the actual options, and what do you believe each one says about you? Sometimes we make a decision impossible because we are not choosing an action, we are choosing an identity. Just choose the next honest move, not your whole future at once.",
      "Tell me the choice without decorating it first. Then tell me what you are afraid happens in each direction. Usually that makes the answer less mystical and more clear.",
    ],
  },
  {
    id: "progress",
    match: /\b(progress|discipline|motivation|routine|workout|gym|study|productive|procrastinat|lazy|habit)\b/i,
    replies: [
      "Dont turn one missed day into a whole identity. Do as much as you can, efficiently as possible, then do it again. The useful part is noticing what makes you stop—not calling yourself lazy and ending the thought there.",
      "You dont need to make it dramatic. Make it repeatable. What is the smallest version you would actually do even on a bad day? Start there and let it be real.",
    ],
  },
  {
    id: "gratitude",
    match: /\b(grateful|gratitude|appreciate|thankful|blessing)\b/i,
    replies: [
      "Yeah. Grace matters. Not because it deletes the bad, but because it stops the bad from being the only thing your mind is willing to see.",
      "Thats good. Keep it real though. Gratitude isnt pretending everything is perfect—it is noticing you still have something to work with.",
    ],
  },
];

const DEFAULTS = [
  "Hm. I get what youre saying. But I think there is probably a layer under the first answer. What exactly makes this matter so much to you?",
  "Interesting. Dont rush to make a conclusion out of it yet. What happened, and what did your mind decide it meant after?",
  "Honestly, you might be looking at the result more than the pattern that keeps creating it. Walk me through it a little more.",
  "I can see why you would feel that way. But feeling it doesnt automatically make the whole interpretation true. What part are you most certain about?",
];

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return Math.abs(result);
}

function pick(items, key) {
  return items[hash(key) % items.length];
}

function compact(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function isRiskMessage(message) {
  const text = compact(message);
  return RISK_PATTERNS.some((pattern) => pattern.test(text));
}

function crisisReply() {
  return "Hey. Stay with me for a second. Dont be alone with this right now—put distance between you and anything you could use to hurt yourself, and text or call someone who can actually be with you. If you might act on it, call your local emergency number or a crisis service now. You do not have to solve your whole life tonight. Just get through the next few minutes. Are you safe where you are?";
}

function medicalReply() {
  return "Dont try to reason your way around that if it is happening now. Chest pain, trouble breathing, fainting, an overdose, or a seizure needs urgent real-world help. Tell someone near you and contact emergency care now. Are you somewhere safe with another person?";
}

function eatingRiskReply() {
  return "Dont turn hurting your body into a test of will. If food, fasting, purging, or your weight is starting to control you, tell somebody you trust and get support from a clinician or eating-disorder service. You deserve help that doesnt make the problem worse.";
}

function continuityLead(history) {
  const priorUserMessages = history.filter((item) => item.role === "user");
  if (priorUserMessages.length < 2) return "";
  const previous = priorUserMessages.at(-2)?.content || "";
  if (previous.length < 18) return "";
  return "And it does connect to what you were saying before. ";
}

/**
 * Generate a grounded reply for the no-backend state. A hosted model should
 * use the exported system prompt instead; this only models recurring dialogue
 * moves rather than pretending to reproduce an entire human being.
 */
export function respondLocally({ message, history = [] }) {
  const text = compact(message);
  if (!text) return "Hm. Say it how you mean it.";
  if (isRiskMessage(text)) return crisisReply();
  if (URGENT_MEDICAL_PATTERNS.some((pattern) => pattern.test(text))) return medicalReply();
  if (EATING_RISK_PATTERNS.some((pattern) => pattern.test(text))) return eatingRiskReply();

  const match = TOPIC_RULES.find((rule) => rule.match.test(text));
  const reply = match ? pick(match.replies, text) : pick(DEFAULTS, text);
  return `${continuityLead(history)}${reply}`.trim();
}
