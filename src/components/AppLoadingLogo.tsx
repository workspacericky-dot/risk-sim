import Image from 'next/image'
import styles from './AppLoadingLogo.module.css'

type AppLoadingLogoProps = {
  fullScreen?: boolean
  label?: string
}

export function AppLoadingLogo({
  fullScreen = false,
  label = 'Memuat Risk Sim',
}: AppLoadingLogoProps) {
  return (
    <div
      className={`${styles.loader} ${fullScreen ? styles.fullScreen : styles.content}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.outerRing} />
        <span className={styles.innerRing} />
        <span className={styles.orbitDot} />
        <span className={styles.logoGlow} />
        <span className={styles.logoFrame}>
          <Image
            src="/risk-sim-logo.png"
            alt=""
            fill
            sizes="128px"
            className={styles.logo}
            priority
          />
        </span>
      </div>

      <div className={styles.copy}>
        <p className={styles.label}>{label}</p>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <span className="sr-only">Mohon tunggu, halaman sedang dimuat.</span>
    </div>
  )
}
