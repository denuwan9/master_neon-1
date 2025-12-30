import { sizeMultipliers } from '../data/builderOptions'
import type { NeonSize } from '../types/neon'

const BASE_PRICE = 50
const PER_CHARACTER = 2

export const calculateNeonPrice = (text: string, size: NeonSize): number => {
  const safeTextLength = Math.min(text.trim().length, 30)
  const subtotal = BASE_PRICE + safeTextLength * PER_CHARACTER
  return Math.round(subtotal * sizeMultipliers[size])
}

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const describePrice = (text: string, size: NeonSize): string => {
  const charCost = Math.min(text.trim().length, 30) * PER_CHARACTER
  const multiplier = sizeMultipliers[size]
  return `Base $${BASE_PRICE} + $${charCost} text × ${multiplier} (${size})`
}

