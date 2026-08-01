"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { issueAndEmailMembershipPass } from "@/server/participants/wallet";

export interface WalletActionState { error?:string; success?:string }

export async function prepareWalletPass():Promise<WalletActionState>{
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return{error:"Sign in again to prepare your pass."};
  const {data:profile}=await supabase.from("profiles").select("full_name,email,role").eq("id",user.id).maybeSingle(); if(profile?.role!=="participant")return{error:"Participant access required."};
  try{const result=await issueAndEmailMembershipPass({participantId:user.id,fullName:profile.full_name,email:profile.email}); revalidatePath("/participant/pass"); return{success:result.status==="sent"?"Wallet pass prepared and emailed.":"Wallet pass prepared. Email delivery is pending provider configuration."};}
  catch(error){return{error:error instanceof Error?error.message:"The wallet pass could not be prepared."};}
}
