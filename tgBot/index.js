"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramBot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
class telegramBot {
    constructor(token) {
        this.token = process.env.TG_BOT_TOKEN;
        this.bot = new node_telegram_bot_api_1.default(this.token, { polling: false });
        token ? this.token = token : null;
        this.bot = new node_telegram_bot_api_1.default(this.token, { polling: false });
    }
    sendMessage(chatId, text, format, disableNotification, disableWebPreview) {
        this.bot.sendMessage(chatId, text, { parse_mode: format, disable_notification: disableNotification, disable_web_page_preview: disableWebPreview });
    }
    static escapeMarkdown(text) {
        let escaped = text
            .replace(/\_/g, '\\_')
            .replace(/\*/g, '\\*')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\~/g, '\\~')
            .replace(/\`/g, '\\`')
            .replace(/\>/g, '\\>')
            .replace(/\#/g, '\\#')
            .replace(/\+/g, '\\+')
            .replace(/\-/g, '\\-')
            .replace(/\=/g, '\\=')
            .replace(/\|/g, '\\|')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\./g, '\\.')
            .replace(/\!/g, '\\!');
        return escaped;
    }
}
exports.telegramBot = telegramBot;
