import TelegramBot from 'node-telegram-bot-api';
import { withRetry } from './utils';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor(config: TelegramConfig) {
    this.bot = new TelegramBot(config.botToken);
    this.chatId = config.chatId;
  }

  /**
   * Send a text message to the configured chat
   */
  async sendMessage(message: string): Promise<void> {
    try {
      await withRetry(
        () => this.bot.sendMessage(this.chatId, message, {
          parse_mode: 'Markdown',
        }),
        2,
        3000,
        "Telegram sendMessage"
      );
      console.log('✅ Message sent successfully to Telegram');
    } catch (error) {
      console.error('❌ Failed to send Telegram message:', error);
      throw error;
    }
  }

  /**
   * Send a photo to the configured chat
   */
  async sendPhoto(photoUrl: string, caption?: string): Promise<void> {
    try {
      await withRetry(
        () => this.bot.sendPhoto(this.chatId, photoUrl, {
          caption,
          parse_mode: 'Markdown',
        }),
        2,
        3000,
        "Telegram sendPhoto"
      );
      console.log('✅ Photo sent successfully to Telegram');
    } catch (error) {
      console.error('❌ Failed to send Telegram photo:', error);
      throw error;
    }
  }

  /**
   * Send multiple photos as a media group
   */
  async sendPhotoGroup(photoUrls: string[], caption?: string): Promise<void> {
    try {
      const media = photoUrls.map((url, index) => ({
        type: 'photo' as const,
        media: url,
        caption: index === 0 ? caption : undefined,
        parse_mode: 'Markdown' as const,
      }));

      await withRetry(
        () => this.bot.sendMediaGroup(this.chatId, media),
        2,
        3000,
        "Telegram sendMediaGroup"
      );
      console.log('✅ Photo group sent successfully to Telegram');
    } catch (error) {
      console.error('❌ Failed to send Telegram photo group:', error);
      throw error;
    }
  }
}

/**
 * Create a Telegram service instance from environment variables
 */
export function createTelegramService(): TelegramService {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  if (!chatId) {
    throw new Error('TELEGRAM_CHAT_ID environment variable is required');
  }

  return new TelegramService({ botToken, chatId });
}
