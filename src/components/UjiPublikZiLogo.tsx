import Image from 'next/image'
import pmpziLogo from '../../ref/uji-publik/PMPZI.png'
import { cn } from '@/lib/utils'

export function UjiPublikZiLogo({
  size = 36,
  priority = false,
  className,
}: {
  size?: number
  priority?: boolean
  className?: string
}) {
  return (
    <Image
      src={pmpziLogo}
      alt="Logo PMPZI Zona Integritas"
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-full object-contain', className)}
    />
  )
}
