import { createClient } from "@/lib/supabase/server";

export type SectionAccess =
  | { type: "psp"; section: { id: string; name: string }; location: { id: string; name: string } }
  | { type: "drainer"; section: { id: string; name: string } }
  | null;

export async function getSectionByToken(token: string): Promise<SectionAccess> {
  const supabase = await createClient();

  const { data: psp } = await supabase
    .from("psp_sections")
    .select("id, name, location_id")
    .eq("qr_token", token)
    .single();

  if (psp?.location_id) {
    const { data: loc } = await supabase
      .from("psp_locations")
      .select("id, name")
      .eq("id", psp.location_id)
      .single();
    return {
      type: "psp",
      section: { id: psp.id, name: psp.name },
      location: { id: loc?.id ?? psp.location_id, name: loc?.name ?? "Location" },
    };
  }

  const { data: drainer } = await supabase
    .from("drainer_sections")
    .select("id, name")
    .eq("qr_token", token)
    .single();

  if (drainer) {
    return { type: "drainer", section: { id: drainer.id, name: drainer.name } };
  }

  return null;
}
