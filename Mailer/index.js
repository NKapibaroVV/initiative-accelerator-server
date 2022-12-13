"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendServiceEmail = void 0;
const nodemailer_1 = require("nodemailer");
class SendServiceEmail {
    static getTransport() {
        return new Promise(() => {
            (0, nodemailer_1.createTestAccount)().then(testAccount => {
                let Transport = (0, nodemailer_1.createTransport)({
                    host: "smtp.ethereal.email",
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass, // generated ethereal password
                    },
                });
                return Transport;
            });
        });
    }
    static sendText(params) {
        this.getTransport().then((serviceMailTransporter) => {
            serviceMailTransporter.sendMail({
                from: process.env.SERVICE_EMAIL,
                to: params.recipient,
                subject: params.subject,
                text: `${params.text}\n\n\n\nЭто сообщение является системным. Пожалуйста, не отвечайте на него.`
            });
        });
    }
}
exports.SendServiceEmail = SendServiceEmail;
