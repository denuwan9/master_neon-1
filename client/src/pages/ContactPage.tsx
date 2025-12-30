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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.message) {
      setStatus({ type: 'error', message: 'Name, email, and message are required.' })
      return
    }
    setIsSubmitting(true)
    setStatus({ type: 'idle', message: '' })
    try {
      await api.post('/contact', form)
      setForm({ name: '', email: '', phone: '', message: '' })
      setStatus({ type: 'success', message: "Thanks! We'll respond in 1 business day." })
    } catch (error) {
      setStatus({ type: 'error', message: 'Could not send message. Please try again later.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFieldChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
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
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none"
            placeholder="Name"
            value={form.name}
            onChange={handleFieldChange('name')}
          />
          <input
            type="email"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none"
            placeholder="Email"
            value={form.email}
            onChange={handleFieldChange('email')}
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none"
            placeholder="Phone"
            value={form.phone}
            onChange={handleFieldChange('phone')}
          />
          <textarea
            className="min-h-[160px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none"
            placeholder="How can we help?"
            value={form.message}
            onChange={handleFieldChange('message')}
          />
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
