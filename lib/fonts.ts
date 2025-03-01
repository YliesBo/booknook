// lib/fonts.ts
import { Onest } from 'next/font/google';

export const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // Ajoutez ou supprimez les poids selon vos besoins
  display: 'swap',
  variable: '--font-onest',
});