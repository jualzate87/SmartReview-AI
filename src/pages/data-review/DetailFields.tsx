import { useEffect, useRef, useState } from 'react'
import SubTab from './SubTab'
import Tooltip from './Tooltip'
import styles from '../../styles/data-review/DetailFields.module.css'

type FieldValuesKey = 'withholding' | 'box12' | 'taxableInterest' | 'qualifiedDivs'

interface DetailFieldsProps {
  formTitle: string
  tabs: { label: string; active: boolean }[]
  selectedField?: string | null
  highlightMode?: 'orange' | 'blue'
  onFieldSelect?: (field: string | null) => void
  activeSubTab?: 'bingEquipment' | 'techCircle'
  onSubTabChange?: (tab: string) => void
  wages?: { bingEquipment: number; techCircle: number }
  onWageChange?: (employer: string, value: number) => void
  fieldValues?: { withholding: number; box12: number; taxableInterest: number; qualifiedDivs: number }
  onFieldValueChange?: (key: FieldValuesKey, value: number) => void
  onMarkReviewed?: (field: string) => void
  reviewedFields?: Map<string, { by: string; at: string }>
}

// Static non-wages fields per employer
const EMPLOYER_DATA = {
  bingEquipment: {
    id: '12-3456789',
    name: 'Bing Equipment',
    street: '3833 Soundtech Ct SE',
    city: 'Kentwood', state: 'CA', zip: '93004',
    federalTax: '10,000',
    socialSecurityWages: '60,000', ssTax: '3,720',
    medicareWages: '60,000', medicareTax: '870',
    ssTips: '25', allocatedTips: '0',
    dependentCare: '25', nonqualified: '39',
    box12Code: '' as string, box12Amount: '' as string,
  },
  techCircle: {
    id: '12-3456789',
    name: 'Tech circle',
    street: '321 Main Orchard Dr',
    city: 'Reno', state: 'NV', zip: '95010',
    federalTax: '5,987',
    socialSecurityWages: '64,304', ssTax: '3,720',
    medicareWages: '64,304', medicareTax: '1000',
    ssTips: '25', allocatedTips: '0',
    dependentCare: '25', nonqualified: '39',
    box12Code: 'D', box12Amount: '5,000',
  },
}

export default function DetailFields({
  formTitle,
  tabs,
  selectedField,
  highlightMode = 'blue',
  onFieldSelect,
  activeSubTab = 'bingEquipment',
  onSubTabChange,
  wages = { bingEquipment: 60000, techCircle: 64304 },
  onWageChange,
  fieldValues,
  onFieldValueChange,
  onMarkReviewed,
  reviewedFields,
}: DetailFieldsProps) {
  const employer = EMPLOYER_DATA[activeSubTab]
  const currentWages = wages[activeSubTab]
  const highlightedRef = useRef<HTMLDivElement>(null)
  const withholdingRef = useRef<HTMLDivElement>(null)
  const box12Ref = useRef<HTMLDivElement>(null)

  // Track which field is in edit mode, its draft value, and original for undo
  const [editingField, setEditingField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [originalValue, setOriginalValue] = useState('')
  const [savedField, setSavedField] = useState<string | null>(null)
  // Persistent set of fields that have been edited this session
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    const ref =
      selectedField === 'withholding' ? withholdingRef :
      selectedField === 'box12'       ? box12Ref       :
      highlightedRef
    if (selectedField && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedField])

  // Exit edit mode when a different field is selected
  useEffect(() => {
    if (editingField && selectedField !== editingField) {
      setEditingField(null)
    }
  }, [selectedField, editingField])

  const startEdit = (field: string, currentValue: string) => {
    const clean = currentValue.replace(/,/g, '')
    setEditingField(field)
    setDraftValue(clean)
    setOriginalValue(clean)
  }

  const commitEdit = (field: FieldValuesKey) => {
    const num = parseFloat(draftValue.replace(/,/g, '')) || 0
    onFieldValueChange?.(field, num)
    setEditingField(null)
    setEditedFields(prev => new Set(prev).add(field))
    setSavedField(field)
    setTimeout(() => setSavedField(null), 3500)
  }

  const commitWagesEdit = () => {
    const num = parseFloat(draftValue.replace(/,/g, '')) || 0
    onWageChange?.(activeSubTab, num)
    setEditingField(null)
    setEditedFields(prev => new Set(prev).add(`wages-${activeSubTab}`))
    setSavedField('wages')
    setTimeout(() => setSavedField(null), 3500)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setDraftValue('')
    setOriginalValue('')
  }

  return (
    <div className={styles.container}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>{formTitle}</h2>
        <SubTab
          tabs={tabs.map(t => ({ label: t.label }))}
          activeIndex={tabs.findIndex(t => t.active)}
          onTabChange={(i) => {
            const tab = tabs[i]
            if (tab) onSubTabChange?.(i === 0 ? 'bingEquipment' : 'techCircle')
          }}
        />
      </div>

      {/* Scrollable input fields */}
      <div className={styles.inputContainer}>
        {/* Employer Information section */}
        <div className={styles.sectionHeader}>
          Employer Information (MANDATORY for e-file)
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(b) Employer identification number</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.id} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(c) Name of employer</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputWide}`} readOnly value={employer.name} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Street address</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputWide}`} readOnly value={employer.street} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>City / State / ZIP code</span>
          <div className={styles.addressRow}>
            <input className={`${styles.fieldInput} ${styles.addressCity}`} readOnly value={employer.city} />
            <input className={`${styles.fieldInput} ${styles.addressState}`} readOnly value={employer.state} />
            <input className={`${styles.fieldInput} ${styles.addressZip}`} readOnly value={employer.zip} />
          </div>
        </div>

        {/* Wages section — same grey header as Employer Information */}
        <div className={styles.sectionHeader}>Wages</div>

        {/* (1) Wages — editable, drives 1040 line 1a */}
        <div
          ref={selectedField === 'wages' ? highlightedRef : undefined}
          className={`${styles.fieldRow} ${selectedField === 'wages' ? (highlightMode === 'orange' ? styles.fieldRowHighlightedOrange : styles.fieldRowHighlighted) : ''}`}
          onClick={() => onFieldSelect?.(selectedField === 'wages' ? null : 'wages')}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.fieldLabel}>(1) Wages, tips, etc.</span>
          <input
            className={`${styles.fieldInput} ${styles.fieldInputSmall} ${editingField === 'wages' ? styles.fieldInputEditing : selectedField === 'wages' ? (highlightMode === 'orange' ? styles.fieldInputHighlightedOrange : styles.fieldInputHighlighted) : ''}`}
            readOnly={editingField !== 'wages'}
            value={editingField === 'wages' ? draftValue : currentWages.toLocaleString()}
            onChange={e => setDraftValue(e.target.value)}
            autoFocus={editingField === 'wages'}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitWagesEdit() }
              if (e.key === 'Escape') cancelEdit()
            }}
            onClick={e => e.stopPropagation()}
          />
          {selectedField === 'wages' && editingField !== 'wages' && !reviewedFields?.has(`wages-${activeSubTab}`) && (
            <>
              <button className={styles.editBtn} onClick={e => { e.stopPropagation(); startEdit('wages', currentWages.toString()) }}>Edit</button>
              <button className={styles.markCorrectBtn} onClick={e => { e.stopPropagation(); onMarkReviewed?.(`wages-${activeSubTab}`); onFieldSelect?.(null) }}>Mark as correct</button>
            </>
          )}
          {selectedField === 'wages' && editingField !== 'wages' && reviewedFields?.has(`wages-${activeSubTab}`) && (
            <span className={styles.reviewedBadge}>✓ Reviewed</span>
          )}
          {editingField === 'wages' && (
            <div className={styles.editActions} onClick={e => e.stopPropagation()}>
              <button className={styles.saveBtn} onClick={commitWagesEdit}>Save</button>
              <button className={styles.undoBtn} onClick={cancelEdit}>Undo</button>
            </div>
          )}
          {savedField === 'wages' && <span className={styles.recalcBadge}>1040 updated</span>}
          {editedFields.has(`wages-${activeSubTab}`) && savedField !== 'wages' && <span className={styles.editedBadge}>Edited</span>}
        </div>

        <div
          ref={withholdingRef}
          className={`${styles.fieldRow} ${selectedField === 'withholding' ? (highlightMode === 'orange' ? styles.fieldRowHighlightedOrange : styles.fieldRowHighlighted) : ''}`}
          onClick={() => onFieldSelect?.(selectedField === 'withholding' ? null : 'withholding')}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.fieldLabel}>(2) Federal income tax withheld</span>
          <input
            className={`${styles.fieldInput} ${styles.fieldInputSmall} ${editingField === 'withholding' ? styles.fieldInputEditing : selectedField === 'withholding' ? (highlightMode === 'orange' ? styles.fieldInputHighlightedOrange : styles.fieldInputHighlighted) : ''}`}
            readOnly={editingField !== 'withholding'}
            value={editingField === 'withholding' ? draftValue : (fieldValues?.withholding !== undefined ? fieldValues.withholding.toLocaleString() : employer.federalTax)}
            onChange={e => setDraftValue(e.target.value)}
            autoFocus={editingField === 'withholding'}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit('withholding') } if (e.key === 'Escape') cancelEdit() }}
            onClick={e => e.stopPropagation()}
          />
          {selectedField === 'withholding' && editingField !== 'withholding' && !reviewedFields?.has('withholding') && (
            <>
              <button className={styles.editBtn} onClick={e => { e.stopPropagation(); startEdit('withholding', fieldValues?.withholding?.toString() ?? employer.federalTax) }}>Edit</button>
              <button className={styles.markCorrectBtn} onClick={e => { e.stopPropagation(); onMarkReviewed?.('withholding'); onFieldSelect?.(null) }}>Mark as correct</button>
            </>
          )}
          {selectedField === 'withholding' && editingField !== 'withholding' && reviewedFields?.has('withholding') && (
            <span className={styles.reviewedBadge}>✓ Reviewed</span>
          )}
          {editingField === 'withholding' && (
            <div className={styles.editActions} onClick={e => e.stopPropagation()}>
              <button className={styles.saveBtn} onClick={() => commitEdit('withholding')}>Save</button>
              <button className={styles.undoBtn} onClick={cancelEdit}>Undo</button>
            </div>
          )}
          {savedField === 'withholding' && <span className={styles.recalcBadge}>1040 updated</span>}
          {editedFields.has('withholding') && savedField !== 'withholding' && <span className={styles.editedBadge}>Edited</span>}
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(3) Social security wages</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.socialSecurityWages} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(4) Social security tax withheld</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.ssTax} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(5) Medicare wages and tips</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.medicareWages} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(6) Medicare tax withheld</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.medicareTax} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(7) Social security tips</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.ssTips} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(8) Allocated tips</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.allocatedTips} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(10) Dependent care benefits</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.dependentCare} />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>(11) Nonqualified plans</span>
          <input className={`${styles.fieldInput} ${styles.fieldInputSmall}`} readOnly value={employer.nonqualified} />
        </div>
        <div
          ref={box12Ref}
          className={`${styles.fieldRow} ${selectedField === 'box12' ? (highlightMode === 'orange' ? styles.fieldRowHighlightedOrange : styles.fieldRowHighlighted) : ''}`}
          onClick={() => onFieldSelect?.(selectedField === 'box12' ? null : 'box12')}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.fieldLabel}>(12) Code {employer.box12Code || '—'} — 401(k) deferral</span>
          <input
            className={`${styles.fieldInput} ${styles.fieldInputSmall} ${editingField === 'box12' ? styles.fieldInputEditing : selectedField === 'box12' ? (highlightMode === 'orange' ? styles.fieldInputHighlightedOrange : styles.fieldInputHighlighted) : ''}`}
            readOnly={editingField !== 'box12'}
            value={editingField === 'box12' ? draftValue : (fieldValues?.box12 !== undefined && employer.box12Amount ? fieldValues.box12.toLocaleString() : (employer.box12Amount || '—'))}
            onChange={e => setDraftValue(e.target.value)}
            autoFocus={editingField === 'box12'}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit('box12') } if (e.key === 'Escape') cancelEdit() }}
            onClick={e => e.stopPropagation()}
          />
          {selectedField === 'box12' && editingField !== 'box12' && employer.box12Amount && !reviewedFields?.has('box12') && (
            <>
              <button className={styles.editBtn} onClick={e => { e.stopPropagation(); startEdit('box12', fieldValues?.box12?.toString() ?? employer.box12Amount) }}>Edit</button>
              <button className={styles.markCorrectBtn} onClick={e => { e.stopPropagation(); onMarkReviewed?.('box12'); onFieldSelect?.(null) }}>Mark as correct</button>
            </>
          )}
          {selectedField === 'box12' && editingField !== 'box12' && employer.box12Amount && reviewedFields?.has('box12') && (
            <span className={styles.reviewedBadge}>✓ Reviewed</span>
          )}
          {editingField === 'box12' && (
            <div className={styles.editActions} onClick={e => e.stopPropagation()}>
              <button className={styles.saveBtn} onClick={() => commitEdit('box12')}>Save</button>
              <button className={styles.undoBtn} onClick={cancelEdit}>Undo</button>
            </div>
          )}
          {savedField === 'box12' && <span className={styles.recalcBadge}>1040 updated</span>}
          {editedFields.has('box12') && savedField !== 'box12' && <span className={styles.editedBadge}>Edited</span>}
        </div>
      </div>
    </div>
  )
}
