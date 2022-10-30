import TelegramBot, { ParseMode } from "node-telegram-bot-api";

export class telegramBot{

    token:string = process.env.TG_BOT_TOKEN!;
    bot:TelegramBot = new TelegramBot(this.token, {polling: false});
    constructor (token?:string){
        token?this.token = token:null;
        this.bot = new TelegramBot(this.token, {polling: false});
    }

    public sendMessage(chatId:string,text:string,format:ParseMode,disableNotification:boolean,){
        this.bot.sendMessage(chatId,text,{parse_mode:format,disable_notification:disableNotification});
    }

    static escapeMarkdown(text:string){
        let escaped:string = text
        .replace(/\_/g, '\_')
        .replace(/\*/g, '\*')
        .replace(/\[/g, '\[')
        .replace(/\]/g, '\]')
        .replace(/\(/g, '\(')
        .replace(/\)/g, '\)')
        .replace(/\~/g, '\~')
        .replace(/\`/g, '\`')
        .replace(/\>/g, '\>')
        .replace(/\#/g, '\#')
        .replace(/\+/g, '\+')
        .replace(/\-/g, '\-')
        .replace(/\=/g, '\=')
        .replace(/\|/g, '\|')
        .replace(/\{/g, '\{')
        .replace(/\}/g, '\}')
        .replace(/\./g, '\.')
        .replace(/\!/g, '\!')
        return escaped;
    }
}