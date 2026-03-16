import { supabaseAdmin } from "@/lib/supabase";
import { generatePairCode } from "@/lib/pair-code";

const LINK_CODE_TTL_MINUTES = 10;

// Generate a 6-char code that links a KidShift user to their Telegram chat
export async function generateTelegramLinkCode(userId: string): Promise<string> {
  // Clean up any existing unused codes for this user
  await supabaseAdmin
    .from("telegram_links")
    .delete()
    .eq("user_id", userId)
    .eq("used", false);

  const code = generatePairCode();
  const expiresAt = new Date(
    Date.now() + LINK_CODE_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const { error } = await supabaseAdmin.from("telegram_links").insert({
    user_id: userId,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Failed to create telegram link code:", error);
    throw new Error("LINK_CODE_CREATE_FAILED");
  }

  return code;
}

// Redeem a link code: associates a Telegram chat with a KidShift user
export async function redeemTelegramLinkCode(
  code: string,
  chatId: number,
  username?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: link, error } = await supabaseAdmin
    .from("telegram_links")
    .select()
    .eq("code", code.toUpperCase())
    .eq("used", false)
    .single();

  if (error || !link) {
    return { success: false, error: "Invalid or expired code." };
  }

  if (new Date(link.expires_at) < new Date()) {
    return { success: false, error: "This code has expired. Please generate a new one." };
  }

  // Upsert into telegram_users (replace existing link if any)
  const { error: upsertError } = await supabaseAdmin
    .from("telegram_users")
    .upsert(
      {
        telegram_chat_id: chatId,
        user_id: link.user_id,
        telegram_username: username || null,
        linked_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("Failed to link telegram user:", upsertError);
    return { success: false, error: "Failed to link account. Please try again." };
  }

  // Mark code as used
  await supabaseAdmin
    .from("telegram_links")
    .update({ used: true })
    .eq("id", link.id);

  return { success: true };
}

// Look up which KidShift user a Telegram chat belongs to
export async function getUserIdFromChat(
  chatId: number
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("telegram_users")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .single();

  return data?.user_id || null;
}
