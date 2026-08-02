import type {
  EventClosureMetadata,
  PublicityDraft,
  VisualConcept,
} from "@/types/publicity";

interface CategoryPublicityTemplate {
  imageUrl: string;
  conceptName: string;
  headlineHook: string;
  visualFocus: string;
  lightingMood: string;
  targetAudienceNote: string;
  captionLead: string;
  captionBody: (metadata: EventClosureMetadata) => string;
  hashtags: string;
}

const categoryTemplates: Record<string, CategoryPublicityTemplate> = {
  "Knowledge to Serve": {
    imageUrl: "/publicity-posters/knowledge-to-serve.png",
    conceptName: "Knowledge to Serve",
    headlineHook: "Knowledge grows when it is shared.",
    visualFocus: "Passion2Serve skills and digital-learning programme poster.",
    lightingMood: "Bright and empowering",
    targetAudienceNote: "Participants, skills-based volunteers, learning partners, and supporters.",
    captionLead: "Knowledge grows when it is shared. 💡",
    captionBody: (metadata) => `${metadata.participantsAttended} participants came together with ${metadata.volunteersAttended} volunteers through ${metadata.title}, building practical skills, confidence, and new possibilities with ${metadata.beneficiaryName}.`,
    hashtags: "#Passion2Serve #KnowledgeToServe #SkillsForLife #DigitalInclusion #CommunityImpact",
  },
  "Items to Serve": {
    imageUrl: "/publicity-posters/items-to-serve.png",
    conceptName: "Items to Serve",
    headlineHook: "Giving useful items a second life.",
    visualFocus: "Passion2Serve pre-loved item collection and distribution poster.",
    lightingMood: "Warm and generous",
    targetAudienceNote: "Donors, logistics partners, volunteers, beneficiaries, and community supporters.",
    captionLead: "Every useful item deserves a second life—and every act of giving creates connection. ♻️❤️",
    captionBody: (metadata) => `Through ${metadata.title}, ${metadata.volunteersAttended} volunteers helped serve ${metadata.participantsAttended} participants alongside ${metadata.beneficiaryName}. Together, our community turned generosity into practical support for the people who needed it.`,
    hashtags: "#Passion2Serve #ItemsToServe #CommunityGiving #SustainableGiving #CommunityImpact",
  },
  "Peace to Serve": {
    imageUrl: "/publicity-posters/peace-to-serve.png",
    conceptName: "Peace to Serve",
    headlineHook: "Move, breathe, and reconnect together.",
    visualFocus: "Passion2Serve wellness, movement, and Zumba programme poster.",
    lightingMood: "Energetic and uplifting",
    targetAudienceNote: "Wellness participants, instructors, venue partners, volunteers, and supporters.",
    captionLead: "Movement, mindfulness, and community—one joyful step at a time. 🧘‍♀️✨",
    captionBody: (metadata) => `${metadata.participantsAttended} participants and ${metadata.volunteersAttended} volunteers joined ${metadata.title} with ${metadata.beneficiaryName} to make space for wellbeing, connection, and shared energy.`,
    hashtags: "#Passion2Serve #PeaceToServe #CommunityWellness #MoveTogether #WellbeingForAll",
  },
};

function templateFor(category: string) {
  return categoryTemplates[category] ?? categoryTemplates["Knowledge to Serve"];
}

function createInstagramCaption(metadata: EventClosureMetadata, template: CategoryPublicityTemplate) {
  const impact = metadata.keyImpactMetric.trim().replace(/[.!]+$/, "");
  return `${template.captionLead}\n\n${template.captionBody(metadata)}\n\nOur impact: ${impact}. Thank you to every participant, volunteer, partner, and supporter who made this possible. Together, we connect, serve, and grow.\n\n${template.hashtags}`;
}

export async function generateVisualConcepts(metadata: EventClosureMetadata): Promise<VisualConcept[]> {
  const template = templateFor(metadata.category);
  return [{
    id: metadata.category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    conceptName: template.conceptName,
    headlineHook: template.headlineHook,
    visualFocus: template.visualFocus,
    lightingMood: template.lightingMood,
    targetAudienceNote: template.targetAudienceNote,
  }];
}

export async function generatePublicityDraft(
  concept: VisualConcept,
  metadata: EventClosureMetadata,
): Promise<PublicityDraft> {
  const template = templateFor(metadata.category);
  return {
    imageUrl: template.imageUrl,
    imagePrompt: `${concept.conceptName} approved Passion2Serve poster for the ${metadata.category} category.`,
    caption: createInstagramCaption(metadata, template),
    generationNote: "AI-generated publicity content: the poster and caption ready to be posted!",
  };
}
