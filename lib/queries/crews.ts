import { createClient } from "@/lib/supabase/server";

export async function getCrews() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crews")
    .select("id, name, zone")
    .order("name");
  return data ?? [];
}
