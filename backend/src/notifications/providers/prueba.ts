// test-mail.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'a5a9cf001@smtp-brevo.com',
    pass: 'xsmtpsib-c0768c686f7bdd20cf811c540bf76c31e3600406682fdf8afadbf21e6034c46e-CT65H9nAIxv0Kq4V'
  },
  tls: {
    rejectUnauthorized: false
  }
})

transporter.sendMail({
  from: 'BEX HRIS <jcarrielroca98@gmail.com>',
  to: 'jcarrielroca98@gmail.com',
  subject: 'Test bex-hris',
  html: '<h1>Funciona ✅</h1>'
}).then(console.log).catch(console.error)