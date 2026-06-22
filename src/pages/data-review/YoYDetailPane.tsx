import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, CircleCheck, Panel } from '@design-systems/icons'
import { Button } from '@ids-ts/button'
import '@ids-ts/button/dist/main.css'
import sendArrow from '../../assets/send-arrow.svg'
import Tooltip from './Tooltip'
import styles from '../../styles/data-review/YoYDetailPane.module.css'

interface YoYDetailPaneProps {
  onClose?: () => void
  onBack?: () => void
  onViewW2?: () => void
  onReviewSource?: () => void
  onMarkReviewed?: (fieldName: string) => void
  reviewedCount?: number
  totalItems?: number
  closing?: boolean
  /** Set of reviewed field names — used to persist reviewed state across remounts */
  reviewedFields?: Set<string>
  issueNumber?: number
  onPrev?: () => void
  onNext?: () => void
  totalIssues?: number
}

const TABLE_ROWS = [
  { label: 'Bing Equipment', y2024: '$60,000',  y2023: '$82,000',  diff: '$22,000' },
  { label: 'Tech Circle',    y2024: '$64,304',  y2023: '$63,000',  diff: '$1,304'  },
  { label: 'Wages',          y2024: '$124,000', y2023: '$145,000', diff: '$20,735' },
]

// The 1040 field this finding maps to
const FINDING_FIELD = 'wages'

// Client Q&A for the wages/income drop finding
const WAGES_QA = {
  question: 'Your W-2 wages dropped by about $21k compared to last year. Can you explain the change in income?',
  answer: 'Yes — I left Bing Equipment in June 2024, so I only worked there for half the year. My Tech Circle salary stayed the same. The drop makes sense.',
  date: 'Mar 15, 2025',
}

export default function YoYDetailPane({ onClose, onBack, onViewW2, onReviewSource, onMarkReviewed, reviewedCount = 0, totalItems = 8, closing = false, reviewedFields, issueNumber, onPrev, onNext, totalIssues = 6 }: YoYDetailPaneProps) {
  const [inputValue, setInputValue] = useState('')
  // Derive reviewed state from parent set so it survives remounts
  const isReviewed = reviewedFields?.has(FINDING_FIELD) ?? false

  const handleMarkReviewed = () => {
    if (!isReviewed) {
      onMarkReviewed?.(FINDING_FIELD)
    }
  }

  // Dismiss any lingering tooltips from the pane that just slid out
  useEffect(() => {
    document.querySelectorAll(':hover').forEach(el =>
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    )
  }, [])

  return (
    <div className={`${styles.panel} ${closing ? styles.panelClosing : ''}`}>

      {/* ── Scrollable pane ── */}
      <div className={styles.pane}>
        <div className={styles.chat}>

          {/* Back + progress row */}
          <div className={styles.navRow}>
            <button className={styles.backLink} onClick={onBack}>
              <ChevronLeft size="small" />
              <span>Back to overview</span>
            </button>
            <div className={styles.navProgress}>
              <div className={styles.miniProgressTrack}>
                <div
                  className={styles.miniProgressFill}
                  style={{ width: `${Math.max(reviewedCount / totalItems * 100, reviewedCount > 0 ? 8 : 0)}%` }}
                />
              </div>
              <span className={styles.counter}><strong className={styles.counterNum}>{reviewedCount}</strong> of {totalItems} reviewed</span>
            </div>
          </div>

          {/* Issue navigation bar */}
          {(onPrev !== undefined || onNext !== undefined || issueNumber != null) && (
            <div className={styles.issueNavBar}>
              <button className={styles.issueNavBtn} onClick={onPrev} disabled={!onPrev} aria-label="Previous issue">
                <ChevronLeft size="small" /> Previous issue
              </button>
              {issueNumber != null && (
                <span className={styles.issueNavCounter}>Issue {issueNumber} of {totalIssues}</span>
              )}
              <button className={styles.issueNavBtn} onClick={onNext} disabled={!onNext} aria-label="Next issue">
                Next issue <ChevronRight size="small" />
              </button>
            </div>
          )}

          {/* Title row */}
          <div className={styles.titleRow}>
            <span className={styles.dot} />
            <span className={styles.issueTitle} style={{ flex: 1 }}>
              {issueNumber != null && (
                <span className={styles.issueNum}>{String(issueNumber).padStart(2, '0')} </span>
              )}
              Significant income drop
            </span>
          </div>

          {/* Summary */}
          <p className={styles.summary}>Wages dropped by $21.5k (-15%) vs Prior Year.</p>

          {/* Tax impact banner */}
          <div className={styles.taxImpactBanner}>
            <p className={styles.taxImpactText}>
              <strong>Tax impact:</strong> ~$4,600 lower tax liability from the $20.7k wage drop (lower taxable income)
            </p>
          </div>

          {/* Root Cause */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Root cause</p>
            <p className={styles.sectionBody}>
              Bing W-2 shows $22k reduction with low scan confidence (72%).
            </p>
          </div>

          {/* Client response */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Client response</p>
            <div className={styles.qaBlock}>
              <p className={styles.qaQuestion}>
                <strong>Preparer asked:</strong> {WAGES_QA.question}
              </p>
              <div className={styles.qaBubble}>
                <span className={styles.qaAvatar}>JW</span>
                <div className={styles.qaText}>
                  <span className={styles.qaName}>Jordan Wells · {WAGES_QA.date}</span>
                  <p className={styles.qaAnswer}>{WAGES_QA.answer}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details table */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Details</p>
            <div className={styles.tableCard}>
              {/* Header row */}
              <div className={`${styles.tableRow} ${styles.tableHeaderRow}`}>
                <span className={styles.cellLabel} />
                <span className={styles.cellValue}>2024</span>
                <span className={styles.cellValue}>2023</span>
                <span className={styles.cellValue}>Diff</span>
              </div>
              {/* Data rows */}
              {TABLE_ROWS.map((row, i) => (
                <div key={row.label} className={`${styles.tableRow} ${i < TABLE_ROWS.length - 1 ? styles.tableRowBorder : ''}`}>
                  <span className={styles.cellLabel}>{row.label}</span>
                  <span className={styles.cellValue}>{row.y2024}</span>
                  <span className={styles.cellValue}>{row.y2023}</span>
                  <span className={styles.cellValue}>{row.diff}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Action */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Suggested action</p>
            <ul className={styles.actionList}>
              <li>Confirm the Bing Equipment wages amount ($60,000) against the source document. Scan confidence is low (72%).</li>
              <li>Confirm with the client whether the income reduction is expected.</li>
            </ul>
          </div>

          {/* Action buttons + nav arrows in one row */}
          <div className={styles.actionButtons}>
            <Tooltip text="Open the W-2 source documents to compare wages side-by-side and update any values">
              <Button priority="primary" size="small" onClick={onReviewSource ?? onViewW2}>
                <Panel size="small" /> View source
              </Button>
            </Tooltip>
            {isReviewed ? (
              <Tooltip text="You've already marked this finding as reviewed">
                <button className={styles.reviewedBtn} disabled>
                  <CircleCheck size="small" />
                  <span>Reviewed</span>
                </button>
              </Tooltip>
            ) : (
              <Tooltip text="Confirm you've checked this finding. Progress is tracked automatically.">
                <Button priority="secondary" size="small" onClick={handleMarkReviewed}>
                  <CircleCheck size="small" /> Mark as reviewed
                </Button>
              </Tooltip>
            )}
          </div>


        </div>
      </div>

      {/* ── Input area (reused from AgentReportPane) ── */}
      <div className={styles.inputArea}>
        <div className={styles.inputFade} />
        <div className={styles.inputBox}>
          <div className={styles.inputTextField}>
            <textarea
              className={styles.textarea}
              placeholder="Ask anything"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault() }}
              rows={1}
            />
          </div>
          <div className={styles.inputActions}>
            <div className={styles.inputActionsLeft}>
              <button className={styles.attachBtn} aria-label="Attach">
                <Plus size="medium" />
              </button>
            </div>
            <div className={styles.inputActionsRight}>
              <button
                className={`${styles.sendBtn} ${inputValue.trim() ? styles.sendBtnActive : ''}`}
                aria-label="Send"
              >
                <img src={sendArrow} alt="" className={styles.sendIcon} />
              </button>
            </div>
          </div>
        </div>
        <span className={styles.legal}>How we use generative AI</span>
      </div>

    </div>
  )
}
