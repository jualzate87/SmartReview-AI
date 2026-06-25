import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, Comment } from '@design-systems/icons'
import FieldPopover, { FIELD_META } from './FieldPopover'
import Tooltip from './Tooltip'
import styles from '../../styles/data-review/LeftPanel1040.module.css'


interface LeftPanel1040Props {
  selectedField?: string | null
  onFieldClick?: (fieldName: string | null) => void
  total1a?: number
  wages?: { bingEquipment: number; techCircle: number }
  /** When true: clicking a field shows YoY badge, not blue popover */
  yoyExpanded?: boolean
  reviewedFields?: Set<string>
  /** Fields manually checked off by the preparer (independent of AI review) */
  checkedFields?: Set<string>
  /** Toggle a field's checked state */
  onToggleChecked?: (fieldName: string) => void
  /** When true: this field is highlighted orange (active agent issue card) — takes precedence over blue */
  issueField?: string | null
  /** Called when user clicks a source link in the field popover */
  onViewSource?: (fieldName: string, sourceLabel?: string) => void
  /** Live editable field values from source-doc entry sheets */
  fieldValues?: { withholding: number; box12: number; taxableInterest: number; qualifiedDivs: number }
  /** Called when user posts a comment from a 1040 field */
  onAddFieldNote?: (text: string, context: string) => void
}

// YoY % changes — absolute value drives color, sign drives label
const YOY: Record<string, number> = {
  wages:           -15,
  taxableInterest: +42,
  qualifiedDivs:   -63,
  ordinaryDivs:    +11,
  capitalGain:     +150,
  totalIncome:     -12,
  agi:             -12,
  stdDeduction:     +5,
  taxableIncome:   -14,
}

// Estimated tax dollar impact per field (at ~22% marginal rate for Jordan's bracket)
const YOY_TAX_IMPACT: Record<string, number> = {
  wages:           (124265 * 0.15) * 0.22,
  taxableInterest: (4535  * 0.42) * 0.22,
  qualifiedDivs:   (45    * 0.63) * 0.15,
  ordinaryDivs:    (531   * 0.11) * 0.22,
  capitalGain:     (602   * 1.50) * 0.15,
  totalIncome:     (134472 * 0.12) * 0.22,
  agi:             (134472 * 0.12) * 0.22,
  stdDeduction:    (14600 * 0.05) * 0.22,
  taxableIncome:   (119872 * 0.14) * 0.22,
}

// Threshold: >=15% change AND >$300 estimated tax impact
function meetsRowTintThreshold(field: string): boolean {
  const pct = YOY[field]
  if (pct === undefined) return false
  const taxImpact = YOY_TAX_IMPACT[field] ?? 0
  return Math.abs(pct) >= 15 && taxImpact > 300
}

// Badge color based purely on absolute magnitude (no green — green = reviewed only)
// Applied to ALL YoY fields (badges on every YoY field, tints only on threshold-meeting ones)
function badgeColor(pct: number): string {
  const abs = Math.abs(pct)
  if (abs <= 10)  return styles.badgeGrey
  if (abs <= 30)  return styles.badgeOrange
  return styles.badgeRed
}

// Row background tint — only for fields exceeding the significance threshold
function rowYoyClass(pct: number): string {
  const abs = Math.abs(pct)
  if (abs <= 30) return styles.rowYoyOrange
  return styles.rowYoyRed
}

function fmt(n: number) {
  return n.toLocaleString()
}

export default function LeftPanel1040({
  selectedField,
  onFieldClick,
  total1a = 124265,
  yoyExpanded = false,
  reviewedFields = new Set(),
  checkedFields = new Set(),
  onToggleChecked,
  issueField,
  onViewSource,
  fieldValues,
  onAddFieldNote,
}: LeftPanel1040Props) {
  // Derived 1040 values — Jordan Wells' return (TY 2025)
  const taxableInterest = fieldValues?.taxableInterest ?? 4535
  const qualifiedDivs   = fieldValues?.qualifiedDivs   ?? 45
  const withholding1040 = fieldValues?.withholding      ?? 19800
  // totalIncome & AGI recalculate from live taxableInterest (other lines are static)
  const totalIncome     = total1a + taxableInterest + 531 + 602 + 4539  // wages + interest + ordDivs + capGain + other
  const taxableIncome   = totalIncome - 14600  // minus standard deduction

  // Popover: which field + the viewport rect of its value cell
  const [popoverField, setPopoverField] = useState<string | null>(null)
  const [popoverRect, setPopoverRect]   = useState<DOMRect | null>(null)
  // Which field row is hovered (for showing the check button)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  // Comment popover
  const [commentField, setCommentField] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentAnchor, setCommentAnchor] = useState<{ top: number; right: number } | null>(null)
  const commentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!commentField) return
    const onDown = (e: MouseEvent) => {
      if (commentRef.current && !commentRef.current.contains(e.target as Node)) {
        setCommentField(null); setCommentDraft(''); setCommentAnchor(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [commentField])

  const openComment1040 = (fieldKey: string, label: string, btn: HTMLElement) => {
    const row = btn.closest('tr') as HTMLElement | null
    const rect = (row ?? btn).getBoundingClientRect()
    setCommentAnchor({ top: rect.top, right: 8 })
    setCommentField(fieldKey)
    setCommentDraft('')
  }

  const postComment1040 = (context: string) => {
    if (!commentDraft.trim()) return
    onAddFieldNote?.(commentDraft.trim(), context)
    setCommentField(null); setCommentDraft(''); setCommentAnchor(null)
  }

  const handleRowClick = (field: string, e: React.MouseEvent<HTMLTableRowElement>) => {
    // If the field is the active issue field, just toggle selection (orange mode)
    if (field === issueField) {
      onFieldClick?.(selectedField === field ? null : field)
      setPopoverField(null)
      return
    }

    // Toggle: clicking the same field closes the popover
    if (field === selectedField) {
      onFieldClick?.(null)
      setPopoverField(null)
      return
    }

    // New field clicked — open blue popover if it has metadata
    onFieldClick?.(field)
    if (FIELD_META[field]) {
      // Get the rect of the value cell (last td in the row)
      const row = e.currentTarget
      const cells = row.querySelectorAll('td')
      const valueCell = cells[cells.length - 1]
      if (valueCell) {
        setPopoverRect(valueCell.getBoundingClientRect())
        setPopoverField(field)
      }
    } else {
      setPopoverField(null)
    }
  }

  // Close popover and deselect field (e.g. X button or outside click)
  const handleClosePopover = () => {
    setPopoverField(null)
    setPopoverRect(null)
    onFieldClick?.(null)
  }

  // Close popover UI only — keep field selected so highlight persists during navigation
  const handleDismissPopoverKeepSelection = () => {
    setPopoverField(null)
    setPopoverRect(null)
    // selectedField intentionally NOT cleared
  }

  /**
   * kind:
   *   'source'  — value comes from imported documents (W-2, 1099, etc.)
   *              → outlined box, subtle blue tint
   *   'calc'    — computed from other lines on this form
   *              → lighter box, italic value
   *   undefined — blank / no value
   */
  const Row = ({
    field,
    line,
    label,
    value,
    kind,
    bold,
    shaded,
    indent,
    subdued,
    owe,
  }: {
    field?: string
    line: string
    label: string
    value?: string | number
    kind?: 'source' | 'calc'
    bold?: boolean
    shaded?: boolean
    indent?: boolean
    subdued?: boolean
    owe?: boolean
  }) => {
    const commentable = !!field && !!onAddFieldNote
    const isIssueHighlight = !!field && field === issueField
    const isSelected       = !!field && selectedField === field
    const isReviewed       = !!field && reviewedFields.has(field)
    const isChecked        = !!field && checkedFields.has(field)
    const isHovered        = !!field && hoveredField === field
    const isPopoverOpen    = !!field && popoverField === field
    const yoy              = field ? YOY[field] : undefined
    const clickable        = !!field
    // Show check button on hover for any field with a value (kind set means it has data)
    const showCheckBtn     = !!field && !!kind && !!value && isHovered

    // Blue selection: selected but NOT the active issue field
    const isBlueSelected   = isSelected && !isIssueHighlight
    // Orange selection: selected AND it's the issue field
    const isOrangeSelected = isSelected && !!isIssueHighlight

    // YoY tint: only when row is selected/hovered via issue interaction (orange mode)
    const showYoyTint = isOrangeSelected

    const rowCls = [
      styles.row,
      bold    ? styles.rowBold    : '',
      shaded  ? styles.rowShaded  : '',
      indent  ? styles.rowIndent  : '',
      subdued ? styles.rowSubdued : '',
      owe     ? styles.rowOwe     : '',
      isOrangeSelected ? styles.rowSelected     : '',
      isBlueSelected   ? styles.rowSelectedBlue : '',
      isReviewed       ? styles.rowReviewed     : '',
      isChecked && !isReviewed ? styles.rowChecked : '',
      showYoyTint      ? rowYoyClass(yoy!)      : '',
      clickable        ? styles.rowClickable    : '',
      commentField === field ? styles.rowCommentOpen : '',
    ].filter(Boolean).join(' ')

    const isCommentOpen = commentField === field
    const valueCellCls = [
      styles.valueBox,
      kind === 'source'   ? styles.valueBoxSource   : '',
      kind === 'calc'     ? styles.valueBoxCalc     : '',
      value === undefined ? styles.valueBoxEmpty    : '',
      isOrangeSelected    ? styles.valueBoxSelected : '',
      isBlueSelected      ? styles.valueBoxSelectedBlue : '',
      isReviewed && !isSelected ? styles.valueBoxReviewed : '',
      isChecked && !isReviewed && !isSelected ? styles.valueBoxChecked : '',
      isCommentOpen && !isSelected ? styles.valueBoxCommentOpen : '',
    ].filter(Boolean).join(' ')

    const valueNumCls = [
      styles.valueNum,
      kind === 'calc'   ? styles.valueNumCalc   : '',
      kind === 'source' ? styles.valueNumSource : '',
      isOrangeSelected  ? styles.valueNumSelected   : '',
      isBlueSelected    ? styles.valueNumSelectedBlue : '',
      isReviewed && !isSelected ? styles.valueNumReviewed : '',
      isChecked && !isReviewed && !isSelected ? styles.valueNumChecked : '',
    ].filter(Boolean).join(' ')

    return (
      <tr
        className={rowCls}
        onClick={clickable ? (e) => handleRowClick(field!, e) : undefined}
        onMouseEnter={field ? () => setHoveredField(field) : undefined}
        onMouseLeave={field ? () => setHoveredField(null) : undefined}
      >
        <td className={styles.cellLine}>{line}</td>
        <td className={styles.cellLabel}>
          <div className={styles.cellLabelInner}>
            {label}
          </div>
        </td>
        <td className={styles.cellLineRight}>{line}</td>
        <td className={styles.cellValue}>
          <div className={styles.cellValueInner}>
            <div className={valueCellCls}>
              {/* Reviewed check icon (AI review) — left side of value box */}
              {isReviewed && (
                <span className={styles.reviewedIcon}><CircleCheck size="small" /></span>
              )}

              {/* The value number */}
              {value !== undefined && (
                <span className={valueNumCls}>
                  {typeof value === 'number' ? fmt(value) : value}
                </span>
              )}

              {/* YoY badge — show on all fields with YoY data */}
              {yoyExpanded && yoy !== undefined && !!field && (
                <span className={`${styles.badge} ${badgeColor(yoy)}`}>
                  {yoy > 0 ? `+${yoy}%` : `${yoy}%`}
                </span>
              )}
            </div>

            {/* Check button — outside value box, shown on hover */}
            {showCheckBtn && !isReviewed && (
              <Tooltip text={isChecked ? 'Unmark as correct' : 'Mark as correct'} placement="top"><button
                className={`${styles.checkBtn} ${isChecked ? styles.checkBtnActive : ''}`}
                aria-label={isChecked ? `Unmark ${field} as verified` : `Mark ${field} as verified`}
                onClick={(e) => { e.stopPropagation(); onToggleChecked?.(field!) }}
              >
                <CircleCheck size="small" />
              </button></Tooltip>
            )}

            {/* Static check icon when checked but not hovered */}
            {isChecked && !isReviewed && !isHovered && (
              <span className={styles.checkedIcon}><CircleCheck size="small" /></span>
            )}

            {/* Comment button — outside value box, shown on hover */}
            {commentable && (isHovered || commentField === field) && (
              <Tooltip text="Add a comment" placement="top"><button
                className={`${styles.commentBtn1040} ${commentField === field ? styles.commentBtn1040Active : ''}`}
                aria-label={`Add comment for ${label}`}
                onClick={e => {
                  e.stopPropagation()
                  if (commentField === field) { setCommentField(null); setCommentDraft(''); setCommentAnchor(null) }
                  else openComment1040(field!, label, e.currentTarget)
                }}
              >
                <Comment size="small" />
              </button></Tooltip>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const Section = ({ title }: { title: string }) => (
    <tr className={styles.sectionHeader}>
      <td />
      <td colSpan={3} className={styles.sectionTitle}>{title}</td>
    </tr>
  )

  const Divider = () => (
    <tr className={styles.dividerRow}>
      <td colSpan={4}><div className={styles.dividerLine} /></td>
    </tr>
  )

  return (
    <div className={styles.leftPanel}>
      <div className={styles.documentViewer}>
        <div className={styles.formDoc}>

          {/* ── IRS Header ── */}
          <div className={styles.irsHeader}>
            <div className={styles.irsLeft}>
              <div className={styles.irsDept}>Department of the Treasury — Internal Revenue Service</div>
              <div className={styles.irsTitle}>Form <strong>1040</strong> U.S. Individual Income Tax Return</div>
            </div>
            <div className={styles.irsRight}>
              <div className={styles.irsYear}>2025</div>
              <div className={styles.irsOmb}>OMB No. 1545-0074</div>
            </div>
          </div>

          {/* ── Taxpayer info ── */}
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <div className={styles.infoField} style={{ flex: 2 }}>
                <span className={styles.infoLabel}>Your first name and middle initial</span>
                <span className={styles.infoValue}>Jessica</span>
              </div>
              <div className={styles.infoField} style={{ flex: 2 }}>
                <span className={styles.infoLabel}>Last name</span>
                <span className={styles.infoValue}>Drake</span>
              </div>
              <div className={styles.infoField}>
                <span className={styles.infoLabel}>Your social security number</span>
                <span className={styles.infoValue}>400-01-4699</span>
              </div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoField} style={{ flex: 3 }}>
                <span className={styles.infoLabel}>Home address</span>
                <span className={styles.infoValue}>333 Easy Street</span>
              </div>
              <div className={styles.infoField}>
                <span className={styles.infoLabel}>City, State, ZIP</span>
                <span className={styles.infoValue}>Middlefield, CA  98756</span>
              </div>
            </div>
          </div>

          {/* ── Filing status ── */}
          <div className={styles.filingStatus}>
            <span className={styles.filingLabel}>Filing Status</span>
            {['Single', 'Married filing jointly', 'Married filing separately', 'Head of household'].map((s, i) => (
              <label key={i} className={styles.filingOption}>
                <input type="radio" readOnly checked={i === 0} onChange={() => {}} /> {s}
              </label>
            ))}
          </div>

          <Divider />

          {/* ── Column headers ── */}
          <div className={styles.colHeaders}>
            <div className={styles.colLine} />
            <div className={styles.colDesc}>Description</div>
            <div className={styles.colLineR} />
            <div className={styles.colVal}>Amount</div>
          </div>

          {/* ── Field legend ── */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.legendSwatchSource}`} />
              From documents
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.legendSwatchCalc}`} />
              Calculated
            </span>
          </div>

          {/* ── Income table ── */}
          <table className={styles.table}>
            <tbody>
              <Section title="Income" />
              <Row field="wages"           line="1a" label="Total amount from Form(s) W-2, box 1"                          kind="source" value={total1a} />
              <Row                         line="1b" label="Household employee wages not reported on Form(s) W-2"          subdued />
              <Row                         line="1c" label="Tip income not reported on line 1a"                            subdued />
              <Row                         line="1d" label="Medicaid waiver payments not reported on Form(s) W-2"          kind="source" value={45} />
              <Row                         line="1z" label="Add lines 1a through 1h"                                       kind="calc"   value={total1a} bold />

              <Row field="taxExemptInterest" line="2a" label="Tax-exempt interest"                                          kind="source" value={234} />
              <Row field="taxableInterest"  line="2b" label="Taxable interest"                                             kind="source" value={taxableInterest} />
              <Row field="qualifiedDivs"   line="3a" label="Qualified dividends"                                           kind="source" value={qualifiedDivs} />
              <Row field="ordinaryDivs"    line="3b" label="Ordinary dividends"                                            kind="source" value={531} />
              <Row field="capitalGain"     line="7"  label="Capital gain or (loss)"                                        kind="source" value={602} />
              <Row field="additionalIncome" line="8" label="Additional income from Schedule 1, line 10"                   kind="source" value={4539} />

              <Divider />
              <Row field="totalIncome"     line="9"  label="Total income. Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7, and 8"   kind="calc"   value={totalIncome} bold />

              <Section title="Adjustments to Income" />
              <Row field="agi"             line="11" label="Adjusted gross income"                                         kind="calc"   value={totalIncome} bold shaded />

              <Section title="Deductions" />
              <Row field="stdDeduction"    line="12" label="Standard deduction or itemized deductions (from Schedule A)"  kind="source" value={14600} />
              <Row                         line="14" label="Add lines 12 and 13"                                           kind="calc"   value={14600} />

              <Divider />
              <Row field="taxableIncome"   line="15" label="Taxable income"                                                kind="calc"   value={taxableIncome} bold shaded />

              <Section title="Tax and Credits" />
              <Row                         line="16" label="Tax (see instructions)"                                        kind="calc"   value={24191} bold />
              <Row                         line="24" label="Total tax"                                                     kind="calc"   value={24191} bold />

              <Section title="Payments" />
              <Row field="withholding"     line="25a" label="Federal income tax withheld from Form(s) W-2"                kind="source" value={withholding1040} />
              <Row                         line="33"  label="Total payments"                                               kind="calc"   value={withholding1040} bold />

              <tr className={styles.oweDividerRow}>
                <td colSpan={4} />
              </tr>
              <Row                         line="37" label="Amount you owe. Subtract line 33 from line 24"                kind="calc"   value={Math.max(0, 24191 - withholding1040)} bold owe />
            </tbody>
          </table>

        </div>
      </div>

      {/* ── Field popover — fixed-positioned so it escapes overflow:hidden ── */}
      {popoverField && popoverRect && (
        <FieldPopover
          fieldName={popoverField}
          anchorRect={popoverRect}
          onClose={handleClosePopover}
          onViewSource={(fieldName, sourceLabel) => {
            // Dismiss the popover UI but keep the field selected so highlight carries through
            handleDismissPopoverKeepSelection()
            onViewSource?.(fieldName, sourceLabel)
          }}
        />
      )}

      {/* ── Comment popover (portal) ── */}
      {commentField && commentAnchor && createPortal(
        <div
          className={styles.commentPopover1040}
          style={{ top: commentAnchor.top - 4, right: commentAnchor.right, transform: 'translateY(-100%)' }}
          ref={commentRef}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.commentPopoverCtx}>
            <span className={styles.commentPopoverChip}>
              Form 1040 · {FIELD_META[commentField]?.label ?? commentField}
            </span>
          </div>
          <textarea
            autoFocus
            className={styles.commentPopoverInput}
            placeholder="Add a comment…"
            value={commentDraft}
            onChange={e => setCommentDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                postComment1040(`Form 1040 · ${FIELD_META[commentField]?.label ?? commentField}`)
            }}
            rows={3}
          />
          <div className={styles.commentPopoverActions}>
            <button className={styles.commentPopoverCancel}
              onClick={e => { e.stopPropagation(); setCommentField(null); setCommentDraft(''); setCommentAnchor(null) }}>
              Cancel
            </button>
            <button
              className={`${styles.commentPopoverPost} ${commentDraft.trim() ? styles.commentPopoverPostActive : ''}`}
              disabled={!commentDraft.trim()}
              onClick={e => {
                e.stopPropagation()
                postComment1040(`Form 1040 · ${FIELD_META[commentField]?.label ?? commentField}`)
              }}
            >
              Post
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
