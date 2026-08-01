import { AppShell, type NavigationItem } from "@/components/app-shell";
import { getCurrentProfile } from "@/server/auth";

const labels={
  en:["Discover events","My calendar","Membership pass","My progress","Profile","Participant"],
  zh:["探索活动","我的日历","会员通行证","我的进度","个人资料","参与者"],
  ms:["Terokai acara","Kalendar saya","Pas keahlian","Kemajuan saya","Profil","Peserta"],
  ta:["நிகழ்வுகளைக் காண்க","என் நாட்காட்டி","உறுப்பினர் அட்டை","என் முன்னேற்றம்","சுயவிவரம்","பங்கேற்பாளர்"],
} as const;

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const text=labels[profile?.preferredLanguage??"en"];
  const navigation:NavigationItem[]=[
    {href:"/participant/events",label:text[0],icon:"compass"},{href:"/participant/calendar",label:text[1],icon:"calendar"},{href:"/participant/pass",label:text[2],icon:"pass"},{href:"/participant/progress",label:text[3],icon:"award"},{href:"/participant/profile",label:text[4],icon:"profile"},
  ];

  return (
    <AppShell navigation={navigation} profileHref="/participant/profile" roleLabel={text[5]} userName={profile?.fullName ?? "Aisha Rahman"}>
      {children}
    </AppShell>
  );
}
