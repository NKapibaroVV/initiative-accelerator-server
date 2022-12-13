
import mailer, { Transporter, createTransport, createTestAccount } from "nodemailer";
import { MailOptions } from "nodemailer/lib/json-transport";
import { isPropertySignature } from "typescript";





export class SendServiceEmail{

  private static getTransport():Promise<Transporter>{
    return new Promise(()=>{
      createTestAccount().then(testAccount=>{
        let Transport:Transporter = createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
          },
        });
        return Transport
      })
    });    
  }

    public static sendText(params:{recipient:string,subject:string,text:string}) {
      this.getTransport().then((serviceMailTransporter)=>{serviceMailTransporter.sendMail({
        from:process.env.SERVICE_EMAIL,
        to:params.recipient,
        subject:params.subject,
        text:`${params.text}\n\n\n\nЭто сообщение является системным. Пожалуйста, не отвечайте на него.`
    })});
    }
}
