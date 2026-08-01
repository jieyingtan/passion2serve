"use client";

import { useState } from "react";
import { CheckCircle2, Download, ImageIcon, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EventClosureMetadata, PublicityDraft, VisualConcept } from "@/types/publicity";

import {
  generateClosureDraftAction,
  getClosureConceptsAction,
  publishClosurePublicityAction,
} from "./actions";

type Phase = "IDLE" | "SELECTING_CONCEPT" | "GENERATING_DRAFT" | "REVIEW" | "PUBLISHED";

export function PublicityGenerator({ eventId }: { eventId: string }) {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [concepts, setConcepts] = useState<VisualConcept[]>([]);
  const [metadata, setMetadata] = useState<EventClosureMetadata | null>(null);
  const [draft, setDraft] = useState<PublicityDraft | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerateConcepts() {
    setError(null);
    setLoading(true);
    const result = await getClosureConceptsAction(eventId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not generate concepts.");
      return;
    }
    setConcepts(result.concepts!);
    setMetadata(result.metadata!);
    setPhase("SELECTING_CONCEPT");
  }

  async function handleSelectConcept(concept: VisualConcept) {
    if (!metadata) return;
    setError(null);
    setPhase("GENERATING_DRAFT");
    const result = await generateClosureDraftAction(concept, metadata);
    if (!result.success) {
      setError(result.error ?? "Draft generation failed.");
      setPhase("SELECTING_CONCEPT");
      return;
    }
    setDraft(result.draft!);
    setCaption(result.draft!.caption);
    setPhase("REVIEW");
  }

  async function handlePublish() {
    if (!draft) return;
    setError(null);
    setLoading(true);
    const result = await publishClosurePublicityAction(eventId, caption, draft.imageUrl);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Publication failed.");
      return;
    }
    setPhase("PUBLISHED");
  }

  function handleRegenerate() {
    setDraft(null);
    setCaption("");
    setPhase("SELECTING_CONCEPT");
  }

  function handleStartOver() {
    setDraft(null);
    setCaption("");
    setConcepts([]);
    setMetadata(null);
    setPhase("IDLE");
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}

      {phase === "IDLE" && (
        <Button disabled={loading} onClick={handleGenerateConcepts}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {loading ? "Generating concepts…" : "Draft AI Publicity Poster"}
        </Button>
      )}

      {phase === "SELECTING_CONCEPT" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            Choose a visual direction for the poster:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {concepts.map((concept) => (
              <Card
                className="cursor-pointer border-0 transition-shadow hover:shadow-md"
                key={concept.id}
                onClick={() => handleSelectConcept(concept)}
              >
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{concept.conceptName}</p>
                    <Badge variant="outline">{concept.lightingMood}</Badge>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {concept.headlineHook}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {concept.visualFocus}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {concept.targetAudienceNote}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {phase === "GENERATING_DRAFT" && (
        <Card className="border-0">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">
              Generating poster via FLUX.1 schnell and social copy…
            </p>
            <div className="grid w-full gap-3 sm:grid-cols-2">
              <div className="h-64 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "REVIEW" && draft && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-0 overflow-hidden">
              <CardContent className="p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="AI-generated publicity poster"
                  className="aspect-square w-full object-cover"
                  src={draft.imageUrl}
                />
              </CardContent>
            </Card>
            <div className="space-y-3">
              <label className="text-sm font-semibold" htmlFor="publicity-caption">
                Social media caption
              </label>
              <textarea
                className="min-h-48 w-full rounded-md border bg-background p-3 text-sm"
                id="publicity-caption"
                onChange={(e) => setCaption(e.target.value)}
                value={caption}
              />
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {draft.imagePrompt}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRegenerate} variant="outline">
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
            <Button asChild variant="outline">
              <a download="publicity-poster.jpg" href={draft.imageUrl} target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
                Download Image
              </a>
            </Button>
            <Button disabled={loading || !caption.trim()} onClick={handlePublish}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {loading ? "Publishing…" : "Approve & Post"}
            </Button>
          </div>
        </div>
      )}

      {phase === "PUBLISHED" && draft && (
        <Card className="border-0">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-6 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-700">Published successfully</p>
                <p className="text-sm text-muted-foreground">
                  The publicity poster and caption have been saved and the event has been archived.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Published publicity poster"
                  className="aspect-square w-full object-cover"
                  src={draft.imageUrl}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold">Published caption:</p>
                <p className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                  {caption}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a download="publicity-poster.jpg" href={draft.imageUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="size-4" />
                      Download Image
                    </a>
                  </Button>
                  <Button onClick={handleStartOver} size="sm" variant="ghost">
                    Generate another
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
