import { ExternalLink, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OutreachSendForm({ href }: { href: string | null }) {
  if (!href) {
    return <Button className="w-full" disabled size="sm" type="button" variant="outline"><MessageCircle className="size-3.5" />Phone number unavailable</Button>;
  }
  return (
    <Button asChild className="w-full" size="sm" variant="outline">
      <a href={href} rel="noreferrer" target="_blank"><MessageCircle className="size-3.5" />Open pre-filled WhatsApp<ExternalLink className="size-3.5" /></a>
    </Button>
  );
}
