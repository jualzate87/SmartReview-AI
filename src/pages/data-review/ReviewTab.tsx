import { PopOut } from '@design-systems/icons'
import sparklesIcon from '../../assets/icons/sparkles.svg'
import styles from '../../styles/data-review/ReviewTab.module.css'

const TABS = [
  { label: 'Prior Year 1040', key: 'prior-1040' as const },
  { label: 'W-2s', key: 'w2s' as const },
  { label: '1099-DIVs', key: '1099-divs' as const },
  { label: '1099-INTs', key: '1099-ints' as const },
  { label: 'Schedule K-1', key: 'k1' as const },
]

export type TopTab = 'w2s' | '1099-divs' | '1099-ints' | 'k1' | 'prior-1040'

interface ReviewTabProps {
  activeTopTab?: string
  onTopTabChange?: (tab: TopTab) => void
  onTabChange?: (tab: string) => void
  onPopOut?: () => void
  isPopout?: boolean
}

export default function ReviewTab({ activeTopTab = 'w2s', onTopTabChange, onTabChange, onPopOut, isPopout = false }: ReviewTabProps) {

  const handleTabClick = (key: string, label: string) => {
    if (key === 'w2s' || key === '1099-divs' || key === '1099-ints' || key === 'k1' || key === 'prior-1040') {
      onTopTabChange?.(key as TopTab)
    }
    onTabChange?.(label)
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={styles.tab}
            onClick={() => handleTabClick(tab.key, tab.label)}
          >
            <div className={styles.tabContent}>
              <img src={sparklesIcon} alt="" className={`${styles.tabIcon} ${tab.key !== activeTopTab ? styles.tabIconInactive : ''}`} />
              <span className={`${styles.tabLabel} ${tab.key === activeTopTab ? styles.tabLabelActive : styles.tabLabelInactive}`}>
                {tab.label}
              </span>
            </div>
            <div className={styles.tabUnderline}>
              <div className={tab.key === activeTopTab ? styles.tabUnderlineActive : styles.tabUnderlineInactive} />
            </div>
          </button>
        ))}
      </div>

      {/* Dock-back button (popout window) or Pop-out button (main window) */}
      {isPopout ? (
        <button
          className={styles.dockBackBtn}
          aria-label="Close and dock back"
          onClick={() => window.close()}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M1 1L6 6M6 6H2M6 6V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Dock back
        </button>
      ) : (
        <button
          className={styles.popOutBtn}
          aria-label="Pop out to new window"
          onClick={onPopOut}
        >
          <PopOut size="medium" />
        </button>
      )}
    </div>
  )
}
