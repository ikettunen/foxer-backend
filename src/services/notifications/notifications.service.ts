import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const loadTemplate = (name: string): string => {
  const templatePath = path.join(__dirname, '../../../templates', name)
  return fs.readFileSync(templatePath, 'utf-8')
}

const fillTemplate = (html: string, vars: Record<string, string>): string => {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`[${key}]`, val),
    html
  )
}

export const sendEnrollmentEmail = async (opts: {
  to: string
  studentName: string
  courseName: string
  courseDates: string
}) => {
  const html = fillTemplate(loadTemplate('enrollment.html'), {
    OPISKELIJA_NIMI: opts.studentName,
    KURSSI_NIMI: opts.courseName,
    KURSSI_PÄIVÄT: opts.courseDates,
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Foxer Paragliding <info@varjoliitokoulu.fi>',
    to: opts.to,
    subject: 'Tervetuloa Foxer-kurssille! 🪂',
    html,
  })
}

export const sendPasswordResetEmail = async (opts: { to: string; resetUrl: string }) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    subject: 'Foxer — salasanan palautus',
    html: `<p>Palauta salasanasi: <a href="${opts.resetUrl}">${opts.resetUrl}</a></p><p>Linkki vanhenee 1 tunnin kuluttua.</p>`,
  })
}
