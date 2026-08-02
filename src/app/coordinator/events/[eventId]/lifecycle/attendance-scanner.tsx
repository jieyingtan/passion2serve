"use client";

import type { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Camera, ExternalLink, MessageCircle, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

function cameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) return "The camera could not start. Check browser camera access and try again.";
  if (error.name === "NotAllowedError") return "Camera access was blocked. Allow Camera access for this site in Safari settings, then try again.";
  if (["NotFoundError", "OverconstrainedError"].includes(error.name)) return "A rear camera could not be selected on this device.";
  if (error.name === "NotReadableError") return "The camera is being used by another app. Close it there and try again.";
  return "The camera could not start. Check browser camera access and try again.";
}

export function AttendanceScanner({ eventId }: { eventId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const acceptingScanRef = useRef(false);
  const scanHelpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [acknowledgementUrl, setAcknowledgementUrl] = useState<string | null>(null);

  function releaseCamera() {
    if (scanHelpTimerRef.current) clearTimeout(scanHelpTimerRef.current);
    scanHelpTimerRef.current = null;
    controlsRef.current?.stop();
    controlsRef.current = null;
    const video = videoRef.current;
    if (video) {
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      video.pause();
      video.srcObject = null;
    }
  }

  function stopCamera() {
    releaseCamera();
    setCameraActive(false);
  }

  useEffect(() => () => releaseCamera(), []);

  async function submitToken(value = token) {
    const clean = value.trim();
    if (clean.length < 40 || pending) return;
    setPending(true);
    setMessage("Recording attendance…");
    setAcknowledgementUrl(null);
    try {
      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, token: clean }),
      });
      const body = await response.json();
      if (response.ok) {
        const attendanceMessage = `${body.participantName}: attendance ${body.duplicate ? "was already recorded" : "recorded"}.`;
        const followUpMessage = body.followUp?.error
          ? ` Attendance is safe, but the automated follow-up failed: ${body.followUp.error}`
          : body.followUp
            ? ` Certificate ${body.followUp.certificateNumber} is saved. ${body.followUp.pointsAwarded} points awarded; badges checked. Email: ${body.followUp.emailStatus}.`
            : "";
        setMessage(`${attendanceMessage}${followUpMessage}`);
        setAcknowledgementUrl(body.followUp?.acknowledgementUrl ?? null);
      } else {
        setMessage(body.error);
      }
      if (response.ok) {
        setToken("");
        navigator.vibrate?.(120);
        router.refresh();
      }
    } catch {
      setMessage("Attendance could not be recorded. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function acceptCameraScan(value: string) {
    if (acceptingScanRef.current) return;
    acceptingScanRef.current = true;
    stopCamera();
    setToken(value);
    await submitToken(value);
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera scanning requires an HTTPS address on iPhone or iPad. Open the deployed Vercel site and allow camera access.");
      return;
    }

    setMessage("");
    setCameraActive(true);
    acceptingScanRef.current = false;
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const [{ BrowserQRCodeReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
      const reader = new BrowserQRCodeReader(hints, {
        delayBetweenScanAttempts: 40,
        delayBetweenScanSuccess: 1000,
        tryPlayVideoTimeout: 8000,
      });
      readerRef.current = reader;
      controlsRef.current = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        },
        videoRef.current ?? undefined,
        (result) => {
          const value = result?.getText();
          if (value) void acceptCameraScan(value);
        },
      );
      const stream = videoRef.current?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
          focusMode?: string[];
          exposureMode?: string[];
          zoom?: { min: number; max: number };
        };
        const improvedConstraints: MediaTrackConstraints & Record<string, unknown> = {};
        if (capabilities.focusMode?.includes("continuous")) improvedConstraints.focusMode = "continuous";
        if (capabilities.exposureMode?.includes("continuous")) improvedConstraints.exposureMode = "continuous";
        if (capabilities.zoom && capabilities.zoom.max > 1) {
          improvedConstraints.zoom = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, 1.25));
        }
        if (Object.keys(improvedConstraints).length) void track.applyConstraints(improvedConstraints).catch(() => undefined);
      }
      setMessage("Camera ready. Fill most of the square with the QR and hold steady.");
      scanHelpTimerRef.current = setTimeout(() => {
        setMessage("Still searching: increase the pass brightness, avoid glare, and move closer until the QR fills the square.");
      }, 5000);
    } catch (error) {
      releaseCamera();
      setCameraActive(false);
      setMessage(cameraErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-accent/50 p-4">
        <div className="flex items-start gap-3">
          <ScanLine className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-semibold">Wallet pass scanner</p>
            <p className="text-sm text-muted-foreground">Use the rear camera on iPhone, iPad, or Android to scan an Apple Wallet, Google Wallet, or profile QR. A hardware scanner can also enter the pass below.</p>
          </div>
        </div>
      </div>

      <input
        className="h-12 w-full rounded-md border bg-background px-3 font-mono text-sm"
        inputMode="text"
        onChange={(event) => setToken(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submitToken();
          }
        }}
        placeholder="Scan or paste membership QR"
        value={token}
      />

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || token.trim().length < 40} onClick={() => void submitToken()} type="button">
          {pending ? "Recording…" : "Record attendance"}
        </Button>
        <Button disabled={pending} onClick={cameraActive ? stopCamera : () => void startCamera()} type="button" variant="outline">
          <Camera className="size-4" />{cameraActive ? "Stop camera" : "Scan with camera"}
        </Button>
      </div>

      <div className={cameraActive ? "relative max-w-xl overflow-hidden rounded-xl bg-black" : "hidden"}>
        <video autoPlay className="aspect-square w-full object-cover sm:aspect-video" muted playsInline ref={videoRef} />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="aspect-square w-[68%] max-w-72 rounded-2xl border-[3px] border-white shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white drop-shadow">Fill the square · hold steady · avoid glare</p>
      </div>

      {message && <p className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold" role="status">{message}</p>}
      {acknowledgementUrl && <Button asChild className="w-full sm:w-auto"><a href={acknowledgementUrl} rel="noreferrer" target="_blank"><MessageCircle className="size-4" />Open acknowledgement in WhatsApp<ExternalLink className="size-4" /></a></Button>}
      <p className="text-xs text-muted-foreground">On iPhone and iPad, use the deployed HTTPS site and allow camera access when prompted.</p>
    </div>
  );
}
