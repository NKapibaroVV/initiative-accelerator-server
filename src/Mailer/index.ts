
import mailer, { Transporter } from "nodemailer";
import { MailOptions } from "nodemailer/lib/json-transport";
import { isPropertySignature } from "typescript";

const serviceMailTransporter:Transporter = mailer.createTransport({
    service:"gmail",
    auth:{
      user:process.env.SERVICE_EMAIL,
      pass:process.env.SERVICE_EMAIL_PASS
    }
  })


export class SendServiceEmail{
    public static sendText(params:{recipient:string,subject:string,text:string}) {
        serviceMailTransporter.sendMail({
            from:process.env.SERVICE_EMAIL,
            to:params.recipient,
            subject:params.subject,
            text:`${params.text}\n\n\n\nЭто сообщение является системным. Пожалуйста, не отвечайте на него.`
        })
    }
}
