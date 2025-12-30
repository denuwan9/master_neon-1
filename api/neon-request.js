const { sendNeonRequestEmail } = require('../server/src/services/emailService')

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { customerName, email, phone, config, imagePreview, notes, timestamp, pdfBase64 } = req.body

    if (!customerName || !email || !config) {
      return res.status(400).json({
        message: 'Missing required fields: customerName, email, and config are required',
      })
    }

    const request = {
      customerName,
      email,
      phone: phone || '',
      config,
      imagePreview,
      notes: notes || '',
      timestamp: timestamp || new Date().toISOString(),
      pdfBase64,
    }

    // Attempt to send notification email
    try {
      await sendNeonRequestEmail(request)
      return res.status(200).json({
        success: true,
        message: 'Design request sent successfully. A designer will contact you within 1 business day.',
      })
    } catch (emailError) {
      const errorMessage = emailError && emailError.message ? emailError.message : 'Unknown error'
      console.error('Failed to send neon request email:', errorMessage)

      if (errorMessage.includes('not configured') || errorMessage.includes('SMTP')) {
        return res.status(200).json({
          success: true,
          message: 'Design request received. A designer will contact you within 1 business day.',
          warning: 'Email notification is not configured. Please check your SMTP settings.',
        })
      } else {
        return res.status(200).json({
          success: true,
          message: 'Design request received. A designer will contact you within 1 business day.',
          warning: 'Email notification may have failed, but your request was logged.',
        })
      }
    }
  } catch (err) {
    console.error('Unexpected error handling neon request:', err)
    return res.status(500).json({
      message: err.message || 'Internal server error',
    })
  }
}

