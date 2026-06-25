import { useState, useEffect, useRef } from 'react'
import { Close, Plus, ChevronDown, ChevronRight, ChevronLeft, CircleCheck, Document, Panel } from '@design-systems/icons'
import importedDocsIcon from '../../assets/icons/imported-docs.svg'
import { Button } from '@ids-ts/button'
import '@ids-ts/button/dist/main.css'
import { Badge } from '@cgds/badge'
import '@cgds/badge/dist/index.css'
import intuitAssistIcon from '../../assets/icons/intuit-assist.svg'
import brandBallsIcon from '../../assets/icons/brand-balls.svg'
import compareOthersIcon from '../../assets/icons/compare-others.svg'
import federalTaxesIcon from '../../assets/icons/federal-taxes.svg'
import scannerIcon from '../../assets/icons/scanner.svg'
import taxesAndCreditsIcon from '../../assets/icons/taxes-and-credits.svg'
import YoYDetailPane from './YoYDetailPane'
import IssueDetailPane from './IssueDetailPane'
import QuestionnairePane from './QuestionnairePane'
import Tooltip from './Tooltip'
import styles from '../../styles/data-review/AgentReportPane.module.css'

// 6 total items across all 4 categories (wages + taxableInterest in YoY, plus 4 others)
const TOTAL_REVIEW_ITEMS = 6

// Ordered list of issue keys for guided "Next" navigation
const GUIDED_ORDER = ['wages', 'taxableInterest', 'scanQuality', 'irsCompliance', 'qualifiedDivs', 'earlyWithdrawal'] as const
type IssueKey = typeof GUIDED_ORDER[number]

interface AgentReportPaneProps {
  onClose?: () => void
  onYoyToggle?: (expanded: boolean) => void
  onViewW2?: (fromSubView?: 'overview' | 'yoyDetail') => void
  onReviewSource?: () => void
  onMarkReviewed?: (fieldName: string) => void
  reviewedFields?: Map<string, { by: string; at: string }>
  closing?: boolean
  initialSubView?: 'overview' | 'yoyDetail'
  onSubViewChange?: (subView: 'overview' | 'yoyDetail') => void
  embedded?: boolean
  total1a?: number
  wages?: { bingEquipment: number; techCircle: number }
  onNavigateToTab?: (tab: 'w2s' | '1099-divs' | '1099-ints' | 'k1' | 'prior-1040', subTab?: 'bingEquipment' | 'techCircle', field?: string) => void
  /** Highlight a 1040 field without leaving the agent panel */
  onHighlightField?: (field: string | null) => void
  /** Live field values for inline editing */
  fieldValues?: { withholding: number; box12: number; taxableInterest: number; qualifiedDivs: number }
  onFieldValueChange?: (key: 'withholding' | 'box12' | 'taxableInterest' | 'qualifiedDivs', value: number) => void
}

const REPORT_CARDS = [
  { label: 'YoY analysis',          keys: ['wages', 'taxableInterest'],          badgeColor: 'red'  as const, position: 'first' },
  { label: 'Scan quality & inputs', keys: ['scanQuality'],                        badgeColor: 'red'  as const, position: 'middle' },
  { label: 'IRS compliance',        keys: ['irsCompliance'],                      badgeColor: 'red'  as const, position: 'middle' },
  { label: 'Credits & deductions',  keys: ['qualifiedDivs', 'earlyWithdrawal'],  badgeColor: 'blue' as const, position: 'last' },
]

const CARD_ICONS = [
  <img src={compareOthersIcon}   alt="" width={20} height={20} />,
  <img src={scannerIcon}         alt="" width={20} height={20} />,
  <img src={federalTaxesIcon}    alt="" width={20} height={20} />,
  <img src={taxesAndCreditsIcon} alt="" width={20} height={20} />,
]

// ── YoY Finding: Taxable Interest +42% ───────────────────────────────────
const TAXABLE_INTEREST_ISSUE = {
  issueKey: 'taxableInterest',
  dotColor: 'red' as const,
  title: 'Taxable interest up 42% year-over-year',
  summary: 'MegaBank 1099-INT shows $4,535 in taxable interest (Box 1) — a 42% increase vs. the prior year figure of $3,194. This is a significant jump that warrants confirmation.',
  taxImpact: 'At Jordan\'s marginal rate (~22%), the additional $1,341 in interest income adds approximately $295 in federal tax compared to last year. The total interest income of $4,535 flows to Form 1040 line 2b.',
  rootCause: 'The increase may reflect a higher account balance, a new high-yield savings account, or a CD maturing during 2024. Box 3 (U.S. Savings Bond interest, $35) also contributes to the total on line 2b.',
  tableRows: [
    { label: 'Box 1 (Interest income)', cols: ['$4,500',  '$3,159', '+$1,341', '+42%'], badge: 'red'    as const, total: false },
    { label: 'Box 3 (U.S. Bond int.)',  cols: ['$35',     'N/A',    'N/A',     '—'  ], badge: undefined,          total: false },
    { label: 'Line 2b total',           cols: ['$4,535',  '$3,194', '+$1,341', '+42%'], badge: 'red'    as const, total: true  },
  ],
  tableHeaders: ['Field', '2024', '2023', 'Change', ''],
  suggestedActions: [
    'Confirm the $4,500 Box 1 amount against the MegaBank 1099-INT source document.',
    'Ask Jordan whether a new savings account or CD was opened in 2024 to explain the increase.',
    'Confirm no additional 1099-INT documents are missing from the import.',
  ],
  category: 'YoY analysis',
  viewSourceLabel: 'View 1099-INT',
  viewSourceTab: '1099-ints' as const,
  viewSourceSubTab: undefined,
  viewSourceField: 'taxableInterest',
}

// ── Scan Quality: Tech Circle W-2 Box 12 (401k) ──────────────────────────
// Completely different field from YoY (which is wages/Box 1)
const SCAN_QUALITY_ISSUE = {
  issueKey: 'scanQuality',
  dotColor: 'red' as const,
  title: 'Unreadable field — Tech Circle W-2',
  summary: 'Box 12 (Code D — 401k deferral) on the Tech Circle W-2 could not be read with confidence. The scanned value of $5,000 may be incorrect. This field affects pre-tax deductions and taxable income.',
  taxImpact: 'If the 401k contribution is understated, Jordan\'s taxable income may be overstated by up to the correct contribution amount. Each additional $1,000 in 401k deferrals reduces taxable income by $1,000 — saving approximately $220 in taxes.',
  rootCause: 'Box 12 on the Tech Circle W-2 is partially obscured by a fold in the uploaded document, reducing OCR accuracy on that field specifically.',
  tableRows: [
    { label: 'Box 12 (Code D 401k)', cols: ['$5,000',  '$5k–$23k', '68%'], badge: 'red'  as const, total: false },
    { label: 'Box 1 (Wages)',        cols: ['$64,304', 'N/A',      '96%'], badge: 'grey' as const, total: false },
  ],
  tableHeaders: ['Field', 'Scanned', 'Typical range', 'Confidence'],
  suggestedActions: [
    'Open the Tech Circle W-2 in the document panel and locate Box 12 (Code D).',
    'Compare the printed value to the scanned amount of $5,000.',
    'If incorrect, update the field — the corrected amount flows automatically to Schedule 1.',
  ],
  category: 'Scan quality',
  viewSourceLabel: 'View Tech Circle W-2',
  viewSourceTab: 'w2s' as const,
  viewSourceSubTab: 'techCircle' as const,
  viewSourceField: 'box12',
}

// ── IRS Compliance: Estimated tax underpayment risk ──────────────────────
// Genuinely compliance-related: withholding vs. projected liability
const IRS_COMPLIANCE_ISSUE = {
  issueKey: 'irsCompliance',
  dotColor: 'red' as const,
  title: 'Possible underpayment penalty — estimated tax',
  summary: 'Jordan\'s total federal withholding ($15,987) may be insufficient to cover the estimated tax liability on $134,472 total income. If withholding is less than 90% of current-year liability or 100% of prior-year liability, the IRS may assess an underpayment penalty.',
  taxImpact: 'Estimated tax on $119,872 taxable income is approximately $22,200 (2024 tax brackets, single filer). Withholding is ~72% of estimated liability — below the 90% safe harbor threshold. Potential penalty: $200–$400.',
  rootCause: 'Bing Equipment withheld $10,000 and Tech Circle withheld $5,987 — a combined $15,987. With total income of $134,472, the effective withholding rate is approximately 12%, which may fall short of the required amounts.',
  tableRows: [
    { label: 'Bing Equipment (Box 2)', cols: ['$10,000', '≥$13,188', '-$3,188'], badge: undefined,           total: false },
    { label: 'Tech Circle (Box 2)',    cols: ['$5,987',  '≥$6,792',  '-$805'  ], badge: undefined,           total: false },
    { label: 'Total withheld',         cols: ['$15,987', '≥$19,980', '-$3,993'], badge: 'red' as const,      total: true  },
  ],
  tableHeaders: ['Source', 'Withheld', '90% safe harbor', 'Gap'],
  suggestedActions: [
    'Confirm both W-2 Box 2 amounts against the source documents.',
    'Calculate Jordan\'s estimated 2024 tax liability to confirm whether withholding meets the 90% safe harbor.',
    'If withholding is insufficient, advise Jordan about Form 2210 and potential penalty.',
  ],
  category: 'IRS compliance',
  viewSourceLabel: 'View W-2 withholding',
  viewSourceTab: 'w2s' as const,
  viewSourceSubTab: 'bingEquipment' as const,
  viewSourceField: 'withholding',
}

// ── Credits & Deductions: 2 items ─────────────────────────────────────────
const CREDITS_ITEMS = [
  {
    issueKey: 'qualifiedDivs',
    dotColor: 'blue' as const,
    title: 'Qualified dividends — confirm 0% tax rate eligibility',
    summary: 'Jordan\'s Citigroup 1099-DIV shows $20.10 in qualified dividends (Box 1b). Qualified dividends are taxed at preferential rates (0%, 15%, or 20%) depending on taxable income.',
    taxImpact: 'At Jordan\'s estimated taxable income (~$119,872), qualified dividends are taxed at 15% — not 0%. Tax on $20.10 is approximately $3. No change needed, but worth confirming the holding period qualifies.',
    rootCause: 'Ordinary dividends are $31.24 (Box 1a); qualified portion is $20.10 (Box 1b). Both scanned at 94% confidence from the Citigroup 1099-DIV.',
    tableRows: [
      { label: 'Box 1a (Ordinary divs)', cols: ['$31.24', 'Ordinary', '~$7'], badge: undefined,         total: false },
      { label: 'Box 1b (Qualified divs)', cols: ['$20.10', '15%',      '~$3'], badge: 'green' as const, total: true  },
    ],
    tableHeaders: ['Field', 'Amount', 'Rate', 'Est. tax'],
    suggestedActions: [
      'Confirm the qualified dividend amount ($20.10) against the Citigroup 1099-DIV Box 1b.',
      'Confirm Jordan held the underlying shares for more than 60 days (required for qualified treatment).',
      'No tax change expected — document the review.',
    ],
    category: 'Credits & deductions',
    viewSourceLabel: 'View 1099-DIV',
    viewSourceTab: '1099-divs' as const,
    viewSourceSubTab: undefined,
    viewSourceField: 'qualifiedDivs',
  },
  {
    issueKey: 'earlyWithdrawal',
    dotColor: 'blue' as const,
    title: 'Early withdrawal penalty — confirm $0',
    summary: 'MegaBank 1099-INT Box 2 (early withdrawal penalty) was scanned as $0. If Jordan broke a CD or time-deposit account early in 2024, a penalty may have been assessed — which is deductible and reduces taxable income.',
    taxImpact: 'If a penalty was incorrectly captured as $0, Jordan may be missing a deduction. Each $100 in penalty reduces taxable income by $100, saving approximately $22 in taxes at Jordan\'s marginal rate.',
    rootCause: 'Box 2 on the MegaBank 1099-INT shows $0. Common for standard savings accounts. Verify with Jordan that no time-deposit was broken early in 2024.',
    tableRows: [
      { label: 'Box 1 (Interest)',        cols: ['$4,500', '$4,500', '✓'],   badge: 'green' as const, total: false },
      { label: 'Box 2 (Early penalty)',   cols: ['$0',     'Confirm', '?'],  badge: 'orange' as const, total: false },
    ],
    tableHeaders: ['Field', 'Scanned', 'Expected', 'Status'],
    suggestedActions: [
      'Open the MegaBank 1099-INT and confirm Box 2 shows $0.',
      'Ask Jordan whether any CDs or time-deposit accounts were closed early in 2024.',
      'If a penalty was assessed, enter the amount — it flows to Schedule 1 as a deduction.',
    ],
    category: 'Credits & deductions',
    viewSourceLabel: 'View 1099-INT',
    viewSourceTab: '1099-ints' as const,
    viewSourceSubTab: undefined,
    viewSourceField: 'earlyWithdrawal',
  },
]

// Maps each issue key to the 1040 field it should highlight
const ISSUE_FIELD: Partial<Record<IssueKey, string>> = {
  wages:           'wages',
  taxableInterest: 'taxableInterest',
  scanQuality:     'box12',
  irsCompliance:   'withholding',
  qualifiedDivs:   'qualifiedDivs',
  earlyWithdrawal: 'taxableInterest',
}

export default function AgentReportPane({
  onClose,
  onYoyToggle,
  onViewW2,
  onReviewSource,
  onMarkReviewed,
  reviewedFields = new Map(),
  closing = false,
  initialSubView,
  onSubViewChange,
  embedded = false,
  total1a = 124265,
  wages,
  onNavigateToTab,
  onHighlightField,
  fieldValues,
  onFieldValueChange,
}: AgentReportPaneProps) {
  const reviewedCount = reviewedFields.size
  const progressPct = Math.round((reviewedCount / TOTAL_REVIEW_ITEMS) * 100)
  const allReviewed = reviewedCount >= TOTAL_REVIEW_ITEMS
  const [showCompletion, setShowCompletion] = useState(false)
  const prevAllReviewed = useRef(false)

  // Auto-trigger completion screen the moment all items become reviewed
  useEffect(() => {
    if (allReviewed && !prevAllReviewed.current) {
      // Brief delay so the "Reviewed" button state renders first
      const t = setTimeout(() => {
        setYoyDetailOpen(false)
        setIssueDetailOpen(null)
        setShowCompletion(true)
      }, 600)
      return () => clearTimeout(t)
    }
    prevAllReviewed.current = allReviewed
  }, [allReviewed])
  const [inputValue, setInputValue] = useState('')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [importedDocsExpanded, setImportedDocsExpanded] = useState(false)
  const [yoyDetailOpen, setYoyDetailOpen] = useState(initialSubView === 'yoyDetail')
  const [yoyDetailClosing, setYoyDetailClosing] = useState(false)
  const [issueDetailOpen, setIssueDetailOpen] = useState<string | null>(null)
  const [issueDetailClosing, setIssueDetailClosing] = useState(false)
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)
  const [questionnaireClosing, setQuestionnaireClosing] = useState(false)

  const handleOpenQuestionnaire = () => setQuestionnaireOpen(true)
  const handleCloseQuestionnaire = () => {
    setQuestionnaireClosing(true)
    setTimeout(() => { setQuestionnaireOpen(false); setQuestionnaireClosing(false) }, 220)
  }

  // ── Detail pane navigation ─────────────────────────────────
  const openDetail = (key: string) => {
    // Highlight the corresponding 1040 field when opening any issue detail
    const field = ISSUE_FIELD[key as IssueKey] ?? null
    onHighlightField?.(field)
    if (key === 'wages') {
      setYoyDetailOpen(true)
      onSubViewChange?.('yoyDetail')
    } else {
      setIssueDetailOpen(key)
    }
  }

  const handleCloseYoyDetail = () => {
    setYoyDetailClosing(true)
    onSubViewChange?.('overview')
    onHighlightField?.(null)  // clear 1040 highlight when closing
    setTimeout(() => { setYoyDetailOpen(false); setYoyDetailClosing(false) }, 200)
  }

  const handleCloseIssueDetail = () => {
    setIssueDetailClosing(true)
    onHighlightField?.(null)  // clear 1040 highlight when closing
    setTimeout(() => { setIssueDetailOpen(null); setIssueDetailClosing(false) }, 200)
  }

  // Navigate to next issue in guided order
  const handleNext = (currentKey: string) => {
    const idx = GUIDED_ORDER.indexOf(currentKey as IssueKey)
    const nextKey = idx >= 0 && idx < GUIDED_ORDER.length - 1 ? GUIDED_ORDER[idx + 1] : null
    if (nextKey) {
      if (currentKey === 'wages') {
        handleCloseYoyDetail()
        setTimeout(() => openDetail(nextKey), 220)
      } else {
        handleCloseIssueDetail()
        setTimeout(() => openDetail(nextKey), 220)
      }
    } else {
      // All done — close detail and show completion screen if all reviewed
      if (currentKey === 'wages') handleCloseYoyDetail()
      else handleCloseIssueDetail()
      setTimeout(() => setShowCompletion(true), 220)
    }
  }

  // Navigate to previous issue in guided order
  const handlePrev = (currentKey: string) => {
    const idx = GUIDED_ORDER.indexOf(currentKey as IssueKey)
    const prevKey = idx > 0 ? GUIDED_ORDER[idx - 1] : null
    if (!prevKey) return
    if (currentKey === 'wages') {
      handleCloseYoyDetail()
      setTimeout(() => openDetail(prevKey), 220)
    } else {
      handleCloseIssueDetail()
      setTimeout(() => openDetail(prevKey), 220)
    }
  }

  const isLastIssue  = (key: string) => GUIDED_ORDER.indexOf(key as IssueKey) === GUIDED_ORDER.length - 1
  const isFirstIssue = (key: string) => GUIDED_ORDER.indexOf(key as IssueKey) === 0

  const handleCardClick = (label: string) => {
    setExpandedCard(prev => {
      const next = prev === label ? null : label
      onYoyToggle?.(next === 'YoY analysis')
      return next
    })
  }

  const getIssueConfig = (key: string) => {
    if (key === TAXABLE_INTEREST_ISSUE.issueKey) return TAXABLE_INTEREST_ISSUE
    if (key === SCAN_QUALITY_ISSUE.issueKey) return SCAN_QUALITY_ISSUE
    if (key === IRS_COMPLIANCE_ISSUE.issueKey) return IRS_COMPLIANCE_ISSUE
    return CREDITS_ITEMS.find(c => c.issueKey === key) ?? null
  }

  const activeIssue = issueDetailOpen ? getIssueConfig(issueDetailOpen) : null

  return (
    <div className={`${embedded ? styles.panelEmbedded : styles.panel} ${closing && !embedded ? styles.panelClosing : ''}`}>

      {/* ── Header — hidden when embedded ── */}
      {!embedded && (
        <div className={styles.header}>
          <div className={styles.headerLeft} />
          <div className={styles.headerTitle}>
            <img src={intuitAssistIcon} alt="" className={styles.assistIcon} />
            <span className={styles.titleText}>Review AI</span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconBtn} aria-label="Close" onClick={onClose}>
              <Close size="small" />
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable pane ── */}
      <div className={styles.pane}>
        <div className={styles.chat}>

          <p className={styles.agentMessage}>
            Here's what we found. Review the issues below to complete your return.
          </p>

          {/* Imported Documents card */}
          <div className={styles.importedDocsCard}>
            <button
              className={styles.importedDocsHeader}
              onClick={() => setImportedDocsExpanded(v => !v)}
              aria-expanded={importedDocsExpanded}
            >
              <img src={importedDocsIcon} alt="" width={20} height={20} />
              <div className={styles.importedDocsContent}>
                <span className={styles.importedDocsLabel}>Imported documents</span>
                <Badge status="info" shape="rect">5</Badge>
              </div>
              <ChevronDown size="small" className={importedDocsExpanded ? styles.chevronUp : styles.chevron} />
            </button>

            {importedDocsExpanded && (
              <div className={styles.docList}>
                <div className={styles.docTableHeader}>
                  <span className={styles.docColDocument}>Document</span>
                  <span className={styles.docColConfidence}>
                    Confidence
                    <span className={styles.docConfidenceInfo} title="Scan confidence score">ⓘ</span>
                  </span>
                </div>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('prior-1040')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>1040-PriorYear-2024.pdf</span>
                      <span className={styles.docSub}>Form 1040 · 2 pages</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="high">100%</span>
                </button>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('w2s', 'bingEquipment')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>W2-BingEquipment.pdf</span>
                      <span className={styles.docSub}>W-2 · 2 pages</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="low">72%</span>
                </button>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('w2s', 'techCircle')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>W2-TechCircle.pdf</span>
                      <span className={styles.docSub}>W-2 · 1 page</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="medium">68%</span>
                </button>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('1099-ints')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>1099-INT-MegaBank.pdf</span>
                      <span className={styles.docSub}>1099-INT · 1 page</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="high">91%</span>
                </button>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('1099-divs')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>1099-DIV-Citigroup.pdf</span>
                      <span className={styles.docSub}>1099-DIV · 1 page</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="high">94%</span>
                </button>
                <button className={styles.docRow} onClick={handleOpenQuestionnaire}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon} style={{ color: '#205ea3' }}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>Client-Questionnaire.pdf</span>
                      <span className={styles.docSub}>Organizer · 10 responses</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="high">100%</span>
                </button>
              </div>
            )}
          </div>

          {/* Items to review scorecard */}
          <div className={styles.scoreCard}>
            <span className={styles.scoreTitle}>Items to review</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct || 5}%`, background: '#00856d', transition: 'width 400ms ease' }} />
            </div>
            <div className={styles.scoreCountRow}>
              <span className={styles.scoreCountNumber}>{TOTAL_REVIEW_ITEMS - reviewedCount}</span>
              <span className={styles.scoreCountLabel}>items remaining</span>
            </div>
          </div>

          {/* Completion screen — shown when all items reviewed (replaces cards) */}
          {allReviewed && showCompletion && (
            <div className={styles.completionScreen}>
              <div className={styles.completionHeader}>
                <span className={styles.completionCheckIcon}><CircleCheck size="small" /></span>
                <span className={styles.completionTitle}>Review complete</span>
              </div>
              <p className={styles.completionBody}>
                All {TOTAL_REVIEW_ITEMS} issues reviewed and reconciled. This return is ready to move forward.
              </p>
              {[...reviewedFields.values()].slice(0, 1).map((v, idx) => (
                <p key={idx} className={styles.completionSignOff}>
                  Signed off by <strong>{v.by}</strong> · {v.at}
                </p>
              ))}
              <div className={styles.completionActions}>
                <Button priority="primary" size="medium" onClick={() => {}}>
                  Complete return review
                </Button>
                <button className={styles.completionSecondaryBtn} onClick={() => setShowCompletion(false)}>
                  Review again
                </button>
              </div>
            </div>
          )}

          {/* Expandable report card bundle — hidden when completion screen is shown */}
          <div className={styles.cardBundle} style={allReviewed && showCompletion ? { display: 'none' } : {}}>
            {REPORT_CARDS.map((card, i) => {
              const remaining = card.keys.filter(k => !reviewedFields.has(k)).length
              const cardDone = remaining === 0
              return (
              <div key={card.label}>
                <button
                  className={`${styles.card} ${styles[`card_${card.position}`]} ${expandedCard === card.label ? styles.cardActive : ''}`}
                  onClick={() => handleCardClick(card.label)}
                >
                  <div className={styles.cardIcon}>{CARD_ICONS[i]}</div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardLabel}>{card.label}</span>
                    {cardDone
                      ? <span className={`${styles.badge} ${styles.badgeGreen}`}>✓</span>
                      : <span className={`${styles.badge} ${card.badgeColor === 'red' ? styles.badgeRed : styles.badgeBlue}`}>{remaining}</span>
                    }
                  </div>
                  <ChevronDown size="small" className={`${styles.chevron} ${expandedCard === card.label ? styles.chevronUp : ''}`} />
                </button>

                {/* ── YoY analysis findings ── */}
                {card.label === 'YoY analysis' && expandedCard === 'YoY analysis' && (() => {
                  const wagesSignOff  = reviewedFields.get('wages')
                  const wagesReviewed = !!wagesSignOff
                  const intSignOff    = reviewedFields.get('taxableInterest')
                  const intReviewed   = !!intSignOff
                  const prior = 146000
                  const diff = total1a - prior
                  const pct = Math.round((diff / prior) * 100)
                  const diffK = Math.abs(diff / 1000).toFixed(1)
                  return (
                    <div className={styles.findingCard} style={{ gap: 12 }}>
                      {/* Finding 1 — Wages drop */}
                      <button className={`${styles.findingInner} ${wagesReviewed ? styles.findingInnerReviewed : ''}`} onClick={() => onHighlightField?.(ISSUE_FIELD['wages'] ?? null)}>
                        <div className={styles.findingTitleRow}>
                          {wagesReviewed ? <span className={styles.findingCheckIcon}><CircleCheck size="small" /></span> : <span className={styles.findingDot} />}
                          <span className={styles.findingTitle}>Significant income drop</span>
                          <span className={styles.issueChip}>{GUIDED_ORDER.indexOf('wages') + 1} of {GUIDED_ORDER.length}</span>
                          {wagesReviewed && <span className={styles.findingReviewedBadge}>Reviewed</span>}
                        </div>
                        {wagesSignOff && (
                          <span className={styles.findingSignOff}>{wagesSignOff.by} · {wagesSignOff.at}</span>
                        )}
                        <p className={styles.findingBody}>
                          Wages {diff < 0 ? 'dropped' : 'increased'} by ${diffK}k ({pct > 0 ? '+' : ''}{pct}%) vs. prior year.
                        </p>
                        <div className={styles.findingActions} onClick={e => e.stopPropagation()}>
                          <Tooltip text="Open the W-2 documents side-by-side to verify the reported wage amounts">
                            <Button priority="secondary" size="small" onClick={() => onViewW2?.('overview')}>
                              <Panel size="small" /> View sources
                            </Button>
                          </Tooltip>
                          <Tooltip text="See the root cause, tax impact, and suggested next steps for this finding">
                            <Button priority="primary" size="small" onClick={() => openDetail('wages')}>See details <ChevronRight size="small" /></Button>
                          </Tooltip>
                        </div>
                      </button>

                      {/* Finding 2 — Taxable interest +42% */}
                      <button className={`${styles.findingInner} ${intReviewed ? styles.findingInnerReviewed : ''}`} onClick={() => onHighlightField?.(ISSUE_FIELD['taxableInterest'] ?? null)}>
                        <div className={styles.findingTitleRow}>
                          {intReviewed ? <span className={styles.findingCheckIcon}><CircleCheck size="small" /></span> : <span className={styles.findingDot} />}
                          <span className={styles.findingTitle}>Taxable interest up 42% year-over-year</span>
                          <span className={styles.issueChip}>{GUIDED_ORDER.indexOf('taxableInterest') + 1} of {GUIDED_ORDER.length}</span>
                          {intReviewed && <span className={styles.findingReviewedBadge}>Reviewed</span>}
                        </div>
                        {intSignOff && (
                          <span className={styles.findingSignOff}>{intSignOff.by} · {intSignOff.at}</span>
                        )}
                        <p className={styles.findingBody}>
                          MegaBank 1099-INT shows $4,535 in interest income — a 42% jump vs. prior year ($3,194).
                        </p>
                        <div className={styles.findingActions} onClick={e => e.stopPropagation()}>
                          <Tooltip text="Open the MegaBank 1099-INT to verify Box 1 interest income">
                            <Button priority="secondary" size="small" onClick={() => onNavigateToTab?.('1099-ints', undefined, 'taxableInterest')}>
                              <Panel size="small" /> View source
                            </Button>
                          </Tooltip>
                          <Tooltip text="See the root cause, tax impact, and suggested next steps for this finding">
                            <Button priority="primary" size="small" onClick={() => openDetail('taxableInterest')}>See details <ChevronRight size="small" /></Button>
                          </Tooltip>
                        </div>
                      </button>
                    </div>
                  )
                })()}

                {/* ── Scan quality finding — Tech Circle W-2 Box 12 ── */}
                {card.label === 'Scan quality & inputs' && expandedCard === 'Scan quality & inputs' && (() => {
                  const signOff = reviewedFields.get(SCAN_QUALITY_ISSUE.issueKey)
                  const isReviewed = !!signOff
                  return (
                    <div className={styles.findingCard}>
                      <button className={`${styles.findingInner} ${isReviewed ? styles.findingInnerReviewed : ''}`} onClick={() => onHighlightField?.(ISSUE_FIELD[SCAN_QUALITY_ISSUE.issueKey as IssueKey] ?? null)}>
                        <div className={styles.findingTitleRow}>
                          {isReviewed ? <span className={styles.findingCheckIcon}><CircleCheck size="small" /></span> : <span className={styles.findingDot} />}
                          <span className={styles.findingTitle}>Unreadable field — Tech Circle W-2</span>
                          <span className={styles.issueChip}>{GUIDED_ORDER.indexOf('scanQuality') + 1} of {GUIDED_ORDER.length}</span>
                          {isReviewed && <span className={styles.findingReviewedBadge}>Reviewed</span>}
                        </div>
                        {signOff && <span className={styles.findingSignOff}>{signOff.by} · {signOff.at}</span>}
                        <p className={styles.findingBody}>
                          Box 12 (401k deferral) scanned at 68% confidence. The captured amount of $5,000 may be incorrect.
                        </p>
                        <div className={styles.findingActions} onClick={e => e.stopPropagation()}>
                          <Tooltip text="Open the Tech Circle W-2 to inspect the low-confidence scan of Box 12">
                            <Button priority="secondary" size="small" onClick={() => onNavigateToTab?.('w2s', 'techCircle', 'box12')}>
                              <Panel size="small" /> View source
                            </Button>
                          </Tooltip>
                          <Tooltip text="See the root cause, tax impact, and suggested next steps for this finding">
                            <Button priority="primary" size="small" onClick={() => openDetail(SCAN_QUALITY_ISSUE.issueKey)}>See details <ChevronRight size="small" /></Button>
                          </Tooltip>
                        </div>
                      </button>
                    </div>
                  )
                })()}

                {/* ── IRS Compliance — underpayment risk ── */}
                {card.label === 'IRS compliance' && expandedCard === 'IRS compliance' && (() => {
                  const signOff = reviewedFields.get(IRS_COMPLIANCE_ISSUE.issueKey)
                  const isReviewed = !!signOff
                  return (
                    <div className={styles.findingCard}>
                      <button className={`${styles.findingInner} ${isReviewed ? styles.findingInnerReviewed : ''}`} onClick={() => onHighlightField?.(ISSUE_FIELD[IRS_COMPLIANCE_ISSUE.issueKey as IssueKey] ?? null)}>
                        <div className={styles.findingTitleRow}>
                          {isReviewed ? <span className={styles.findingCheckIcon}><CircleCheck size="small" /></span> : <span className={styles.findingDot} />}
                          <span className={styles.findingTitle}>Possible underpayment penalty</span>
                          <span className={styles.issueChip}>{GUIDED_ORDER.indexOf('irsCompliance') + 1} of {GUIDED_ORDER.length}</span>
                          {isReviewed && <span className={styles.findingReviewedBadge}>Reviewed</span>}
                        </div>
                        {signOff && <span className={styles.findingSignOff}>{signOff.by} · {signOff.at}</span>}
                        <p className={styles.findingBody}>
                          Total withholding ($15,987) may be below the 90% safe harbor threshold for Jordan's estimated liability.
                        </p>
                        <div className={styles.findingActions} onClick={e => e.stopPropagation()}>
                          <Tooltip text="Open the Bing Equipment W-2 to verify withholding amounts in Box 2">
                            <Button priority="secondary" size="small" onClick={() => onNavigateToTab?.('w2s', 'bingEquipment', 'withholding')}>
                              <Panel size="small" /> View source
                            </Button>
                          </Tooltip>
                          <Tooltip text="See the root cause, tax impact, and suggested next steps for this finding">
                            <Button priority="primary" size="small" onClick={() => openDetail(IRS_COMPLIANCE_ISSUE.issueKey)}>See details <ChevronRight size="small" /></Button>
                          </Tooltip>
                        </div>
                      </button>
                    </div>
                  )
                })()}

                {/* ── Credits & Deductions — 2 items ── */}
                {card.label === 'Credits & deductions' && expandedCard === 'Credits & deductions' && (
                  <div className={styles.findingCard} style={{ gap: 12 }}>
                    {CREDITS_ITEMS.map((item) => {
                      const signOff = reviewedFields.get(item.issueKey)
                      const isReviewed = !!signOff
                      return (
                        <button key={item.issueKey} className={styles.findingInner} onClick={() => onHighlightField?.(ISSUE_FIELD[item.issueKey as IssueKey] ?? null)}>
                          <div className={styles.findingTitleRow}>
                            {isReviewed
                              ? <span className={styles.findingCheckIcon}><CircleCheck size="small" /></span>
                              : <span className={styles.findingDot} style={{ background: '#205ea3' }} />
                            }
                            <span className={styles.findingTitle}>{item.title}</span>
                            <span className={styles.issueChip}>{GUIDED_ORDER.indexOf(item.issueKey as IssueKey) + 1} of {GUIDED_ORDER.length}</span>
                            {isReviewed && <span className={styles.findingReviewedBadge}>Reviewed</span>}
                          </div>
                          {signOff && <span className={styles.findingSignOff}>{signOff.by} · {signOff.at}</span>}
                          <p className={styles.findingBody}>
                            {item.issueKey === 'qualifiedDivs'
                              ? 'Citigroup 1099-DIV: $20.10 qualified dividends (Box 1b). Confirm tax rate applies.'
                              : 'MegaBank 1099-INT Box 2 (early penalty) is $0. Confirm no CD was broken early in 2024.'
                            }
                          </p>
                          <div className={styles.findingActions} onClick={e => e.stopPropagation()}>
                            <Tooltip text={item.issueKey === 'qualifiedDivs'
                              ? 'Open the Citigroup 1099-DIV to confirm Box 1b qualified dividend amounts'
                              : 'Open the MegaBank 1099-INT to confirm Box 2 early withdrawal penalty'
                            }>
                              <Button priority="secondary" size="small" onClick={() => onNavigateToTab?.(item.viewSourceTab, undefined, item.viewSourceField ?? undefined)}>
                                <Panel size="small" /> View source
                              </Button>
                            </Tooltip>
                            <Tooltip text="See the root cause, tax impact, and suggested next steps for this finding">
                              <Button priority="primary" size="small" onClick={() => openDetail(item.issueKey)}>See details <ChevronRight size="small" /></Button>
                            </Tooltip>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )})}
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
              <button className={styles.attachBtn} aria-label="Attach"><Plus size="medium" /></button>
            </div>
            <div className={styles.inputActionsRight}>
              <button className={`${styles.sendBtn} ${inputValue.trim() ? styles.sendBtnActive : ''}`} aria-label="Send">
                <img src={brandBallsIcon} alt="" className={styles.sendIcon} />
              </button>
            </div>
          </div>
        </div>
        <span className={styles.legal}>Important information about how we use generative AI</span>
      </div>

      {/* ── YoY detail pane ── */}
      {(yoyDetailOpen || yoyDetailClosing) && (
        <YoYDetailPane
          closing={yoyDetailClosing}
          onClose={() => { handleCloseYoyDetail(); onClose?.() }}
          onBack={handleCloseYoyDetail}
          onViewW2={() => onViewW2?.('yoyDetail')}
          onReviewSource={onReviewSource ? () => { onReviewSource() } : undefined}
          onMarkReviewed={onMarkReviewed}
          reviewedCount={reviewedCount}
          totalItems={TOTAL_REVIEW_ITEMS}
          reviewedFields={reviewedFields}
          total1a={total1a}
          wages={wages}
          issueNumber={GUIDED_ORDER.indexOf('wages') + 1}
          category="YoY analysis"
          totalIssues={GUIDED_ORDER.length}
          onPrev={isFirstIssue('wages') ? undefined : () => handlePrev('wages')}
          onNext={isLastIssue('wages') ? undefined : () => handleNext('wages')}
          onOpenQuestionnaire={handleOpenQuestionnaire}
        />
      )}

      {/* ── Issue detail pane ── */}
      {(!!issueDetailOpen || issueDetailClosing) && activeIssue && (() => {
        return (
          <IssueDetailPane
            closing={issueDetailClosing}
            issueKey={activeIssue.issueKey}
            dotColor={activeIssue.dotColor}
            title={activeIssue.title}
            summary={activeIssue.summary}
            taxImpact={activeIssue.taxImpact}
            rootCause={activeIssue.rootCause}
            tableRows={activeIssue.tableRows}
            tableHeaders={activeIssue.tableHeaders}
            suggestedActions={activeIssue.suggestedActions}
            viewSourceLabel={activeIssue.viewSourceLabel}
            reviewedCount={reviewedCount}
            totalItems={TOTAL_REVIEW_ITEMS}
            reviewedFields={reviewedFields}
            onBack={handleCloseIssueDetail}
            onClose={() => { handleCloseIssueDetail(); onClose?.() }}
            onViewSource={() => {
              const field = (activeIssue as typeof TAXABLE_INTEREST_ISSUE).viewSourceField
              onNavigateToTab?.(
                activeIssue.viewSourceTab as 'w2s' | '1099-divs' | '1099-ints' | 'k1',
                (activeIssue as typeof SCAN_QUALITY_ISSUE).viewSourceSubTab,
                field ?? undefined
              )
              if (!field) onViewW2?.('overview')
            }}
            onMarkReviewed={onMarkReviewed}
            issueNumber={GUIDED_ORDER.indexOf(activeIssue.issueKey as IssueKey) + 1}
            category={activeIssue.category}
            totalIssues={GUIDED_ORDER.length}
            onPrev={isFirstIssue(activeIssue.issueKey) ? undefined : () => handlePrev(activeIssue.issueKey)}
            onNext={isLastIssue(activeIssue.issueKey) ? undefined : () => handleNext(activeIssue.issueKey)}
            onOpenQuestionnaire={handleOpenQuestionnaire}
          />
        )
      })()}

      {/* ── Questionnaire pane ── */}
      {(questionnaireOpen || questionnaireClosing) && (
        <QuestionnairePane
          closing={questionnaireClosing}
          onBack={handleCloseQuestionnaire}
        />
      )}

    </div>
  )
}
