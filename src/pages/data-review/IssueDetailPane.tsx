import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, CircleCheck, Panel } from '@design-systems/icons'
import { Button } from '@ids-ts/button'
import '@ids-ts/button/dist/main.css'
import sendArrow from '../../assets/send-arrow.svg'
import Tooltip from './Tooltip'
import styles from '../../styles/data-review/YoYDetailPane.module.css'
import fieldStyles from '../../styles/data-review/DetailFields.module.css'

interface IssueDetailPaneProps {
  issueKey: string
  dotColor: 'red' | 'blue'
  title: string
  summary: string
  taxImpact: string
  rootCause: string
  tableRows: { label: string; scanned: string; expected: string; confidence: string }[]
  tableHeaders: string[]
  suggestedActions: string[]
  viewSourceLabel: string
  reviewedCount?: number
  totalItems?: number
  closing?: boolean
  reviewedFields?: Set<string>
  issueNumber?: number
  /** If set, shows an inline edit widget for this field */
  editableField?: string
  editableValue?: number
  onFieldValueChange?: (value: number) => void
  onClose?: () => void
  onBack?: () => void
  onViewSource?: () => void
  onMarkReviewed?: (fieldName: string) => void
  onPrev?: () => void
  onNext?: () => void
  totalIssues?: number
}

// Mock client Q&A keyed by issueKey
const CLIENT_QA: Record<string, { question: string; answer: string; date: string }> = {
  scanQuality: {
    question: 'We noticed a discrepancy in your W-2 from Bing Equipment. Can you confirm the Box 1 wages amount?',
    answer: 'Yes, that looks right — I left Bing Equipment in June 2024. The $60,000 reflects about half a year of salary.',
    date: 'Mar 15, 2025',
  },
  irsCompliance: {
    question: 'Did you receive any IRS notices or correspondence in 2024 related to prior-year returns?',
    answer: 'No, nothing from the IRS. Everything was clean last year.',
    date: 'Mar 15, 2025',
  },
  qualifiedDivs: {
    question: 'Your qualified dividends dropped significantly vs. last year. Did you sell or transfer any investment accounts in 2024?',
    answer: 'Yes, I moved some funds out of my Citigroup brokerage account in early 2024 to cover a home repair.',
    date: 'Mar 16, 2025',
  },
  earlyWithdrawal: {
    question: 'We see an early withdrawal from a retirement account. Can you confirm the amount and whether the 10% penalty applies?',
    answer: 'Yes, I pulled $8,500 from my IRA in August. I was told the penalty might be waived because it was for a medical expense, but I\'m not sure.',
    date: 'Mar 16, 2025',
  },
}

export default function IssueDetailPane({
  issueKey,
  dotColor,
  title,
  summary,
  taxImpact,
  rootCause,
  tableRows,
  tableHeaders,
  suggestedActions,
  viewSourceLabel,
  reviewedCount = 0,
  totalItems = 5,
  closing = false,
  reviewedFields,
  issueNumber,
  editableField,
  editableValue,
  onFieldValueChange,
  onClose,
  onBack,
  onViewSource,
  onMarkReviewed,
  onPrev,
  onNext,
  totalIssues = 6,
}: IssueDetailPaneProps) {
  const [inputValue, setInputValue] = useState('')
  const isReviewed = reviewedFields?.has(issueKey) ?? false

  // Inline edit state
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [savedInPane, setSavedInPane] = useState(false)
  const [editedInPane, setEditedInPane] = useState(false)

  const startInlineEdit = () => {
    setDraft(editableValue?.toString() ?? '')
    setEditing(true)
    setSavedInPane(false)
  }
  const commitInlineEdit = () => {
    const num = parseFloat(draft.replace(/,/g, '')) || 0
    onFieldValueChange?.(num)
    setEditing(false)
    setEditedInPane(true)
    setSavedInPane(true)
    setTimeout(() => setSavedInPane(false), 3500)
  }
  const cancelInlineEdit = () => { setEditing(false); setDraft('') }

  const handleMarkReviewed = () => {
    if (!isReviewed) onMarkReviewed?.(issueKey)
  }

  // Dismiss any lingering tooltips from the pane that just slid out
  useEffect(() => {
    document.querySelectorAll(':hover').forEach(el =>
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    )
  }, [])

  const dotStyle = dotColor === 'blue' ? { background: '#205ea3' } : {}

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
              <span className={styles.counter}>
                <strong className={styles.counterNum}>{reviewedCount}</strong> of {totalItems} reviewed
              </span>
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
            <span className={styles.dot} style={dotStyle} />
            <span className={styles.issueTitle} style={{ flex: 1 }}>
              {issueNumber != null && (
                <span className={styles.issueNum}>{String(issueNumber).padStart(2, '0')} </span>
              )}
              {title}
            </span>
          </div>

          {/* Summary */}
          <p className={styles.summary}>{summary}</p>

          {/* Tax impact banner */}
          <div className={styles.taxImpactBanner}>
            <p className={styles.taxImpactText}>
              <strong>Tax impact:</strong> {taxImpact}
            </p>
          </div>

          {/* Root Cause */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Root cause</p>
            <p className={styles.sectionBody}>{rootCause}</p>
          </div>

          {/* Client response — shown when a matching Q&A exists */}
          {CLIENT_QA[issueKey] && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Client response</p>
              <div className={styles.qaBlock}>
                <p className={styles.qaQuestion}>
                  <strong>Preparer asked:</strong> {CLIENT_QA[issueKey].question}
                </p>
                <div className={styles.qaBubble}>
                  <span className={styles.qaAvatar}>JW</span>
                  <div className={styles.qaText}>
                    <span className={styles.qaName}>Jordan Wells · {CLIENT_QA[issueKey].date}</span>
                    <p className={styles.qaAnswer}>{CLIENT_QA[issueKey].answer}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details table */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Details</p>
            <div className={styles.tableCard}>
              {/* Header row */}
              <div className={`${styles.tableRow} ${styles.tableHeaderRow}`}
                style={{ gridTemplateColumns: `1fr repeat(${tableHeaders.length - 1}, 80px)` }}>
                {tableHeaders.map((h, i) => (
                  <span key={i} className={i === 0 ? styles.cellLabel : styles.cellValue}>{h}</span>
                ))}
              </div>
              {tableRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`${styles.tableRow} ${i < tableRows.length - 1 ? styles.tableRowBorder : ''}`}
                  style={{ gridTemplateColumns: `1fr repeat(${tableHeaders.length - 1}, 80px)` }}
                >
                  <span className={styles.cellLabel}>{row.label}</span>
                  <span className={styles.cellValue}>{row.scanned}</span>
                  <span className={styles.cellValue}>{row.expected}</span>
                  <span className={styles.cellValue}>{row.confidence}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Action */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Suggested action</p>
            <ul className={styles.actionList}>
              {suggestedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>

          {/* Inline edit widget — only shown when field is editable */}
          {editableField && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Correct this value</p>
              <div className={styles.inlineEditRow}>
                <input
                  className={`${fieldStyles.fieldInput} ${fieldStyles.fieldInputSmall} ${editing ? fieldStyles.fieldInputEditing : ''}`}
                  readOnly={!editing}
                  value={editing ? draft : (editableValue?.toLocaleString() ?? '—')}
                  onChange={e => setDraft(e.target.value)}
                  autoFocus={editing}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitInlineEdit() } if (e.key === 'Escape') cancelInlineEdit() }}
                />
                {!editing && (
                  <button className={fieldStyles.editBtn} onClick={startInlineEdit}>Edit</button>
                )}
                {editing && (
                  <div className={fieldStyles.editActions}>
                    <button className={fieldStyles.saveBtn} onClick={commitInlineEdit}>Save</button>
                    <button className={fieldStyles.undoBtn} onClick={cancelInlineEdit}>Undo</button>
                  </div>
                )}
                {savedInPane && <span className={fieldStyles.recalcBadge}>1040 updated</span>}
                {editedInPane && !savedInPane && <span className={fieldStyles.editedBadge}>Edited</span>}
              </div>
            </div>
          )}

          {/* Action buttons + nav arrows in one row */}
          <div className={styles.actionButtons}>
            <Tooltip text="Open the source document alongside the 1040 to verify or correct this value">
              <Button priority="primary" size="small" onClick={onViewSource}>
                <Panel size="small" /> {viewSourceLabel}
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

      {/* ── Input area ── */}
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
