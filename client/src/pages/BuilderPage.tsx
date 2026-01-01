import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import NeonPreviewCanvas, { type NeonPreviewHandle } from '../components/builder/NeonPreviewCanvas'
import NeonButton from '../components/common/NeonButton'
import { neonColorOptions, neonFonts, sizeOptions, defaultTemplates } from '../data/builderOptions'
import type { BuilderConfig, CustomerDetails, NameSignConfig, LogoSignConfig } from '../types/neon'
import { generatePDF } from '../utils/pdfGenerator'
import api from '../services/api'

const BuilderPage = () => {
  const [searchParams] = useSearchParams()
  const initialTabParam = searchParams.get('tab') as 'name' | 'logo' | 'template' | null
  const presetParam = searchParams.get('preset')

  const initialTab: 'name' | 'logo' | 'template' = initialTabParam ?? 'name'
  const [activeTab, setActiveTab] = useState<'name' | 'logo' | 'template'>(initialTab)
  const previewRef = useRef<NeonPreviewHandle>(null)
  const previewElementRef = useRef<HTMLDivElement>(null)
  const customerSectionRef = useRef<HTMLDivElement>(null)
  // Name Sign Config
  const [nameConfig, setNameConfig] = useState<NameSignConfig>({
    category: 'name',
    text: 'Your Name',
    font: neonFonts[0].value,
    color: neonColorOptions[0].value,
    size: 'medium',
  })

  // Logo Sign Config
  const [logoConfig, setLogoConfig] = useState<LogoSignConfig>({
    category: 'logo',
    color: neonColorOptions[0].value,
    brightness: 80,
    size: 'medium',
  })

  // Customer Details
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    customerName: '',
    email: '',
    phone: '',
    notes: '',
  })

  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  })
  const [isSending, setIsSending] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    phone?: string
    customerName?: string
  }>({})
  // PDF is generated but not sent to reduce payload size - user can download separately
  const [, setGeneratedPdfBase64] = useState<string | null>(null)
  const [templateModalPdfBase64, setTemplateModalPdfBase64] = useState<string | null>(null)
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<typeof defaultTemplates[0] | null>(null)
  const [templateModalConfig, setTemplateModalConfig] = useState<{
    text: string
    color: string
    size: 'small' | 'medium' | 'large'
  }>({
    text: '',
    color: neonColorOptions[0].value,
    size: 'medium',
  })

  const getCurrentConfig = (): BuilderConfig => {
    if (activeTab === 'name') return nameConfig
    if (activeTab === 'logo') return logoConfig
    return nameConfig
  }

  const handleNameConfigChange = <K extends keyof NameSignConfig>(
    field: K,
    value: NameSignConfig[K]
  ) => {
    setNameConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoConfigChange = <K extends keyof LogoSignConfig>(
    field: K,
    value: LogoSignConfig[K]
  ) => {
    setLogoConfig((prev) => ({ ...prev, [field]: value }))
  }

  // If coming from a preset (template), set the name text and store selected template
  useEffect(() => {
    if (presetParam) {
      const tpl = defaultTemplates.find((t) => t.value === presetParam)
      if (tpl) {
        setNameConfig((prev) => ({
          ...prev,
          text: tpl.text || tpl.label,
          selectedTemplate: tpl.value,
        }))
        setActiveTab('name')
      }
    }
  }, [presetParam])

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address.'
    }
    return undefined
  }

  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return undefined // Phone is optional
    // Remove all non-digit characters to count digits
    const digitsOnly = phone.replace(/\D/g, '')
    // Must have exactly 10 digits
    if (digitsOnly.length !== 10) {
      return 'Phone number must contain exactly 10 digits.'
    }
    return undefined
  }

  const handleCustomerChange =
    <K extends keyof CustomerDetails>(field: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setCustomerDetails((prev) => ({ ...prev, [field]: value }))
      
      // Validate on change
      if (field === 'email') {
        const error = validateEmail(value)
        setValidationErrors((prev) => ({ ...prev, email: error }))
      } else if (field === 'phone') {
        const error = validatePhone(value)
        setValidationErrors((prev) => ({ ...prev, phone: error }))
      }
    }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setLogoConfig((prev) => ({ ...prev, imageData }))
      }
      reader.readAsDataURL(file)
    }
  }


  const validateCustomerDetails = (): boolean => {
    const errors: { email?: string; phone?: string; customerName?: string } = {}
    
    // Validate required fields
    if (!customerDetails.customerName || !customerDetails.customerName.trim()) {
      errors.customerName = 'Name is required.'
      setStatus({ type: 'error', message: 'Name is required.' })
      setValidationErrors(errors)
      return false
    }

    // Validate email format
    const emailError = validateEmail(customerDetails.email)
    if (emailError) {
      errors.email = emailError
      setValidationErrors(errors)
      setStatus({ type: 'error', message: emailError })
      return false
    }

    // Validate phone format if provided
    if (customerDetails.phone && customerDetails.phone.trim()) {
      const phoneError = validatePhone(customerDetails.phone)
      if (phoneError) {
        errors.phone = phoneError
        setValidationErrors(errors)
        setStatus({ type: 'error', message: phoneError })
        return false
      }
    }

    // Clear validation errors if all valid
    setValidationErrors({})
    return true
  }

  const handleDownloadPDF = async () => {
    if (!validateCustomerDetails()) return

    const config = getCurrentConfig()
    // For default and logo designs, skip live preview capture (they use uploaded/selected images)
    const previewNode = activeTab === 'name' ? previewElementRef.current : null
    const pdfBase64 = await generatePDF(config, customerDetails, previewNode)
    // Store the generated PDF so it can be used when sending email
    setGeneratedPdfBase64(pdfBase64)
  }

  // Helper function to convert image URL to base64 data URI
  const convertImageUrlToBase64 = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl)
        } else {
          reject(new Error('Could not get canvas context'))
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })
  }

  // Helper function to compress image aggressively
  const compressImage = (base64String: string, maxSizeKB: number = 300, maxDimension: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        let quality = 0.65 // Start with lower quality for better compression

        // Resize if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          let compressed = canvas.toDataURL('image/jpeg', quality)
          
          // If still too large, reduce quality more aggressively
          while (compressed.length > maxSizeKB * 1024 && quality > 0.2) {
            quality -= 0.05
            compressed = canvas.toDataURL('image/jpeg', quality)
          }
          
          // If still too large after quality reduction, resize more
          if (compressed.length > maxSizeKB * 1024) {
            width = Math.floor(width * 0.8)
            height = Math.floor(height * 0.8)
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)
            compressed = canvas.toDataURL('image/jpeg', 0.5)
          }
          
          resolve(compressed)
        } else {
          resolve(base64String)
        }
      }
      img.onerror = () => resolve(base64String)
      img.src = base64String
    })
  }

  const handleSendToDesigner = async () => {
    if (!validateCustomerDetails()) return

    setIsSending(true)
    setStatus({ type: 'idle', message: '' })

    try {
      const config = getCurrentConfig()
      // For logo, use uploaded image; for name, capture canvas
      let imagePreview = activeTab === 'logo' ? (config as LogoSignConfig).imageData : previewRef.current?.getImage()

      // Always compress image to ensure it's small enough. Use more aggressive targets for templates.
      if (imagePreview) {
        const targetKB = activeTab === 'template' ? 150 : 250
        console.log('Original image size:', (imagePreview.length / 1024).toFixed(2), 'KB')
        imagePreview = await compressImage(imagePreview, targetKB)
        console.log('Compressed image size:', (imagePreview.length / 1024).toFixed(2), 'KB')
      }

      // Generate PDF and include it so the designer receives full specification.
      // For template presets, skip generating/sending the PDF to keep payload small on constrained platforms.
      // If the payload becomes too large we'll drop the imagePreview first, then the PDF.
      let pdfBase64: string | undefined = undefined
      try {
        if (activeTab !== 'template') {
          const previewNode = activeTab === 'name' ? previewElementRef.current : null
          pdfBase64 = await generatePDF(config, customerDetails, previewNode)
          setGeneratedPdfBase64(pdfBase64)
          console.log('Generated PDF size:', (pdfBase64.length / 1024).toFixed(2), 'KB')
        } else {
          console.log('Skipping PDF generation for template presets to reduce payload size')
        }
      } catch (e) {
        console.warn('PDF generation failed, continuing without PDF:', e)
        pdfBase64 = undefined
      }

      // Calculate total payload size
      const payload = {
        ...customerDetails,
        config,
        imagePreview,
        pdfBase64,
        timestamp: new Date().toISOString(),
      }
      let payloadSize = JSON.stringify(payload).length
      console.log('Total payload size:', (payloadSize / 1024).toFixed(2), 'KB')

      // Conservative thresholds to avoid Vercel/server limits (~4.5MB)
      const MAX_SAFE_PAYLOAD = 2.0 * 1024 * 1024 // 2MB to leave headroom for encoding on serverless platforms

      // If still too large, remove image preview first
      if (payloadSize > MAX_SAFE_PAYLOAD) {
        console.warn('Payload too large, removing image preview')
        payload.imagePreview = undefined
        payloadSize = JSON.stringify(payload).length
        console.log('Payload size after removing imagePreview:', (payloadSize / 1024).toFixed(2), 'KB')
      }

      // If still too large after removing image, drop PDF
      if (payloadSize > MAX_SAFE_PAYLOAD) {
        console.warn('Payload still too large, removing PDF attachment')
        payload.pdfBase64 = undefined
        payloadSize = JSON.stringify(payload).length
        console.log('Payload size after removing PDF:', (payloadSize / 1024).toFixed(2), 'KB')
      }

      // Final guard: if payload still exceeds a safe limit, try removing PDF if not already removed
      const FINAL_LIMIT = 3.8 * 1024 * 1024 // 3.8MB absolute upper guard
      if (payloadSize > FINAL_LIMIT && payload.pdfBase64) {
        console.warn('Payload still too large, removing PDF as final attempt')
        payload.pdfBase64 = undefined
        payloadSize = JSON.stringify(payload).length
        console.log('Final payload size after removing PDF:', (payloadSize / 1024).toFixed(2), 'KB')
      }
      
      // If still too large, abort with message
      if (payloadSize > FINAL_LIMIT) {
        setStatus({
          type: 'error',
          message: 'Request too large. Please try again - design details will be sent, but attachments were removed to ensure delivery.',
        })
        setIsSending(false)
        return
      }

      const response = await api.post('/neon-request', payload)

      const responseData = response?.data || {}
      const successMessage = responseData.emailSent 
        ? '✅ Design sent successfully! A Master Neon designer will contact you at ' + customerDetails.email + ' within 1 business day.'
        : responseData.message || '✅ Design request received! A Master Neon designer will contact you within 1 business day.'
      
      setStatus({
        type: 'success',
        message: successMessage,
      })
      
      console.log('✅ Design request submitted successfully')
      console.log('Response:', responseData)
      setCustomerDetails({ customerName: '', email: '', phone: '', notes: '' })
      // Clear stored PDF after successful send
      setGeneratedPdfBase64(null)
    } catch (error: any) {
      let errorMessage = error?.response?.data?.message || error?.message || 'We could not submit the request. Check your connection or try again shortly.'
      
      // Handle 413 Payload Too Large error specifically
      if (error?.response?.status === 413) {
        errorMessage = error?.response?.data?.message || 'Request too large. Please try with a smaller image or without PDF attachment.'
      }
      
      // Show suggestion if provided
      if (error?.response?.data?.suggestion) {
        errorMessage += ` ${error.response.data.suggestion}`
      }
      
      setStatus({
        type: 'error',
        message: errorMessage,
      })
      console.error('Error sending request:', error)
    } finally {
      setIsSending(false)
    }
  }

  const currentConfig = getCurrentConfig()

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.4em] text-white/40">Custom Neon Builder</p>
        <h2 className="mt-2 text-4xl font-semibold">Design your perfect neon sign</h2>
        <p className="mt-3 text-white/70">
          Choose from three design options: custom name signs, logo signs, or ready-made templates. Preview in real-time
          and download your design as a PDF.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-white/10">
          {(['name', 'logo', 'template'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm uppercase tracking-[0.3em] transition ${
              activeTab === tab
                ? 'border-b-2 border-pink-400 text-pink-300'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {tab === 'name' && 'Name Sign'}
            {tab === 'logo' && 'Logo Sign'}
            {tab === 'template' && 'Templates'}
          </button>
        ))}
      </div>

      <div className={`grid gap-8 ${activeTab === 'name' ? 'lg:grid-cols-[1.3fr_0.7fr]' : ''}`}>
        {/* Preview Panel (only shown for name signs) */}
        {activeTab === 'name' && (
          <motion.div
            layout
            className="glass-panel flex flex-col gap-4 border border-white/10 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div ref={previewElementRef} className="rounded-[2rem] border border-white/5 p-4 shadow-neon">
              <div className="aspect-[9/4]">
                <NeonPreviewCanvas ref={previewRef} {...currentConfig} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/60">
              <p>Live neon preview</p>
              {activeTab === 'name' && <p>{nameConfig.text.length}/30 characters</p>}
            </div>
          </motion.div>
        )}

        {/* Controls Panel */}
        <div className="glass-panel border border-white/10 p-6">
          <div className="space-y-5">
            {activeTab === 'name' && (
              <>
                <label className="block text-sm uppercase tracking-[0.3em] text-white/50">
                  Neon Text
                  <input
                    maxLength={30}
                    value={nameConfig.text}
                    onChange={(e) => handleNameConfigChange('text', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-pink-400 focus:outline-none"
                    placeholder="Enter your text"
                  />
                </label>

                <label className="block text-sm uppercase tracking-[0.3em] text-white/50">
                  Font
                  <select
                    value={nameConfig.font}
                    onChange={(e) => handleNameConfigChange('font', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:border-pink-400 focus:outline-none"
                  >
                    {neonFonts.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {activeTab === 'logo' && (
              <>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-2">Upload Logo Image</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageUpload}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-500/20 file:text-pink-300 hover:file:bg-pink-500/30"
                  />
                  {logoConfig.imageData && (
                    <div className="mt-3 rounded-xl border border-white/10 overflow-hidden">
                      <img
                        src={logoConfig.imageData}
                        alt="Uploaded logo"
                        className="w-full h-auto max-h-48 object-contain"
                      />
                    </div>
                  )}
                </div>

                <label className="block text-sm uppercase tracking-[0.3em] text-white/50">
                  Add Name/Text
                  <input
                    maxLength={30}
                    value={logoConfig.text || ''}
                    onChange={(e) => handleLogoConfigChange('text', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-pink-400 focus:outline-none"
                    placeholder="Enter name or text"
                  />
                </label>
              </>
            )}

            {/* Default designs handled via Showcase; gallery removed from builder */}

            {activeTab === 'template' && (
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-white/50">Template gallery</p>
                    <p className="text-white/70">Pick a design and click customize to add name, color, and size.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {defaultTemplates.map((template) => (
                    <div
                      key={template.value}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left transition hover:border-pink-400/50"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={template.imageUrl}
                          alt={template.label}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Preset</p>
                          <p className="text-lg font-semibold text-white drop-shadow-neon">{template.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 text-sm text-white/80">
                        <button
                          type="button"
                          className="rounded-full border border-pink-400/70 bg-pink-500/20 px-3 py-2 text-xs uppercase tracking-[0.3em] text-pink-100 shadow-neon transition hover:-translate-y-0.5"
                          onClick={() => {
                            setSelectedTemplateForModal(template)
                            setTemplateModalConfig({
                              text: template.text || template.label,
                              color: neonColorOptions[0].value,
                              size: 'medium',
                            })
                          }}
                        >
                          Customize
                        </button>
                        <span className="text-xs text-white/60">Tap customize to add name, color, size</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {activeTab === 'name' || activeTab === 'logo' ? (
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/50">Color</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {neonColorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        if (activeTab === 'name') handleNameConfigChange('color', color.value)
                        if (activeTab === 'logo') handleLogoConfigChange('color', color.value)
                      }}
                      className={`h-11 w-11 rounded-full border-2 transition ${
                        currentConfig.color === color.value ? 'border-white shadow-neon' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={color.label}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Size Selector */}
            {activeTab === 'name' || activeTab === 'logo' ? (
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/50">Size</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {sizeOptions.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => {
                        if (activeTab === 'name') handleNameConfigChange('size', size.value)
                        if (activeTab === 'logo') handleLogoConfigChange('size', size.value)
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        currentConfig.size === size.value
                          ? 'border-pink-400/70 bg-pink-500/10 text-white'
                          : 'border-white/10 text-white/70'
                      }`}
                    >
                      <p className="text-base font-semibold">{size.label}</p>
                      <p className="text-xs text-white/60">{size.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {activeTab !== 'template' && (
        <>
          {/* Customer Details & Actions */}
          <div ref={customerSectionRef} className="grid gap-8 lg:grid-cols-2">
            <form
              className="glass-panel space-y-4 border border-white/10 p-6"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                void handleSendToDesigner()
              }}
            >
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">Customer Details</p>
              <div>
                <input
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                    validationErrors.customerName
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-white/10 focus:border-pink-400'
                  }`}
                  placeholder="Full name *"
                  value={customerDetails.customerName}
                  onChange={handleCustomerChange('customerName')}
                  required
                />
                {validationErrors.customerName && (
                  <p className="mt-1 text-xs text-red-400">{validationErrors.customerName}</p>
                )}
              </div>
              <div>
                <input
                  type="email"
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                    validationErrors.email
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-white/10 focus:border-pink-400'
                  }`}
                  placeholder="Email *"
                  value={customerDetails.email}
                  onChange={handleCustomerChange('email')}
                  required
                />
                {validationErrors.email && (
                  <p className="mt-1 text-xs text-red-400">{validationErrors.email}</p>
                )}
              </div>
              <div>
                <input
                  type="tel"
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                    validationErrors.phone
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-white/10 focus:border-pink-400'
                  }`}
                  placeholder="Phone (optional)"
                  value={customerDetails.phone}
                  onChange={handleCustomerChange('phone')}
                />
                {validationErrors.phone && (
                  <p className="mt-1 text-xs text-red-400">{validationErrors.phone}</p>
                )}
              </div>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none"
                placeholder="Preference message for the designer (optional)"
                value={customerDetails.notes}
                onChange={handleCustomerChange('notes')}
              />

              {status.type !== 'idle' && (
                <p className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {status.message}
                </p>
              )}

              <div className="flex gap-4">
                <NeonButton type="button" onClick={handleDownloadPDF} variant="secondary" className="flex-1">
                  Download PDF
                </NeonButton>
                <NeonButton type="submit" disabled={isSending} className="flex-1">
                  {isSending ? 'Sending...' : 'Send to Designer'}
                </NeonButton>
              </div>
            </form>

            <div className="glass-panel border border-white/10 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">What happens next?</p>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <p>• Download your PDF to save your design locally</p>
                <p>• Send to Designer to submit your request</p>
                <p>• Our designer will review and contact you within 1 business day</p>
                <p>• You&apos;ll receive design proofs and pricing information</p>
                <p>• Once approved, production begins (7-day average build time)</p>
              </div>
            </div>
          </div>
         </>
       )}

       {/* Template Customize Modal */}
       <AnimatePresence>
         {selectedTemplateForModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
             onClick={() => setSelectedTemplateForModal(null)}
           >
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="glass-panel max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 p-6 shadow-2xl"
             >
               <div className="mb-6 flex items-center justify-between">
                 <h2 className="text-2xl font-semibold text-white">Customize Design</h2>
                 <button
                   type="button"
                   onClick={() => setSelectedTemplateForModal(null)}
                   className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                 >
                   ✕
                 </button>
               </div>

               <div className="grid gap-6 lg:grid-cols-2">
                 {/* Top Left: Selected Design Preview */}
                 <div className="glass-panel flex flex-col gap-4 border border-white/10 p-6">
                   <p className="text-sm uppercase tracking-[0.3em] text-white/50">Selected Design</p>
                   <div className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/60">
                     <img
                       src={selectedTemplateForModal.imageUrl}
                       alt={selectedTemplateForModal.label}
                       className="h-full w-full object-cover"
                     />
                   </div>
                   <p className="text-center text-lg font-semibold text-white">{selectedTemplateForModal.label}</p>
                 </div>

                 {/* Top Right: Design Customization */}
                 <div className="glass-panel space-y-5 border border-white/10 p-6">
                   

                   <label className="block text-sm uppercase tracking-[0.3em] text-white/50">
                     Add Name/Text
                     <input
                       maxLength={30}
                       value={templateModalConfig.text}
                       onChange={(e) => setTemplateModalConfig((prev) => ({ ...prev, text: e.target.value }))}
                       className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-pink-400 focus:outline-none"
                       placeholder="Enter name or text"
                     />
                   </label>

                   <div>
                     <p className="text-sm uppercase tracking-[0.3em] text-white/50">Color</p>
                     <div className="mt-3 flex flex-wrap gap-3">
                       {neonColorOptions.map((color) => (
                         <button
                           key={color.value}
                           type="button"
                           onClick={() => setTemplateModalConfig((prev) => ({ ...prev, color: color.value }))}
                           className={`h-11 w-11 rounded-full border-2 transition ${
                             templateModalConfig.color === color.value ? 'border-white shadow-neon' : 'border-white/20'
                           }`}
                           style={{ backgroundColor: color.value }}
                           aria-label={color.label}
                         />
                       ))}
                     </div>
                   </div>

                   <div>
                     <p className="text-sm uppercase tracking-[0.3em] text-white/50">Size</p>
                     <div className="mt-3 grid gap-3 sm:grid-cols-3">
                       {sizeOptions.map((size) => (
                         <button
                           key={size.value}
                           type="button"
                           onClick={() => setTemplateModalConfig((prev) => ({ ...prev, size: size.value }))}
                           className={`rounded-2xl border px-4 py-3 text-left transition ${
                             templateModalConfig.size === size.value
                               ? 'border-pink-400/70 bg-pink-500/10 text-white'
                               : 'border-white/10 text-white/70'
                           }`}
                         >
                           <p className="text-base font-semibold">{size.label}</p>
                           <p className="text-xs text-white/60">{size.description}</p>
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>

               {/* Bottom: Customer Details & Actions */}
               <div className="mt-6 grid gap-6 lg:grid-cols-2">
                 <form
                   className="glass-panel space-y-4 border border-white/10 p-6"
                   onSubmit={async (e: FormEvent) => {
                     e.preventDefault()
                     if (!validateCustomerDetails()) return
                     setIsSending(true)
                     setStatus({ type: 'idle', message: '' })
                     try {
                       const config: NameSignConfig = {
                         category: 'name',
                         text: templateModalConfig.text,
                         font: neonFonts[0].value,
                         color: templateModalConfig.color,
                         size: templateModalConfig.size,
                         selectedTemplate: selectedTemplateForModal.value,
                       }
                       
                       // Convert image URL to base64 data URI for email attachment
                       let imagePreview: string | undefined = undefined
                       try {
                         const base64Image = await convertImageUrlToBase64(selectedTemplateForModal.imageUrl)
                         // More aggressive compression for templates: smaller target size and max dimension
                         imagePreview = await compressImage(base64Image, 120, 600)
                         console.log('Converted template image to base64, size:', (imagePreview.length / 1024).toFixed(2), 'KB')
                       } catch (imgError) {
                         console.warn('Failed to convert template image to base64:', imgError)
                         // Continue without image preview if conversion fails
                       }
                       
                       // Always generate PDF for templates with all details
                       let pdfBase64: string | undefined = undefined
                       try {
                         pdfBase64 = await generatePDF(config, customerDetails, null)
                         setTemplateModalPdfBase64(pdfBase64)
                         console.log('Generated PDF for template, size:', (pdfBase64.length / 1024).toFixed(2), 'KB')
                       } catch (pdfError) {
                         console.warn('PDF generation failed for template:', pdfError)
                         // Continue without PDF if generation fails
                       }
                       
                       // Build payload and check size before sending
                       const payload = {
                         ...customerDetails,
                         config,
                         imagePreview,
                         pdfBase64,
                         timestamp: new Date().toISOString(),
                       }
                       let payloadSize = JSON.stringify(payload).length
                       console.log('Template payload size:', (payloadSize / 1024).toFixed(2), 'KB')
                       
                       // Conservative thresholds to avoid Vercel/server limits (~4.5MB)
                       const MAX_SAFE_PAYLOAD = 2.0 * 1024 * 1024 // 2MB to leave headroom for encoding on serverless platforms
                       
                       // If still too large, remove image preview first
                       if (payloadSize > MAX_SAFE_PAYLOAD) {
                         console.warn('Template payload too large, removing image preview')
                         payload.imagePreview = undefined
                         payloadSize = JSON.stringify(payload).length
                         console.log('Payload size after removing imagePreview:', (payloadSize / 1024).toFixed(2), 'KB')
                       }
                       
                       // If still too large after removing image, drop PDF
                       if (payloadSize > MAX_SAFE_PAYLOAD) {
                         console.warn('Template payload still too large, removing PDF attachment')
                         payload.pdfBase64 = undefined
                         payloadSize = JSON.stringify(payload).length
                         console.log('Payload size after removing PDF:', (payloadSize / 1024).toFixed(2), 'KB')
                       }
                       
                       // Final guard: if payload still exceeds a safe limit, try without PDF
                       const FINAL_LIMIT = 3.8 * 1024 * 1024 // 3.8MB absolute upper guard
                       if (payloadSize > FINAL_LIMIT && payload.pdfBase64) {
                         console.warn('Payload still too large, removing PDF as final attempt')
                         payload.pdfBase64 = undefined
                         payloadSize = JSON.stringify(payload).length
                         console.log('Final payload size after removing PDF:', (payloadSize / 1024).toFixed(2), 'KB')
                       }
                       
                       // If still too large, abort with message
                       if (payloadSize > FINAL_LIMIT) {
                         setStatus({
                           type: 'error',
                           message: 'Request too large. Please try again - the design details will be sent, but some attachments may be excluded.',
                         })
                         setIsSending(false)
                         return
                       }
                       
                       // Show warning if attachments were removed
                       let warningMessage = ''
                       if (!payload.imagePreview && imagePreview) {
                         warningMessage = 'Image preview was removed to reduce size. '
                       }
                       if (!payload.pdfBase64 && pdfBase64) {
                         warningMessage += 'PDF was removed to reduce size. '
                       }
                       if (warningMessage) {
                         console.warn('Attachments removed:', warningMessage)
                       }
                       
                       const response = await api.post('/neon-request', payload)
                       const responseData = response?.data || {}
                       setStatus({
                         type: 'success',
                         message: responseData.message || 'Sent! A Master Neon designer will reply with proofs within 1 business day.',
                       })
                       setCustomerDetails({ customerName: '', email: '', phone: '', notes: '' })
                       // Clear stored PDF after successful send
                       setTemplateModalPdfBase64(null)
                       setTimeout(() => {
                         setSelectedTemplateForModal(null)
                         setStatus({ type: 'idle', message: '' })
                       }, 2000)
                     } catch (error: any) {
                       const errorMessage = error?.response?.data?.message || error?.message || 'We could not submit the request. Check your connection or try again shortly.'
                       setStatus({
                         type: 'error',
                         message: errorMessage,
                       })
                       console.error('Error sending request:', error)
                     } finally {
                       setIsSending(false)
                     }
                   }}
                 >
                   <p className="text-sm uppercase tracking-[0.3em] text-white/40">Customer Details</p>
                   <div>
                     <input
                       className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                         validationErrors.customerName
                           ? 'border-red-400 focus:border-red-400'
                           : 'border-white/10 focus:border-pink-400'
                       }`}
                       placeholder="Full name *"
                       value={customerDetails.customerName}
                       onChange={handleCustomerChange('customerName')}
                       required
                     />
                     {validationErrors.customerName && (
                       <p className="mt-1 text-xs text-red-400">{validationErrors.customerName}</p>
                     )}
                   </div>
                   <div>
                     <input
                       type="email"
                       className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                         validationErrors.email
                           ? 'border-red-400 focus:border-red-400'
                           : 'border-white/10 focus:border-pink-400'
                       }`}
                       placeholder="Email *"
                       value={customerDetails.email}
                       onChange={handleCustomerChange('email')}
                       required
                     />
                     {validationErrors.email && <p className="mt-1 text-xs text-red-400">{validationErrors.email}</p>}
                   </div>
                   <div>
                     <input
                       type="tel"
                       className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                         validationErrors.phone
                           ? 'border-red-400 focus:border-red-400'
                           : 'border-white/10 focus:border-pink-400'
                       }`}
                       placeholder="Phone (optional)"
                       value={customerDetails.phone}
                       onChange={handleCustomerChange('phone')}
                     />
                     {validationErrors.phone && <p className="mt-1 text-xs text-red-400">{validationErrors.phone}</p>}
                   </div>
                   <textarea
                     className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none"
                     placeholder="Preference message for the designer (optional)"
                     value={customerDetails.notes}
                     onChange={handleCustomerChange('notes')}
                   />
                   {status.type !== 'idle' && (
                     <p className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                       {status.message}
                     </p>
                   )}
                   <div className="flex gap-4">
                     <NeonButton
                       type="button"
                       variant="secondary"
                       className="flex-1"
                       onClick={async () => {
                         if (!validateCustomerDetails()) return
                         const config: NameSignConfig = {
                           category: 'name',
                           text: templateModalConfig.text,
                           font: neonFonts[0].value,
                           color: templateModalConfig.color,
                           size: templateModalConfig.size,
                           selectedTemplate: selectedTemplateForModal.value,
                         }
                         const pdfBase64 = await generatePDF(config, customerDetails, null)
                         // Store the generated PDF so it can be used when sending email
                         setTemplateModalPdfBase64(pdfBase64)
                       }}
                     >
                       Download PDF
                     </NeonButton>
                     <NeonButton type="submit" disabled={isSending} className="flex-1">
                       {isSending ? 'Sending...' : 'Send to Designer'}
                     </NeonButton>
                   </div>
                 </form>

                 <div className="glass-panel border border-white/10 p-6">
                   <p className="text-sm uppercase tracking-[0.3em] text-white/40">What happens next?</p>
                   <div className="mt-4 space-y-3 text-sm text-white/70">
                     <p>• Download your PDF to save your design locally</p>
                     <p>• Send to Designer to submit your request</p>
                     <p>• Our designer will review and contact you within 1 business day</p>
                     <p>• You&apos;ll receive design proofs and pricing information</p>
                     <p>• Once approved, production begins (7-day average build time)</p>
                   </div>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   )
 }

 export default BuilderPage
