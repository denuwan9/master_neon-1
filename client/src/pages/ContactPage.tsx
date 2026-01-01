import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import NeonButton from '../components/common/NeonButton'
import api from '../services/api'

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    email?: string
    phone?: string
    message?: string
  }>({})

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email || !email.trim()) return 'Email is required.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address.'
    }
    return undefined
  }

  const validatePhone = (phone: string): string | undefined => {
    if (!phone || !phone.trim()) return undefined // Phone is optional
    // Remove all non-digit characters to count digits
    const digitsOnly = phone.replace(/\D/g, '')
    // Must have exactly 10 digits
    if (digitsOnly.length !== 10) {
      return 'Phone number must contain exactly 10 digits.'
    }
    return undefined
  }

  const handleFieldChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
      
      // Validate on change
      if (field === 'email') {
        const error = validateEmail(value)
        setValidationErrors((prev) => ({ ...prev, email: error }))
      } else if (field === 'phone') {
        const error = validatePhone(value)
        setValidationErrors((prev) => ({ ...prev, phone: error }))
      } else if (field === 'name') {
        if (!value || !value.trim()) {
          setValidationErrors((prev) => ({ ...prev, name: 'Name is required.' }))
        } else {
          setValidationErrors((prev) => ({ ...prev, name: undefined }))
        }
      } else if (field === 'message') {
        if (!value || !value.trim()) {
          setValidationErrors((prev) => ({ ...prev, message: 'Message is required.' }))
        } else {
          setValidationErrors((prev) => ({ ...prev, message: undefined }))
        }
      }
    }

  const validateForm = (): boolean => {
    const errors: { name?: string; email?: string; phone?: string; message?: string } = {}
    
    // Validate name
    if (!form.name || !form.name.trim()) {
      errors.name = 'Name is required.'
    }

    // Validate email
    const emailError = validateEmail(form.email)
    if (emailError) {
      errors.email = emailError
    }

    // Validate phone if provided
    if (form.phone && form.phone.trim()) {
      const phoneError = validatePhone(form.phone)
      if (phoneError) {
        errors.phone = phoneError
      }
    }

    // Validate message
    if (!form.message || !form.message.trim()) {
      errors.message = 'Message is required.'
    }

    setValidationErrors(errors)
    
    if (Object.keys(errors).some(key => errors[key as keyof typeof errors] !== undefined)) {
      const firstError = Object.values(errors).find(err => err !== undefined)
      setStatus({ type: 'error', message: firstError || 'Please fix the errors below.' })
      return false
    }

    return true
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return
    
    setIsSubmitting(true)
    setStatus({ type: 'idle', message: '' })
    try {
      await api.post('/contact', form)
      setForm({ name: '', email: '', phone: '', message: '' })
      setValidationErrors({})
      setStatus({ type: 'success', message: "Thanks! We'll respond in 1 business day." })
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Could not send message. Please try again later.'
      setStatus({ type: 'error', message: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="glass-panel border border-white/10 p-6">
        <p className="text-sm uppercase tracking-[0.4em] text-white/40">Contact</p>
        <h2 className="mt-2 text-3xl font-semibold">Let&apos;s plan your neon story</h2>
        <p className="mt-4 text-white/70">
          Share your brief, timeline, and installation details. A producer will send design proofs, pricing, and
          mounting options tailored to your space.
        </p>
        <div className="mt-8 space-y-4 text-sm text-white/70">
          <p>📧 masterneon2025@gmail.com</p>
          <p>☎️ +94 76-996-8638</p>
          <p>🏭 169 | Vithanage Watta, Ratiyala Govinna.</p>
        </div>
        
        <div className="mt-8 h-48 overflow-hidden rounded-2xl border border-white/10">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.9783645625594!2d80.11471883817569!3d6.649603211327925!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae3cb0028a5fdef%3A0xdd90e513db0fc8d3!2sWasana%20Bakers%20Retiyala%20shop!5e0!3m2!1sen!2slk!4v1765953315267!5m2!1sen!2slk"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Wasana Bakers Retiyala shop location"
          />
        </div>
      </div>

      <form className="glass-panel border border-white/10 p-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <input
              className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                validationErrors.name
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-white/10 focus:border-pink-400'
              }`}
              placeholder="Name *"
              value={form.name}
              onChange={handleFieldChange('name')}
              required
            />
            {validationErrors.name && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.name}</p>
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
              value={form.email}
              onChange={handleFieldChange('email')}
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
              value={form.phone}
              onChange={handleFieldChange('phone')}
            />
            {validationErrors.phone && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.phone}</p>
            )}
          </div>
          <div>
            <textarea
              className={`min-h-[160px] w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none bg-black/40 ${
                validationErrors.message
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-white/10 focus:border-pink-400'
              }`}
              placeholder="How can we help? *"
              value={form.message}
              onChange={handleFieldChange('message')}
              required
            />
            {validationErrors.message && (
              <p className="mt-1 text-xs text-red-400">{validationErrors.message}</p>
            )}
          </div>
          {status.type !== 'idle' && (
            <p className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{status.message}</p>
          )}
          <NeonButton type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending…' : 'Send message'}
          </NeonButton>
        </div>
      </form>
    </div>
  )
}

export default ContactPage
