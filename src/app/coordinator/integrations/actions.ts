"use server";

import { escapeEmailHtml, isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import { createClient } from "@/lib/supabase/server";
import { isWhatsAppCloudConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp/client";

export interface IntegrationTestState { error?: string; success?: string }

async function coordinatorProfile() {
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error("Sign in as a Coordinator.");
  const {data:profile}=await supabase.from("profiles").select("role,full_name,email,phone").eq("id",user.id).maybeSingle();
  if(profile?.role!=="coordinator")throw new Error("Coordinator access required.");
  return profile;
}

export async function sendMailjetTest(_state:IntegrationTestState,_formData:FormData):Promise<IntegrationTestState>{
  void _state; void _formData; try{const profile=await coordinatorProfile();if(!isMailjetConfigured())throw new Error("Mailjet is not configured.");const result=await sendEmail({toEmail:profile.email,toName:profile.full_name,subject:"Passion2Serve Mailjet test",text:"Mailjet automated email delivery is working for Passion2Serve.",html:`<p>Hello ${escapeEmailHtml(profile.full_name)},</p><p>Mailjet automated email delivery is working for Passion2Serve.</p>`});return{success:`Mailjet accepted the test email${result.messageId?` (message ${result.messageId})`:""}.`};}catch(error){return{error:error instanceof Error?error.message:"Mailjet test failed."};}
}

export async function sendWhatsAppTest(_state:IntegrationTestState,_formData:FormData):Promise<IntegrationTestState>{
  void _state; void _formData; try{const profile=await coordinatorProfile();if(!profile.phone)throw new Error("Add a Coordinator phone number first.");if(!isWhatsAppCloudConfigured())throw new Error("Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID after completing Meta developer setup.");const template=process.env.WHATSAPP_TEST_TEMPLATE||"hello_world";const result=await sendWhatsAppTemplate({to:profile.phone,templateName:template});return{success:`WhatsApp accepted the test message (${result.messageId}).`};}catch(error){return{error:error instanceof Error?error.message:"WhatsApp test failed."};}
}
