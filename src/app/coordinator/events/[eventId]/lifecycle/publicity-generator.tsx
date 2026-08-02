"use client";

import { useState } from "react";
import { CheckCircle2, Download, ImageIcon, Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicityDraft } from "@/types/publicity";

import {
  generateClosureDraftAction,
  getClosureConceptsAction,
  publishClosurePublicityAction,
} from "./actions";

type Phase = "IDLE" | "GENERATING_DRAFT" | "REVIEW" | "PUBLISHED";

export function PublicityGenerator({ eventId }: { eventId: string }) {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [draft, setDraft] = useState<PublicityDraft | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const posterFilename = draft?.imageUrl.split("/").at(-1) ?? "publicity-poster.png";

  async function handleGenerateConcepts() {
    setError(null);
    setLoading(true);
    setPhase("GENERATING_DRAFT");
    const result = await getClosureConceptsAction(eventId);
    if (!result.success) {
      setLoading(false);
      setError(result.error ?? "Could not generate concepts.");
      setPhase("IDLE");
      return;
    }
    const draftResult = await generateClosureDraftAction(result.concepts![0], result.metadata!);
    setLoading(false);
    if (!draftResult.success) {
      setError(draftResult.error ?? "Draft generation failed.");
      setPhase("IDLE");
      return;
    }
    setDraft(draftResult.draft!);
    setCaption(draftResult.draft!.caption);
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

  function handleStartOver() {
    setDraft(null);
    setCaption("");
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
          {loading ? "Preparing publicity…" : "Generate Poster & Instagram Caption"}
        </Button>
      )}

      {phase === "GENERATING_DRAFT" && (
        <Card className="border-0">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">
              Selecting the category poster and preparing an Instagram caption…
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
          {draft.generationNote && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{draft.generationNote}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-0 overflow-hidden">
              <CardContent className="p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Passion2Serve publicity poster"
                  className="aspect-[4/5] w-full bg-muted object-contain"
                  src={draft.imageUrl}
                />
              </CardContent>
            </Card>
            <div className="space-y-3">
              <label className="text-sm font-semibold" htmlFor="publicity-caption">
                Instagram caption
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
            <Button asChild variant="outline">
              <a download={posterFilename} href={draft.imageUrl} target="_blank" rel="noopener noreferrer">
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
                  alt="Published Passion2Serve publicity poster"
                  className="aspect-[4/5] w-full bg-muted object-contain"
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
                    <a download={posterFilename} href={draft.imageUrl} target="_blank" rel="noopener noreferrer">
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
