
import mailer, { Transporter } from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { isPropertySignature } from "typescript";

const serviceMailTransporter:Transporter = mailer.createTransport({
    service:"gmail",
    port:465,
    secure:true,
    auth:{
      user:process.env.SERVICE_EMAIL,
      pass:process.env.SERVICE_EMAIL_PASS
    }
  })


export class SendServiceEmail{
    public static sendText(params:{recipient:string,subject:string,text:string}) {
      let mailOptions:Mail.Options={
        from:process.env.SERVICE_EMAIL,
        priority:"high",
        to:params.recipient,
        subject:params.subject,
        text:`${params.text}\n\n\n\nЭто сообщение является системным. Пожалуйста, не отвечайте на него.`
    }
        serviceMailTransporter.sendMail(mailOptions)
    }
}
