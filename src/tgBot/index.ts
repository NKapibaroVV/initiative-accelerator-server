import axios from "axios";

export class tgBot{

    static token:string = process.env.TG_BOT_TOKEN!;
    
    constructor (token?:string){
        token?tgBot.token = token:null;
    }

    static sendMessage(chatId:string,text:string,format:"MarkdownV2"|"HTML"|"Markdown"|"",disableNotification:boolean,){
        axios({
            method: 'post',
            url: `https://api.telegram.org/bot${tgBot.token}/sendMessage`,
            data: {
                chat_id:chatId,
                text:text,
                parse_mode:format,
                disable_notification:disableNotification
            }
          });
    }
}