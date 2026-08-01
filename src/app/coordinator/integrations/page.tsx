import { AlertTriangle, CheckCircle2, Circle, ExternalLink, Mail, MessageCircle, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMailjetConfigured } from "@/lib/mailjet/client";
import { getWhatsAppConfiguration } from "@/lib/whatsapp/client";

import { MailjetTestButton, WhatsAppTestButton } from "./test-buttons";

function ChecklistItem({ complete, label }: { complete: boolean; label: string }) {
  return <li className="flex items-start gap-2 text-sm">{complete ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-amber-600" />}<span>{label}</span></li>;
}

export default function IntegrationsPage() {
  const mailjet = isMailjetConfigured();
  const whatsapp = getWhatsAppConfiguration();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`;
  const publicWebhook = webhookUrl.startsWith("https://");
  return <div className="mx-auto max-w-5xl space-y-8">
    <div><span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-primary"><Settings2 className="size-4" />Phase 4 integrations</span><h1 className="mt-4 text-3xl font-bold">Automated messaging</h1><p className="mt-2 text-muted-foreground">Test Mailjet delivery and connect Meta WhatsApp Cloud API for approved template messages.</p></div>
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="size-5 text-primary" />Mailjet <Badge variant={mailjet ? "success" : "warning"}>{mailjet ? "Configured" : "Setup required"}</Badge></CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Sends registration receipts, reminders, attendance confirmations, and named certificate attachments.</p>{mailjet && <MailjetTestButton />}</CardContent></Card>
      <Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="size-5 text-primary" />WhatsApp <Badge variant={whatsapp.automationReady ? "success" : "warning"}>{whatsapp.automationReady ? "Automation ready" : whatsapp.sendReady ? "Sending ready" : "Meta setup required"}</Badge></CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Uses Meta Cloud API templates for registrations, reminders, and attendance acknowledgements. Participant consent is required.</p><Button asChild variant="outline"><a href="https://developers.facebook.com/apps/" rel="noreferrer" target="_blank">Open Meta Developer setup <ExternalLink className="size-4" /></a></Button>{whatsapp.sendReady && <WhatsAppTestButton />}</CardContent></Card>
    </div>
    <Card className="border-0"><CardHeader><CardTitle>WhatsApp readiness</CardTitle></CardHeader><CardContent className="grid gap-6 md:grid-cols-2">
      <div><h3 className="font-semibold">Cloud API credentials</h3><ul className="mt-3 space-y-2"><ChecklistItem complete={!whatsapp.sendMissing.includes("WHATSAPP_PROVIDER=meta_cloud")} label="Provider set to meta_cloud" /><ChecklistItem complete={!whatsapp.sendMissing.includes("WHATSAPP_ACCESS_TOKEN")} label="Permanent or test access token" /><ChecklistItem complete={!whatsapp.sendMissing.includes("WHATSAPP_PHONE_NUMBER_ID")} label="WhatsApp phone number ID" /></ul></div>
      <div><h3 className="font-semibold">Webhook and automation</h3><ul className="mt-3 space-y-2"><ChecklistItem complete={!whatsapp.webhookMissing.includes("WHATSAPP_VERIFY_TOKEN")} label="Webhook verification token" /><ChecklistItem complete={!whatsapp.webhookMissing.includes("WHATSAPP_APP_SECRET")} label="Meta app secret for signed webhooks" /><ChecklistItem complete={whatsapp.templateMissing.length === 0} label="Registration, reminder, and acknowledgement templates" /></ul></div>
    </CardContent></Card>
    <Card className={`border-0 ${publicWebhook ? "bg-emerald-50" : "bg-amber-50"}`}><CardContent className="flex gap-3 p-5">{publicWebhook ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />}<div className="min-w-0"><p className="font-semibold">Webhook callback URL</p><code className="mt-1 block break-all text-sm">{webhookUrl}</code><p className="mt-2 text-sm text-muted-foreground">{publicWebhook ? "Use this URL in the Meta app and subscribe to the messages field." : "Meta requires a publicly reachable HTTPS callback. Set NEXT_PUBLIC_APP_URL to the deployed Vercel URL before webhook verification."}</p></div></CardContent></Card>
    {!whatsapp.sendReady && <Card className="border-0 bg-muted"><CardContent className="p-5 text-sm"><p className="font-semibold">Current mode: pre-filled WhatsApp links</p><p className="mt-1 text-muted-foreground">Email and certificates continue working while Meta setup is incomplete. Add the missing server variables to enable automated template sending.</p></CardContent></Card>}
  </div>;
}
