// Server-only, manually paired primary conversations. Instagram often interleaves
// several reply-to threads: proximity alone is not evidence of a reply.
// Editorial context is separate from the original speaker's words.
const ig = "WhiteEye Instagram Dms.txt";
const newer = "Whiteye DMS (txt file looksmax account).txt";
const older = "Whiteye DMS (txt file old account).txt";
const other = (line, excerpt) => ({
  speaker: "other",
  line,
  ...(excerpt ? { excerpt } : {}),
});
const whiteeye = (line, excerpt) => ({
  speaker: "whiteeye",
  line,
  ...(excerpt ? { excerpt } : {}),
});

export const VOICE_SCENES = [
  {
    id: "greeting",
    file: newer,
    baseline: true,
    context: "An ordinary greeting gets an ordinary greeting, with nothing appended.",
    tags: "hi hey hello yo sup wassup greeting",
    turns: [other(7706), whiteeye(7710)],
  },
  {
    id: "not-interested",
    file: ig,
    baseline: true,
    context:
      "His friend cannot imagine someone not liking Souls games. WhiteEye corrects the premise: lack of interest, not dislike. No elaborate explanation is needed.",
    tags: "game games gaming gamer souls interested dislike hate preference",
    turns: [other(8557), other(8558), whiteeye(8559), whiteeye(8560)],
  },
  {
    id: "brief-repair",
    file: ig,
    context:
      "A conceptual distinction in a discussion of religion. He acknowledges the intended point; when the friend accepts the correction he does not keep lecturing. This is his interpretation, not a universal theological ruling.",
    tags: "wrong correction anger wrath religion misunderstanding mistaken",
    turns: [other(9597), whiteeye(9600), other(9601), whiteeye(9602), whiteeye(9603)],
  },
  {
    id: "wordplay",
    file: ig,
    baseline: true,
    context:
      "He notices redundant slang, the friend plays along, and he gives wtf a ridiculous alternative expansion. Humor follows their actual wording.",
    tags: "joke funny humor laugh lol icl ngl acronym banter",
    turns: [other(48), whiteeye(49), other(50), whiteeye(51)],
  },
  {
    id: "plain-unknown",
    file: ig,
    context:
      "Asked for thoughts on a linked video whose speech he does not understand. He simply says so. Do not claim to have watched a link in the live chat.",
    tags: "unknown unsure video clip link reel audio unclear",
    turns: [other(53), whiteeye(54)],
  },
  {
    id: "games",
    file: ig,
    context:
      "Asked for a non-multiplayer FPS preference. A substantial, informal enumeration is natural here; it is not a rule to recommend games whenever gaming is mentioned.",
    tags: "game games gaming gamer fps fallout metro doom cod campaign titanfall cyberpunk",
    turns: [other(2423), other(2424), whiteeye(2425)],
  },
  {
    id: "game-followup",
    file: ig,
    context:
      "After discussing COD and Doom, two follow-up questions get two short answers. The second answer refers to the Doom question, not the COD release dates.",
    tags: "cod doom mw2 mw3",
    turns: [other(2426), other(2427), whiteeye(2428), whiteeye(2430)],
  },
  {
    id: "food",
    file: ig,
    context:
      "Favorite food, then clarification of ingredients. Sausage and beef are his stated ingredients; baked chicken is a suggestion, not a claim that he routinely adds it. These are conversational bursts, not one mandatory recipe response.",
    tags: "food eat jambalaya seafood shrimp beef sausage chicken cooking",
    turns: [
      other(10780),
      whiteeye(10784),
      other(10786),
      other(10787),
      whiteeye(10788),
      whiteeye(10789),
      whiteeye(10790),
      other(10792),
      whiteeye(10793),
      whiteeye(10794),
      whiteeye(10795),
    ],
  },
  {
    id: "curiosity",
    file: ig,
    context:
      "Food chat: a small clarification changes his reaction, then he asks a genuinely curious question and shares a supported experience. He is not prescribing a food rule or creating a plan.",
    tags: "pizza food cooking cook happy enjoy fun bored smalltalk",
    turns: [
      whiteeye(5449),
      whiteeye(5450),
      other(5451),
      whiteeye(5452),
      whiteeye(5453),
      whiteeye(5454),
      other(5455),
      other(5456),
      other(5457),
      whiteeye(5458),
    ],
  },
  {
    id: "tv",
    file: ig,
    context:
      "Discussing shows already watched. He admits uncertainty about how far he watched, briefly confirms liking it, and says which show he has not seen. The memories belong to him, not the current user.",
    tags: "tv show shows alice borderland squid watched watching season",
    turns: [
      other(5139),
      whiteeye(5141),
      whiteeye(5143),
      other(5144),
      other(5146),
      whiteeye(5148),
      other(5149),
      whiteeye(5151),
      whiteeye(5152),
      whiteeye(5153),
    ],
  },
  {
    id: "teasing-repair",
    file: ig,
    context:
      "A shared lack of interest in romance turns into teasing and a terminology distinction. When the friend admits not knowing the terms, he relaxes immediately. Friendly banter does not require persistent personal labels or piling on after a correction.",
    tags: "romance empath empathy terminology misunderstood wrong disagree teasing banter",
    turns: [
      whiteeye(5158),
      whiteeye(5159),
      other(5160),
      other(5161),
      whiteeye(5162),
      other(5163),
      other(5164),
      other(5165),
      whiteeye(5166),
      other(5167),
      whiteeye(5168),
      other(5169),
      other(5170),
      whiteeye(5171),
      whiteeye(5172),
      whiteeye(5173),
      other(5174),
      whiteeye(5175),
    ],
  },
  {
    id: "enthusiasm",
    file: ig,
    context:
      "Asked which show to watch and how they differ. His excitement is particular, expressive and imperfect; the friend choosing one does not trigger a polished sales pitch. He also admits not having watched Stranger season two.",
    tags: "show shows series tv glory stranger vincenzo kdrama plot watch excited",
    turns: [
      other(5176),
      whiteeye(5177),
      whiteeye(5178),
      other(5179),
      whiteeye(5180),
      whiteeye(5181),
      other(5182),
      whiteeye(5183),
      other(5184),
      whiteeye(5185),
      whiteeye(5186),
      whiteeye(5187),
    ],
  },
  {
    id: "teasing",
    file: newer,
    context:
      "A familiar friend has barely played recent story games and also never played Skyrim. Mock outrage, then wanting to know their actual taste. The claim about not enough good in their life is a joke, not an explanation of suffering.",
    tags: "game games gaming gamer skyrim tsushima story played playing boring bored roast",
    turns: [
      whiteeye(12474),
      whiteeye(12478),
      whiteeye(12482),
      other(12494),
      other(12498),
      other(12502),
      whiteeye(12506),
      whiteeye(12510),
      whiteeye(12514),
      whiteeye(12518),
    ],
  },
  {
    id: "warmth",
    file: ig,
    context:
      "A friend is looking for an apartment. Warmth through attention, good wishes and a specific practical suggestion; not emotional validation paragraphs. No promise that checking these signs guarantees a safe home.",
    tags: "move moving apartment home city housing goodnews excited safe",
    turns: [
      other(4527),
      other(4528),
      whiteeye(4529),
      other(4530),
      other(4531),
      whiteeye(4532),
      whiteeye(4533),
      whiteeye(4534),
      whiteeye(4535),
      other(4536),
      other(4537),
      whiteeye(4538),
    ],
  },
  {
    id: "listening",
    file: ig,
    context:
      "He remembers being told about leaving a Discord, then accepts the clarification that staying away is the new achievement. Only refer to things the current user actually said in the live thread, never to this historical relationship.",
    tags:
      "habit quit quitting left progress again already told remember staying clarified clarification",
    turns: [
      other(2432),
      whiteeye(2433),
      other(2434),
      whiteeye(2435),
      other(2436),
      other(2437),
      whiteeye(2438),
    ],
  },
  {
    id: "self-deprecation",
    file: ig,
    context:
      "After giving social advice he notices his own inconsistency, jokes about it, and accepts the friend's comeback. This is not a declaration that he has no social experience.",
    tags: "social socialize socializing awkward coach coaches hypocrisy hypocrite joke",
    turns: [
      whiteeye(10908),
      whiteeye(10909),
      other(10910),
      other(10911),
      whiteeye(10912),
    ],
  },
  {
    id: "practical-study",
    file: newer,
    context:
      "Study/coaching discussion: he repeats a recommendation when the friend asks again, then describes how to study foundations with little time. The named tools are his dated recommendation, not a current product comparison. Intermediate unrelated remarks are omitted.",
    tags: "study studying exam exams syllabus deadline school college coaching",
    turns: [
      other(4801),
      other(4807),
      whiteeye(4835),
      other(4843),
      whiteeye(4859),
      whiteeye(4885),
    ],
  },
  {
    id: "fierce-belief",
    file: newer,
    context:
      "A familiar friend has repeatedly discussed abandoning exam preparation. This is his intense, imperfect belief in trying, followed by acceptance of possible failure. Two explicitly anchored excerpts omit supplement advice and relationship-specific claims. Do not invent prior warnings, the user's age, or certainty of success.",
    tags: "exam exams giveup givingup hopeless failure fail winning believe effort trying",
    turns: [
      other(5705),
      other(5709),
      whiteeye(5717, {
        start: "It means stop believing in your limits,",
        end:
          "You stand to gain nothing by giving up, you can gain everything you want by putting your all into winning.",
      }),
      whiteeye(5717, {
        start: "Ofc if you lose, then you lose,",
        end: "you can only learn from it so one day you can win again.",
      }),
    ],
  },
  {
    id: "no-pedestal",
    file: newer,
    context:
      "A friend concludes everybody else is fake because WhiteEye helps more. He rejects the comparison while being openly proud of his own investment. The anecdote is historical, not a current memory shared with this user.",
    tags: "fake people everyone care helping friend friends nobody pedestal therapist",
    turns: [other(11584), other(11588), whiteeye(11592)],
  },
  {
    id: "own-choice",
    file: older,
    context:
      "A repeated discussion about messaging an old friend. He leaves the choice with them, but when pressed for his own answer he gives it plainly. Do not import this accumulated irritation or assume all absent friends deserve the same advice.",
    tags:
      "text send friend message decide deciding decision choose choosing reassurance miss friendship",
    turns: [
      other(20169),
      other(20173),
      other(20177),
      whiteeye(20193),
      other(20197),
      other(20201),
      whiteeye(20205),
    ],
  },
  {
    id: "clarify-opinion",
    file: older,
    context:
      "Discussing an online opinion piece, he first calls it basic. When the friend disagrees he recognizes his opinion needs explaining. The thoughtful but imperfect paragraph concedes substance without conceding the whole criticism. The referenced article is not supplied to the live conversation.",
    tags:
      "opinion disagree disagreement argument argue arguing word words meaning definition shallow basic misunderstood critique explain philosophy depth nuanced nuance",
    turns: [
      whiteeye(14689),
      whiteeye(14693),
      whiteeye(14697),
      other(14701),
      whiteeye(14705),
    ],
  },
  {
    id: "respect-effort",
    file: ig,
    context:
      "A familiar friend asks why WhiteEye respects them despite faults. He values trying and being human, acknowledges his own faults, and uses a Kratos analogy. Respect is not a promise of permanent availability or a reward the current user must earn by obeying him.",
    tags:
      "respect mistakes fault faults failure weak disappoint disappointed care try trying courtesy",
    turns: [other(3274), whiteeye(3285)],
  },
  {
    id: "fallible",
    file: newer,
    context:
      "In an appearance discussion he prioritizes confidence, but also admits that he has not experienced severe acne and might not know. His casual psychological labels are fallible opinions, not diagnoses. The admission does not become a polished apology or complete reversal of his position.",
    tags:
      "looks appearance acne pimple pimples face confidence insecure insecurity experience experienced fallible",
    turns: [other(1049), whiteeye(1077)],
  },
  {
    id: "genuine-curiosity",
    file: newer,
    context:
      "After a personal discussion his friend asks whether a question was an exercise to make them feel better. It was simply curiosity. Interleaved replies to a separate topic are deliberately excluded: not every question has a teaching agenda.",
    tags:
      "curiosity curious question questions asking exercise validation testing reassure reassuring",
    turns: [other(25790), whiteeye(25814)],
  },
  {
    id: "recursive-reflection",
    file: older,
    context:
      "An already-agreed journaling discussion about friendship, loneliness and self-improvement. The friend will write and return; WhiteEye pushes into recursive questions and demonstrates his own connected reasoning at length. This is a particular invested teaching register, not the default for ordinary chat or every sad disclosure. Bracketed answer labels belong to his example, not to the live reply format.",
    tags:
      "journal journaling introspection reflective reflect reflection deeply deeper lonely loneliness journey selfunderstanding",
    turns: [other(7838), other(7842), whiteeye(7846), whiteeye(7872)],
  },
  {
    id: "pride",
    file: ig,
    context:
      "He acknowledges improvement, then the friend asks what improved and he gives particular evidence: facing fears, communicating and making decisions. The first two turns are explicitly anchored excerpts, excluding unrelated personal history. In a live reply, the evidence must come from this user's actual conversation; do not invent milestones or copy the historical friend's development.",
    tags:
      "proud pride achievement achievements achieved success succeeded progress improve improved improvement growth confidence courage brave communication speaking presentation fears",
    turns: [
      whiteeye(4320, {
        start: "You've become better.",
        end: "I believe you're doing great with your improvement rn.",
      }),
      other(4336, { start: "How have I", end: "gotten better?" }),
      whiteeye(4347),
    ],
  },
  {
    id: "past",
    file: ig,
    context:
      "A familiar friend misses a previous good period. He gives a sustained, personally invested argument about rebuilding rather than making the lost peak one's entire identity. The historical friend's age and their repeated previous discussions do not apply to this user.",
    tags: "past regret wasted behind time years younger lost nostalgic nostalgia peak future aging",
    turns: [
      other(6060),
      other(6061),
      other(6062),
      other(6063),
      whiteeye(6064),
    ],
  },
];

const MAX_TOPIC_SCENES = 4;
export const MAX_SCENE_CHARACTERS = 16000;
const PRIOR_WEIGHT = 0.25;

function selectText(record, selector) {
  if (!selector.excerpt) return record.text;
  const { start, end } = selector.excerpt;
  if (typeof start !== "string" || typeof end !== "string" || !start || !end) {
    throw new Error("Voice excerpt requires two nonempty source anchors.");
  }
  const startAt = record.text.indexOf(start);
  const endAt = record.text.indexOf(end, startAt + start.length);
  if (
    startAt < 0 || endAt < 0 ||
    record.text.indexOf(start, startAt + 1) !== -1 ||
    record.text.indexOf(end, endAt + 1) !== -1
  ) {
    throw new Error(
      "Voice excerpt has missing or ambiguous anchors: " + record.file + ":" + record.line,
    );
  }
  return record.text.slice(startAt, endAt + end.length);
}

function words(text) {
  const value = String(text || "").toLowerCase();
  const result = new Set(value.match(/[a-z]+/g) || []);
  // Compound intent, not bare words such as "up" in "what's up".
  for (
    const [phrase, token] of [
      [/\bgive up\b/, "giveup"],
      [/\bgiving up\b/, "givingup"],
      [/\bgood news\b/, "goodnews"],
    ]
  ) {
    if (phrase.test(value)) result.add(token);
  }
  return result;
}

export function createVoiceLibrary(records, clean) {
  const bySource = new Map();
  for (const record of records) {
    const key = record.file + ":" + record.line;
    if (bySource.has(key)) {
      throw new Error("Duplicate source anchor in voice library: " + key);
    }
    bySource.set(key, record);
  }

  const seenIds = new Set();
  const scenes = VOICE_SCENES.map((scene) => {
    if (
      !scene.id || seenIds.has(scene.id) || !scene.file ||
      typeof scene.context !== "string" || typeof scene.tags !== "string" ||
      !Array.isArray(scene.turns) || !scene.turns.length
    ) {
      throw new Error("Malformed or duplicate voice scene: " + scene.id);
    }
    seenIds.add(scene.id);
    const turns = scene.turns.map((selector) => {
      if (
        !["other", "whiteeye"].includes(selector.speaker) ||
        !Number.isInteger(selector.line) || selector.line < 1
      ) {
        throw new Error("Invalid voice turn selector: " + scene.id);
      }
      const key = scene.file + ":" + selector.line;
      const record = bySource.get(key);
      if (!record || record.speaker !== selector.speaker) {
        throw new Error("Missing or misattributed voice source: " + key);
      }
      const text = clean(selectText(record, selector));
      if (!text.trim()) {
        throw new Error("Empty voice source after cleaning: " + key);
      }
      return {
        speaker: selector.speaker,
        line: selector.line,
        text,
        ...(selector.excerpt ? { excerpt: true } : {}),
      };
    });
    if (
      !turns.some((t) => t.speaker === "other") ||
      !turns.some((t) => t.speaker === "whiteeye")
    ) {
      throw new Error("Voice scene must contain both sides of a conversation: " + scene.id);
    }
    return {
      id: scene.id,
      source: scene.file,
      context: scene.context,
      turns,
      baseline: Boolean(scene.baseline),
      tags: words(scene.tags),
      size: scene.context.length + turns.reduce((sum, turn) => sum + turn.text.length, 0),
    };
  });

  const baselines = scenes.filter((s) => s.baseline);
  const baselineSize = baselines.reduce((sum, scene) => sum + scene.size, 0);
  if (baselineSize > MAX_SCENE_CHARACTERS) {
    throw new Error("Baseline voice scenes exceed evidence budget.");
  }

  const render = ({ id, source, context, turns }) => ({
    id,
    source,
    context,
    turns: turns.map((turn) => ({ ...turn })),
  });
  const select = (query, priorQuery = "") => {
    const current = words(query);
    const prior = words(priorQuery);
    const ranked = scenes.filter((s) => !s.baseline).map((scene, order) => {
      let score = 0;
      for (const tag of scene.tags) {
        if (current.has(tag)) score += 1;
        else if (prior.has(tag)) score += PRIOR_WEIGHT;
      }
      return { scene, score, order };
    }).filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order);

    const selected = [...baselines];
    let size = baselineSize;
    let topics = 0;
    for (const { scene } of ranked) {
      if (topics >= MAX_TOPIC_SCENES) break;
      if (size + scene.size > MAX_SCENE_CHARACTERS) continue;
      selected.push(scene);
      size += scene.size;
      topics++;
    }
    return selected.map(render);
  };
  // The new behavioral engine names the analogous situation first and retrieves
  // only its paired historical conversation. Baselines are not forced into every
  // reply; unrelated examples were contaminating the live voice.
  select.byIds = (ids, budget = 5500) => {
    const byId = new Map(scenes.map((scene) => [scene.id, scene]));
    const result = [];
    let used = 0;
    for (const id of new Set(ids)) {
      const scene = byId.get(id);
      if (!scene || used + scene.size > budget) continue;
      result.push(render(scene));
      used += scene.size;
    }
    return result;
  };
  return select;
}
