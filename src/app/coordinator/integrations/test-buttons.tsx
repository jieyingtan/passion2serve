"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendMailjetTest,sendWhatsAppTest,type IntegrationTestState } from "./actions";

export function MailjetTestButton(){const[state,action,pending]=useActionState<IntegrationTestState,FormData>(sendMailjetTest,{});return <form action={action} className="space-y-2"><Button disabled={pending} type="submit">{pending?"Sending…":"Send test email"}</Button>{state.error&&<p className="text-sm text-destructive">{state.error}</p>}{state.success&&<p className="text-sm text-emerald-700">{state.success}</p>}</form>}
export function WhatsAppTestButton(){const[state,action,pending]=useActionState<IntegrationTestState,FormData>(sendWhatsAppTest,{});return <form action={action} className="space-y-2"><Button disabled={pending} type="submit">{pending?"Sending…":"Send test WhatsApp"}</Button>{state.error&&<p className="text-sm text-destructive">{state.error}</p>}{state.success&&<p className="text-sm text-emerald-700">{state.success}</p>}</form>}
