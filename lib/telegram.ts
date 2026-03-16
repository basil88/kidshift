import { Bot } from "grammy";

let _bot: Bot | null = null;

// Lazy-init bot to avoid crashing at build time when env var is empty
export function getBot(): Bot {
  if (!_bot) {
    _bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
  }
  return _bot;
}
