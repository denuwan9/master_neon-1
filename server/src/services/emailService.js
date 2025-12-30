const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

let sgMail
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    console.log('Using SendGrid for transactional email (SENDGRID_API_KEY detected)')
  } catch (e) {
    console.warn('Could not load @sendgrid/mail even though SENDGRID_API_KEY is set:', e.message)
    sgMail = null
  }
}

const resolvedHost =
  process.env.SMTP_HOST ||
  (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? 'smtp.gmail.com' : undefined)

const transporter = nodemailer.createTransport({
  host: resolvedHost,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const isEmailConfigured = () => {
  return (
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_USER.includes('your_') &&
    !process.env.SMTP_PASS.includes('your_') &&
    process.env.DESIGNER_EMAIL &&
    !process.env.DESIGNER_EMAIL.includes('your_')
  )
}

const sendNeonRequestEmail = async (request) => {
  if (!isEmailConfigured()) {
    console.log('⚠️ Email not configured. Skipping neon request email.')
    console.log('Request details:', {
      customerName: request.customerName,
      email: request.email,
      category: request.config?.category,
    })
    return
  }

  const attachment =
    request.imagePreview && request.imagePreview.startsWith('data:image')
      ? [
          {
            filename: 'neon-preview.png',
            content: request.imagePreview.split(';base64,').pop(),
            encoding: 'base64',
          },
        ]
      : []

  // Attach generated PDF if provided (expecting raw base64 string)
  if (request.pdfBase64) {
    try {
      const pdfBase64 = typeof request.pdfBase64 === 'string' ? request.pdfBase64.trim() : null
      if (pdfBase64 && pdfBase64.length > 0) {
        // Remove data URI prefix if present
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '')
        if (cleanBase64.length > 0) {
          attachment.push({
            filename: 'design.pdf',
            content: cleanBase64,
            encoding: 'base64',
          })
        }
      }
    } catch (pdfError) {
      console.error('Error processing PDF attachment:', pdfError.message)
      // Continue without PDF attachment if there's an error
    }
  }

  // Build HTML based on category
  let designDetails = ''
  if (request.config?.category === 'name') {
    designDetails = `
      <p><strong>Category:</strong> Name Sign</p>
      <p><strong>Text:</strong> ${request.config.text}</p>
      <p><strong>Font:</strong> ${request.config.font}</p>
      <p><strong>Color:</strong> ${request.config.color}</p>
      <p><strong>Size:</strong> ${request.config.size}</p>
    `
  } else if (request.config?.category === 'logo') {
    designDetails = `
      <p><strong>Category:</strong> Logo Sign</p>
      <p><strong>Type:</strong> ${request.config.imageData ? 'Uploaded Image' : `Emoji: ${request.config.emoji}`}</p>
      <p><strong>Color:</strong> ${request.config.color}</p>
      <p><strong>Brightness:</strong> ${request.config.brightness}%</p>
      <p><strong>Size:</strong> ${request.config.size}</p>
    `
  } else if (request.config?.category === 'default') {
    designDetails = `
      <p><strong>Category:</strong> Default Design</p>
      <p><strong>Template:</strong> ${request.config.template}</p>
      <p><strong>Color:</strong> ${request.config.color}</p>
      <p><strong>Size:</strong> ${request.config.size}</p>
    `
  }

  const html = `
    <h2>New Neon Custom Design Request</h2>
    <h3>Customer Details</h3>
    <p><strong>Name:</strong> ${request.customerName}</p>
    <p><strong>Email:</strong> ${request.email}</p>
    <p><strong>Phone:</strong> ${request.phone || 'Not provided'}</p>
    ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
    
    <h3>Neon Sign Details</h3>
    ${designDetails}
    
    <p><strong>Submitted:</strong> ${request.timestamp || new Date().toISOString()}</p>
  `

  try {
    if (sgMail) {
      const msg = {
        from: process.env.SMTP_USER || process.env.FROM_EMAIL || 'no-reply@masterneon.com',
        to: process.env.DESIGNER_EMAIL,
        subject: 'New Neon Custom Design Request',
        html,
        attachments: attachment.map((a) => ({
          content: a.content,
          filename: a.filename,
          type: a.contentType || 'application/octet-stream',
          disposition: 'attachment',
        })),
      }
      await sgMail.send(msg)
      console.log('✅ Neon request email sent successfully via SendGrid')
    } else {
      await transporter.sendMail({
        from: `Master Neon Builder <${process.env.SMTP_USER}>`,
        to: process.env.DESIGNER_EMAIL,
        subject: 'New Neon Custom Design Request',
        html,
        attachments: attachment.length > 0 ? attachment.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, 'base64') })) : undefined,
      })
      console.log('✅ Neon request email sent successfully via SMTP')
    }
  } catch (err) {
    // Log full error object for diagnostics
    console.error('❌ Error sending neon request email (full error):', err)

    // Ensure we persist the failed email payload so designers can be notified manually
    try {
      const emailsDir = path.join(__dirname, '..', '..', 'emails')
      if (!fs.existsSync(emailsDir)) fs.mkdirSync(emailsDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `neon-request-${timestamp}.json`
      const payload = {
        request,
        html,
        attachments: attachment.map((a) => ({ filename: a.filename, content: a.content, encoding: a.encoding || 'base64' })),
        error: {
          message: err && err.message ? err.message : String(err),
          code: err && err.code ? err.code : undefined,
          response: err && err.response ? err.response : undefined,
        },
      }
      fs.writeFileSync(path.join(emailsDir, filename), JSON.stringify(payload, null, 2), 'utf8')
      console.log(`Saved failed email payload to ${path.join('server', 'emails', filename)}`)
    } catch (fsErr) {
      console.error('Failed to write failed email payload to disk:', fsErr)
    }

    // Re-throw so callers can decide how to respond, preserving original error when possible
    throw err
  }
}

// Background retry worker: attempts to resend any saved failed emails every minute
const processQueuedEmails = async () => {
  const emailsDir = path.join(__dirname, '..', '..', 'emails')
  try {
    if (!fs.existsSync(emailsDir)) return
    const files = fs.readdirSync(emailsDir).filter((f) => f.endsWith('.json'))
    if (files.length === 0) return
    console.log(`Found ${files.length} queued email(s). Attempting to resend one by one...`)
    for (const file of files) {
      const filePath = path.join(emailsDir, file)
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const payload = JSON.parse(raw)
        const { html, attachments } = payload

        const attach = (attachments || []).map((a) => ({ filename: a.filename, content: a.content, encoding: a.encoding || 'base64' }))
        const attachWithContent = attach.filter((a) => a && a.content)

        if (sgMail) {
          const msg = {
            from: process.env.SMTP_USER || process.env.FROM_EMAIL || 'no-reply@masterneon.com',
            to: process.env.DESIGNER_EMAIL,
            subject: 'New Neon Custom Design Request (retry)',
            html,
            attachments: attachWithContent.map((a) => ({ content: a.content, filename: a.filename, type: 'application/octet-stream', disposition: 'attachment' })),
          }
          await sgMail.send(msg)
          console.log(`Resend succeeded via SendGrid for ${file}`)
          fs.unlinkSync(filePath)
        } else {
          await transporter.sendMail({
            from: `Master Neon Builder <${process.env.SMTP_USER}>`,
            to: process.env.DESIGNER_EMAIL,
            subject: 'New Neon Custom Design Request (retry)',
            html,
            attachments: attachWithContent.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, 'base64') })),
          })
          console.log(`Resend succeeded via SMTP for ${file}`)
          fs.unlinkSync(filePath)
        }
      } catch (e) {
        console.error(`Resend failed for ${file}:`, e && e.message ? e.message : e)
      }
    }
  } catch (e) {
    console.error('Error processing queued emails:', e && e.message ? e.message : e)
  }
}

setTimeout(() => void processQueuedEmails(), 5 * 1000)
setInterval(() => void processQueuedEmails(), 60 * 1000)

const sendContactEmail = async (message) => {
  if (!isEmailConfigured()) {
    console.log('⚠️ Email not configured. Skipping contact email.')
    console.log('Contact message:', {
      name: message.name,
      email: message.email,
    })
    return
  }

  try {
    await transporter.sendMail({
      from: `Master Neon Website <${process.env.SMTP_USER}>`,
      to: process.env.DESIGNER_EMAIL || process.env.ADMIN_EMAIL,
      subject: `Contact form — ${message.name}`,
      html: `
        <h3>Contact Message</h3>
        <p><strong>Name:</strong> ${message.name}</p>
        <p><strong>Email:</strong> ${message.email}</p>
        <p><strong>Phone:</strong> ${message.phone || 'Not provided'}</p>
        <p><strong>Message:</strong><br/>${message.message}</p>
      `,
    })
  } catch (err) {
    console.error('Error sending contact email:', err && err.message ? err.message : err)
    throw err
  }
}

module.exports = { sendNeonRequestEmail, sendContactEmail }
