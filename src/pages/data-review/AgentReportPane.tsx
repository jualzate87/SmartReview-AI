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

// 6 total items across all categories
const TOTAL_REVIEW_ITEMS = 6

// Ordered list of issue keys for guided "Next" navigation
const GUIDED_ORDER = ['w2Box12', 'w2Ein', 'divCollectibles', 'divNonDiv', 'wagesConfidence', 'capitalGainNew'] as const
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
  wages?: { techCircle: number }
  onNavigateToTab?: (tab: 'w2s' | '1099-divs' | '1099-ints' | 'k1' | 'prior-1040', subTab?: 'techCircle', field?: string) => void
  /** Highlight a 1040 field without leaving the agent panel */
  onHighlightField?: (field: string | null) => void
  /** Live field values for inline editing */
  fieldValues?: { withholding: number; box12: number; taxableInterest: number; qualifiedDivs: number }
  onFieldValueChange?: (key: 'withholding' | 'box12' | 'taxableInterest' | 'qualifiedDivs', value: number) => void
}

const REPORT_CARDS = [
  { label: 'Scan quality & inputs', keys: ['w2Box12', 'w2Ein', 'divCollectibles', 'divNonDiv', 'wagesConfidence'], badgeColor: 'red'  as const, position: 'first' },
  { label: 'YoY analysis',          keys: ['capitalGainNew'],                                                       badgeColor: 'red'  as const, position: 'last' },
]

const CARD_ICONS = [
  <img src={compareOthersIcon}   alt="" width={20} height={20} />,
  <img src={scannerIcon}         alt="" width={20} height={20} />,
  <img src={federalTaxesIcon}    alt="" width={20} height={20} />,
  <img src={taxesAndCreditsIcon} alt="" width={20} height={20} />,
]

// ── Jessica Drake Issues ──────────────────────────────────────────────────

const W2_BOX12_ISSUE = {
  issueKey: 'w2Box12',
  dotColor: 'red' as const,
  title: 'W-2 Box 12 not imported',
  category: 'Scan quality & inputs',
  summary: 'Box 12 was not captured during import. Code and amount must be entered manually.',
  taxImpact: 'Box 12 codes can affect pre-tax deductions (e.g., 401k, HSA). If Box 12 contains a deferral amount, taxable income may be overstated until the field is populated.',
  rootCause: 'The Box 12 section on the Tech Circle W-2 was not recognized during OCR. The field was left blank in the imported data.',
  tableRows: [
    { label: 'Box 12 (Code)', cols: ['—', 'Required', '—'], badge: 'red' as const, total: false },
  ],
  tableHeaders: ['Field', 'Imported', 'Status', ''],
  suggestedActions: [
    'Open the Tech Circle W-2 in the source document panel.',
    'Locate Box 12 and enter the Code and Amount manually.',
    'Save the value — it flows automatically to the return.',
  ],
  viewSourceLabel: 'View Tech Circle W-2',
  viewSourceTab: 'w2s' as const,
  viewSourceSubTab: 'techCircle' as const,
  viewSourceField: 'box12',
}

const W2_EIN_ISSUE = {
  issueKey: 'w2Ein',
  dotColor: 'red' as const,
  title: 'W-2 EIN not found',
  category: 'Scan quality & inputs',
  summary: 'Employer EIN not found in the document. Required for e-filing — enter manually.',
  taxImpact: 'A missing EIN will prevent e-filing. The return cannot be submitted electronically until this field is populated.',
  rootCause: 'The EIN field on the Tech Circle W-2 was not captured during import. This may be due to scan quality or document formatting.',
  tableRows: [
    { label: 'Employer EIN (Box b)', cols: ['—', 'Required', '—'], badge: 'red' as const, total: false },
  ],
  tableHeaders: ['Field', 'Imported', 'Status', ''],
  suggestedActions: [
    'Open the Tech Circle W-2 and locate Box b (Employer identification number).',
    'Enter the EIN manually in the Employer Information section.',
    'Verify it matches the printed value on the source document.',
  ],
  viewSourceLabel: 'View Tech Circle W-2',
  viewSourceTab: 'w2s' as const,
  viewSourceSubTab: 'techCircle' as const,
  viewSourceField: 'wages',
}

const DIV_COLLECTIBLES_ISSUE = {
  issueKey: 'divCollectibles',
  dotColor: 'red' as const,
  title: '1099-DIV Box 2d empty',
  category: 'Scan quality & inputs',
  summary: 'Collectibles (28%) gain not imported — verify source document.',
  taxImpact: 'If collectibles gain exists and was not captured, income may be understated. Collectibles gains are taxed at a maximum 28% rate.',
  rootCause: 'Box 2d on the Unwavering Financial 1099-DIV was blank or not recognized during import.',
  tableRows: [
    { label: 'Box 2d (Collectibles 28% gain)', cols: ['—', 'Verify', '?'], badge: 'orange' as const, total: false },
  ],
  tableHeaders: ['Field', 'Imported', 'Status', ''],
  suggestedActions: [
    'Open the Unwavering Financial 1099-DIV and check Box 2d.',
    'If a value exists, enter it manually.',
    'If blank on the source document, no action needed.',
  ],
  viewSourceLabel: 'View 1099-DIV',
  viewSourceTab: '1099-divs' as const,
  viewSourceSubTab: undefined,
  viewSourceField: 'qualifiedDivs',
}

const DIV_NONDIV_ISSUE = {
  issueKey: 'divNonDiv',
  dotColor: 'red' as const,
  title: '1099-DIV Box 3 empty',
  category: 'Scan quality & inputs',
  summary: 'Nondividend distributions not imported — verify source document.',
  taxImpact: 'Nondividend distributions (Box 3) are a return of capital — generally not taxable but reduce cost basis. If present and not captured, basis calculations may be affected.',
  rootCause: 'Box 3 on the Unwavering Financial 1099-DIV was not captured during import.',
  tableRows: [
    { label: 'Box 3 (Nondividend distributions)', cols: ['—', 'Verify', '?'], badge: 'orange' as const, total: false },
  ],
  tableHeaders: ['Field', 'Imported', 'Status', ''],
  suggestedActions: [
    'Open the Unwavering Financial 1099-DIV and check Box 3.',
    'If a value exists, enter it and note the basis impact.',
    'If blank on the source document, no action needed.',
  ],
  viewSourceLabel: 'View 1099-DIV',
  viewSourceTab: '1099-divs' as const,
  viewSourceSubTab: undefined,
  viewSourceField: 'ordinaryDivs',
}

const WAGES_CONFIDENCE_ISSUE = {
  issueKey: 'wagesConfidence',
  dotColor: 'red' as const,
  title: 'Wages low confidence',
  category: 'Scan quality',
  summary: 'W-2 wages read at 72% confidence. Verify Box 1 matches source document ($118,940).',
  taxImpact: 'If wages are misread, taxable income will be incorrect. At Jessica\'s marginal rate, each $1,000 error changes tax liability by approximately $240.',
  rootCause: 'The scan of the Tech Circle W-2 returned a lower-than-normal confidence score for Box 1. The printed digits may be partially obscured or low contrast.',
  tableRows: [
    { label: 'Box 1 (Wages)', cols: ['$118,940', '72%', 'Verify'], badge: 'red' as const, total: false },
  ],
  tableHeaders: ['Field', 'Scanned value', 'Confidence', 'Action'],
  suggestedActions: [
    'Open the Tech Circle W-2 and confirm Box 1 shows $118,940.',
    'If the printed value differs, correct it in the Wages field.',
    'Mark as reviewed once confirmed.',
  ],
  viewSourceLabel: 'View Tech Circle W-2',
  viewSourceTab: 'w2s' as const,
  viewSourceSubTab: 'techCircle' as const,
  viewSourceField: 'wages',
}

const CAPITAL_GAIN_NEW_ISSUE = {
  issueKey: 'capitalGainNew',
  dotColor: 'orange' as const,
  title: 'New capital gain this year',
  category: 'YoY analysis',
  summary: 'Capital gain of $194,600 is new this year (prior year: $0). Confirm Schedule D is attached.',
  taxImpact: 'Long-term capital gains at Jessica\'s income level are taxed at 20%. A $194,600 gain adds approximately $38,920 in capital gains tax. Confirm whether gains are short-term (ordinary rates) or long-term.',
  rootCause: 'No capital gain appeared on the prior year return. This year\'s $194,600 is entirely new and likely reflects asset sales in 2025.',
  tableRows: [
    { label: 'Capital gain (2025)', cols: ['$194,600', 'New', '—'],    badge: 'orange' as const, total: false },
    { label: 'Capital gain (2024)', cols: ['$0',        'Prior year', '—'], badge: undefined,         total: false },
  ],
  tableHeaders: ['Field', 'Amount', 'Status', ''],
  suggestedActions: [
    'Confirm Schedule D is attached and reflects all 2025 asset sales.',
    'Ask Jessica whether gains are short-term or long-term.',
    'Verify the $194,600 figure against brokerage 1099-B statements.',
  ],
  viewSourceLabel: 'View 1040',
  viewSourceTab: 'prior-1040' as const,
  viewSourceSubTab: undefined,
  viewSourceField: 'capitalGain',
}

// Maps each issue key to the 1040 field it should highlight
const ISSUE_FIELD: Partial<Record<IssueKey, string>> = {
  w2Box12:        'wages',
  w2Ein:          'wages',
  divCollectibles:'qualifiedDivs',
  divNonDiv:      'ordinaryDivs',
  wagesConfidence:'wages',
  capitalGainNew: 'capitalGain',
}

// All issues as a flat list for getIssueConfig lookup
const ALL_ISSUES = [W2_BOX12_ISSUE, W2_EIN_ISSUE, DIV_COLLECTIBLES_ISSUE, DIV_NONDIV_ISSUE, WAGES_CONFIDENCE_ISSUE, CAPITAL_GAIN_NEW_ISSUE]

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
  total1a = 118940,
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
    setIssueDetailOpen(key)
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
    return ALL_ISSUES.find(i => i.issueKey === key) ?? null
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
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('w2s', 'techCircle')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>W2-TechCircle.pdf</span>
                      <span className={styles.docSub}>W-2 · 1 page</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="low">72%</span>
                </button>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('1099-ints')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>1099-INT-UnwaveringFinancial.pdf</span>
                      <span className={styles.docSub}>1099-INT · 1 page</span>
                    </div>
                  </div>
                  <span className={styles.confidenceBadge} data-level="high">91%</span>
                </button>
                <button className={styles.docRow} onClick={() => onNavigateToTab?.('1099-divs')}>
                  <div className={styles.docRowLeft}>
                    <div className={styles.docFileIcon}><Document size="medium" /></div>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>1099-DIV-UnwaveringFinancial.pdf</span>
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

                {/* ── Issue findings — rendered from ALL_ISSUES filtered to this card's keys ── */}
                {expandedCard === card.label && (
                  <div className={styles.findingCard} style={{ gap: 12 }}>
                    {card.keys.map((key) => {
                      const issue = getIssueConfig(key)
                      if (!issue) return null
                      const signOff = reviewedFields.get(key)
                      const isReviewed = !!signOff
                      const issueNum = GUIDED_ORDER.indexOf(key as IssueKey) + 1
                      return (
                        <button key={key} className={`${styles.findingInner} ${isReviewed ? styles.findingInnerReviewed : ''}`} onClick={() => onHighlightField?.(ISSUE_FIELD[key as IssueKey] ?? null)}>
                          <div className={styles.findingTitleRow}>
                            {isReviewed ? <span className={styles.findingCheckIcon}><CircleCheck size="small" /></span> : <span className={styles.findingDot} style={{ background: issue.dotColor === 'orange' ? '#d68000' : '#c22929' }} />}
                            <span className={styles.findingTitle}>{issue.title}</span>
                            <span className={styles.issueChip}>{issueNum} of {GUIDED_ORDER.length}</span>
                            {isReviewed && <span className={styles.findingReviewedBadge}>Reviewed</span>}
                          </div>
                          {signOff && <span className={styles.findingSignOff}>{signOff.by} · {signOff.at}</span>}
                          <p className={styles.findingBody}>{issue.summary}</p>
                          <div className={styles.findingActions} onClick={e => e.stopPropagation()}>
                            <Tooltip text={`Open the source document for: ${issue.title}`}>
                              <Button priority="secondary" size="small" onClick={() => onNavigateToTab?.(issue.viewSourceTab, issue.viewSourceSubTab, issue.viewSourceField)}>
                                <Panel size="small" /> View source
                              </Button>
                            </Tooltip>
                            <Tooltip text="See the root cause, tax impact, and suggested next steps for this finding">
                              <Button priority="primary" size="small" onClick={() => openDetail(key)}>See details <ChevronRight size="small" /></Button>
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
