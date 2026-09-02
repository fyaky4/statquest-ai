import { supabase } from "@/lib/supabase";

export async function awardXP(amount: number) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("total_xp")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  const currentXP = profile?.total_xp ?? 0;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      total_xp: currentXP + amount,
    })
    .eq("id", user.id);

  if (updateError) {
    throw updateError;
  }

  return currentXP + amount;
}