export const eventTypes = ["Items to Serve", "Knowledge to Serve", "Peace to Serve"] as const;

export type EventType = (typeof eventTypes)[number];

export interface PartnerMatch {
  name: string;
  capabilities: string[];
}

export interface VolunteerMatch {
  name: string;
  interests: string[];
}

export interface EventMatchPreview {
  partnerNeeds: string[];
  partners: PartnerMatch[];
  volunteers: VolunteerMatch[];
}

export interface DirectoryMatch {
  eligible: boolean;
  score: number;
  matchedSkills: string[];
}

interface MatchRule {
  label: string;
  aliases: string[];
}

const matchRules: Record<EventType, MatchRule[]> = {
  "Items to Serve": [
    { label: "pre-loved item handling", aliases: ["pre loved", "sorting", "packing", "donation", "collection"] },
    { label: "distribution", aliases: ["distribution", "community outreach"] },
    { label: "logistics and transport", aliases: ["logistics", "transport", "driving", "delivery"] },
    { label: "warehouse and inventory", aliases: ["warehouse", "storage", "inventory", "stock management"] },
    { label: "sustainability", aliases: ["sustainability", "recycling", "reuse"] },
    { label: "event venue", aliases: ["collection venue", "condominium management", "event venue"] },
  ],
  "Knowledge to Serve": [
    { label: "computer and digital literacy", aliases: ["computer", "digital", "technology", "it support", "mobile apps"] },
    { label: "teaching and facilitation", aliases: ["teaching", "teacher", "training", "trainer", "facilitation", "facilitator", "coaching", "education"] },
    { label: "course administration", aliases: ["course administration", "training administration", "learning materials"] },
    { label: "classroom facilities", aliases: ["classroom", "computer facilities", "training room"] },
  ],
  "Peace to Serve": [
    { label: "yoga", aliases: ["yoga"] },
    { label: "zumba and fitness", aliases: ["zumba", "fitness instruction", "exercise instructor"] },
    { label: "meditation and mindfulness", aliases: ["meditation", "mindfulness", "breathing exercise"] },
    { label: "mental wellness", aliases: ["mental wellness", "wellbeing", "wellness", "peer support"] },
    { label: "active ageing", aliases: ["active ageing", "senior fitness"] },
    { label: "wellness venue", aliases: ["wellness venue", "wellness facilities", "studio space"] },
  ],
};

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const matchingDirectory: Record<EventType, EventMatchPreview> = {
  "Items to Serve": {
    partnerNeeds: ["Condominium management", "Venue", "Transport", "Warehouse"],
    partners: [
      { name: "Bayview Residences MCST", capabilities: ["Condominium management", "Collection venue"] },
      { name: "GreenCycle Logistics", capabilities: ["Transport", "Warehouse"] },
      { name: "Community Storage Hub", capabilities: ["Warehouse", "Distribution operations"] },
    ],
    volunteers: [
      { name: "Aisha Rahman", interests: ["Pre-loved item sorting", "Community distribution"] },
      { name: "Daniel Tan", interests: ["Logistics", "Transport coordination"] },
      { name: "Mei Lin", interests: ["Sustainability", "Inventory support"] },
    ],
  },
  "Knowledge to Serve": {
    partnerNeeds: ["Computer facilities", "Classroom facilities", "Course administration"],
    partners: [
      { name: "TechForward Singapore", capabilities: ["Computer facilities", "Digital trainers"] },
      { name: "Skills Lab Academy", capabilities: ["Classroom facilities", "Course administration"] },
      { name: "LearnConnect SG", capabilities: ["Course administration", "Learning materials"] },
    ],
    volunteers: [
      { name: "Arjun Nair", interests: ["Computer literacy", "Teaching seniors"] },
      { name: "Siti Nur", interests: ["Digital skills", "Course facilitation"] },
      { name: "Rachel Wong", interests: ["Training administration", "Education"] },
    ],
  },
  "Peace to Serve": {
    partnerNeeds: ["Yoga, Zumba or meditation teachers", "Wellness venue"],
    partners: [
      { name: "Calm Collective SG", capabilities: ["Yoga teachers", "Meditation teachers"] },
      { name: "ActiveAge Studio", capabilities: ["Zumba instructors", "Wellness venue"] },
      { name: "Harmony Community Club", capabilities: ["Accessible venue", "Wellness facilities"] },
    ],
    volunteers: [
      { name: "Priya Kumar", interests: ["Yoga", "Mindfulness"] },
      { name: "Farah Lim", interests: ["Zumba", "Active ageing"] },
      { name: "Marcus Lee", interests: ["Meditation", "Mental wellness"] },
    ],
  },
};

export function getEventMatchPreview(eventType: EventType, eventName: string): EventMatchPreview {
  const match = matchingDirectory[eventType];
  const words = eventName.toLowerCase().split(/\W+/).filter((word) => word.length > 2);

  if (words.length === 0) {
    return match;
  }

  const score = (values: string[]) =>
    values.reduce(
      (total, value) => total + words.filter((word) => value.toLowerCase().includes(word)).length,
      0,
    );

  return {
    ...match,
    partners: [...match.partners].sort(
      (left, right) => score(right.capabilities) - score(left.capabilities),
    ),
    volunteers: [...match.volunteers].sort(
      (left, right) => score(right.interests) - score(left.interests),
    ),
  };
}

export function getDirectoryMatch(eventType: EventType, eventName: string, values: string[]): DirectoryMatch {
  const haystack = normalise(values.join(" "));
  const matchedSkills = matchRules[eventType]
    .filter((rule) => rule.aliases.some((alias) => haystack.includes(normalise(alias))))
    .map((rule) => rule.label);

  if (matchedSkills.length === 0) {
    return { eligible: false, score: 0, matchedSkills: [] };
  }

  const eventWords = new Set(normalise(eventName).split(" ").filter((word) => word.length > 3));
  const nameOverlap = [...eventWords].filter((word) => haystack.includes(word)).length;
  return {
    eligible: true,
    score: Math.min(97, 68 + matchedSkills.length * 8 + Math.min(5, nameOverlap * 2)),
    matchedSkills,
  };
}

export function scoreDirectoryMatch(eventType: EventType, eventName: string, values: string[]) {
  return getDirectoryMatch(eventType, eventName, values).score;
}
