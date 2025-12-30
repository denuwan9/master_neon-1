import type { NeonSize } from '../types/neon'

export const neonColorOptions = [
  { label: 'Electric Pink', value: '#ff4df0' },
  { label: 'Ice Blue', value: '#00c2ff' },
  { label: 'Warm White', value: '#fef8e7' },
  { label: 'Solar Yellow', value: '#fff95b' },
  { label: 'Lime Green', value: '#39ff14' },
  { label: 'Crimson Red', value: '#ff2d55' },
]

export const neonFonts = [
  { label: 'Monoton', value: '"Monoton", cursive' },
  { label: 'Pacifico', value: '"Pacifico", cursive' },
  { label: 'Neonderthaw', value: '"Neonderthaw", cursive' },
  { label: 'Orbitron', value: '"Orbitron", sans-serif' },
  { label: 'Rajdhani', value: '"Rajdhani", sans-serif' },
  { label: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
  { label: 'Great Vibes', value: '"Great Vibes", cursive' },
  { label: 'Aclonica', value: '"Aclonica", sans-serif' },
  { label: 'Bungee', value: '"Bungee", cursive' },
  { label: 'Righteous', value: '"Righteous", cursive' },
  { label: 'Fredoka One', value: '"Fredoka One", cursive' },
  { label: 'Lobster', value: '"Lobster", cursive' },
]

export const sizeOptions: { label: string; value: NeonSize; description: string }[] = [
  { label: 'Small', value: 'small', description: 'Up to 24 inches wide' },
  { label: 'Medium', value: 'medium', description: 'Best selling — 36 inches wide' },
  { label: 'Large', value: 'large', description: 'Statement 48 inches wide' },
]

export const sizeMultipliers: Record<NeonSize, number> = {
  small: 1,
  medium: 1.5,
  large: 2,
}

export const defaultTemplates = [
  {
    label: 'Happy Birthday',
    value: 'happy-birthday',
    text: 'Happy Birthday',
    imageUrl: '/neon-designs/happy-birthday.png',
  },
  {
    label: 'Happy Anniversary',
    value: 'happy-anniversary',
    text: 'Happy Anniversary',
    imageUrl: '/neon-designs/happy-anniversary.png',
  },
  {
    label: 'Back Light Logo',
    value: 'back-light-logo',
    text: 'Back Light Logo',
    imageUrl: '/neon-designs/back-light-logo.png',
  },
  {
    label: 'Neon Name Logo',
    value: 'neon-mame-logo',
    text: 'Neon Name Logo',
    imageUrl: '/neon-designs/neon-name-logo.png',
  },
  {
    label: 'Neon Logo',
    value: 'neon-logo',
    text: 'Neon Logo',
    imageUrl: '/neon-designs/neon-logo.png',
  },
  {
    label: 'Neon Cat',
    value: 'neon-cat-01',
    text: 'Neon Cat',
    imageUrl: '/neon-designs/neon-cat-01.png',
  },
  {
    label: 'Neon Cat',
    value: 'neon-cat-02',
    text: 'Neon Cat',
    imageUrl: '/neon-designs/neon-cat-02.png',
  },
  {
    label: 'Neon Cat on Moon',
    value: 'cat-moon',
    text: 'Neon Cat on Moon',
    imageUrl: '/neon-designs/neon-cat-03.png',
  },
]

export const emojiOptions = [
  '👑', '❤️', '💛', '💚', '💙', '💜', '🧡', '🖤', '🤍', '💖',
  '💗', '💓', '💕', '💞', '💟', '💝', '✨', '🌟', '💫', '⭐',
  '🔵', '🔥', '💎', '🎉', '🎊', '🎈', '🎁', '☀️', '🌙', '💯'
]
