import { useEffect, useRef } from 'react'
import { Close, Panel } from '@design-systems/icons'
import intuitAssistIcon from '../../assets/icons/intuit-assist.svg'
import styles from '../../styles/data-review/FieldPopover.module.css'

// ── Field metadata ────────────────────────────────────────────────────────────

export interface FieldMeta {
  label: string
  // Prior year value (2024 / prior year)
  prior: number
  // Current year value (2025 / current year)
  current: number
  // Year labels
  priorYear?: string
  currentYear?: string
  // Source document links
  sources?: { label: string; value: number }[]
}

// Static metadata for each 1040 field
export const FIELD_META: Record<string, FieldMeta> = {
  wages: {
    label: 'Wages',
    prior: 146000,
    current: 124265,
    sources: [
      { label: 'Bing Equipment', value: 60000 },
      { label: 'Tech Circle',    value: 64265 },
    ],
  },
  taxableInterest: {
    label: 'Taxable interest',
    prior: 3181,
    current: 4535,
    sources: [
      { label: 'MegaBank (1099-INT)', value: 4535 },
    ],
  },
  qualifiedDivs: {
    label: 'Qualified dividends',
    prior: 127,
    current: 45,
    sources: [
      { label: 'Citigroup (1099-DIV)', value: 45 },
    ],
  },
  ordinaryDivs: {
    label: 'Ordinary dividends',
    prior: 478,
    current: 531,
    sources: [
      { label: 'Citigroup (1099-DIV)', value: 531 },
    ],
  },
  capitalGain: {
    label: 'Capital gain / (loss)',
    prior: 239,
    current: 602,
    sources: [
      { label: 'Schedule D', value: 602 },
    ],
  },
  totalIncome: {
    label: 'Total income',
    prior: 152666,
    current: 134472,
  },
  agi: {
    label: 'Adjusted gross income',
    prior: 152666,
    current: 134472,
  },
  stdDeduction: {
    label: 'Standard deduction',
    prior: 13850,
    current: 14600,
    sources: [
      { label: 'Standard deduction (single)', value: 14600 },
    ],
  },
  taxableIncome: {
    label: 'Taxable income',
    prior: 138816,
    current: 119872,
  },
  withholding: {
    label: 'Federal income tax withheld',
    prior: 21400,
    current: 15987,
    sources: [
      { label: 'Bing Equipment (W-2)', value: 10000 },
      { label: 'Tech Circle (W-2)',    value: 5987  },
    ],
  },
  box12: {
    label: 'Box 12 — 401(k) contributions',
    prior: 4800,
    current: 5000,
    sources: [
      { label: 'Bing Equipment (W-2 Box 12)', value: 5000 },
    ],
  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FieldPopoverProps {
  fieldName: string
  /** Viewport rect of the value cell — used for fixed positioning */
  anchorRect: DOMRect
  onClose: () => void
  onViewSource?: (fieldName: string, sourceLabel?: string) => void
}

function fmt(n: number) {
  return n.toLocaleString()
}

function badgeClass(pct: number): string {
  const abs = Math.abs(pct)
  if (abs < 5)   return styles.yoyBadgeGrey
  if (abs <= 30) return styles.yoyBadgeOrange
  return styles.yoyBadgeRed
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FieldPopover({
  fieldName,
  anchorRect,
  containerRect,
  onClose,
  onViewSource,
}: FieldPopoverProps) {
  const meta = FIELD_META[fieldName]
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Small delay so the click that opened the popover doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 80)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!meta) return null

  const diff = meta.current - meta.prior
  const pct  = Math.round((diff / meta.prior) * 100)

  // Position: right of the form doc, vertically centered on the anchor cell
  // Calculated relative to the viewport
  const top  = anchorRect.top + anchorRect.height / 2
  const left = anchorRect.right + 10

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={{
        position: 'fixed',
        top,
        left,
        transform: 'translateY(-50%)',
        zIndex: 200,
      }}
    >
      {/* Header */}
      <div className={styles.header}>
        <img src={intuitAssistIcon} alt="" className={styles.assistIcon} />
        <span className={styles.fieldLabel}>{meta.label}</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close popover">
          <Close size="small" />
        </button>
      </div>

      {/* YoY section */}
      <div className={styles.yoySection}>
        <div className={styles.yoySectionLabel}>Year over year</div>
        <div className={styles.yoyCard}>
          <div className={styles.yoyRow}>
            <div className={styles.yoyCol}>
              <span className={styles.yoyColLabel}>2024</span>
              <span className={styles.yoyColValue}>${fmt(meta.prior)}</span>
            </div>
            <div className={styles.yoyDivider} />
            <div className={styles.yoyCol}>
              <span className={styles.yoyColLabel}>2025</span>
              <span className={styles.yoyColValue}>${fmt(meta.current)}</span>
            </div>
            <div className={styles.yoyDivider} />
            <div className={styles.yoyCol}>
              <span className={styles.yoyColLabel}>Diff</span>
              <span className={styles.yoyColValue}>{diff >= 0 ? '+' : ''}{fmt(diff)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <span className={`${styles.yoyBadge} ${badgeClass(pct)}`}>
              {pct >= 0 ? `+${pct}%` : `${pct}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Sources section — only if field has sources */}
      {meta.sources && meta.sources.length > 0 && (
        <div className={styles.sourcesSection}>
          <div className={styles.sourcesSectionLabel}>Sources</div>
          {meta.sources.map(s => (
            <div key={s.label} className={styles.sourceRow}>
              {/* Link: name + panel icon together, inline */}
              <button className={styles.sourceLink} onClick={() => onViewSource?.(fieldName, s.label)}>
                {s.label}
                <span className={styles.sourcePanelIcon}><Panel size="small" /></span>
              </button>
              <span className={styles.sourceDots} />
              <span className={styles.sourceValue}>${fmt(s.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
