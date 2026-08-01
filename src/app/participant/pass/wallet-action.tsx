"use client";

import { useActionState } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TranslationDict } from "@/lib/i18n";
import { prepareWalletPass, type WalletActionState } from "./actions";

export function WalletAction({ t }: { t: TranslationDict }) { const [state, action, pending] = useActionState<WalletActionState, FormData>(prepareWalletPass, {}); return <form action={action} className="mt-5 space-y-2"><Button disabled={pending} type="submit"><Smartphone className="size-4" />{pending ? t.pass.preparing : t.pass.prepareWallet}</Button>{state.error && <p className="text-sm text-destructive">{state.error}</p>}{state.success && <p className="text-sm font-semibold text-emerald-700">{state.success}</p>}</form>}
