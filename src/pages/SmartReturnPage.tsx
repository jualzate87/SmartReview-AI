import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CircleCheckFill, NewWindow, Flag, Comment, Document, InboxActivity } from '@design-systems/icons'
import { Button } from '@ids-ts/button'
import '@ids-ts/button/dist/main.css'
import LeftNavPTO from './data-review/LeftNavPTO'
import SmartReturnHeader from './SmartReturnHeader'
import styles from '../styles/SmartReturnPage.module.css'

export default function SmartReturnPage() {
  const navigate = useNavigate()

  // Force #205ea3 blue on IDS buttons for this page regardless of saved theme
  useEffect(() => {
    const el = document.documentElement
    const prevTheme = el.getAttribute('data-theme')
    const prevStyle = el.style.getPropertyValue('--color-action-standard')
    el.setAttribute('data-theme', 'intuit')
    el.style.setProperty('--color-action-standard', '#205ea3')
    el.style.setProperty('--color-action-standard-hover', '#174d87')
    el.style.setProperty('--color-action-standard-active', '#174d87')
    return () => {
      if (prevTheme) el.setAttribute('data-theme', prevTheme)
      el.style.removeProperty('--color-action-standard')
      el.style.removeProperty('--color-action-standard-hover')
      el.style.removeProperty('--color-action-standard-active')
    }
  }, [])

  const handleReviewReturn = () => {
    window.open(`${window.location.origin}${window.location.pathname}#/data-review?agent=true`, '_blank')
  }

  return (
    <div className={styles.page} data-theme="intuit">

      {/* ── Header (Figma node 29815-48823) ── */}
      <SmartReturnHeader activeTab="smartreturn" />

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* Left nav (Figma node 29815-48716) */}
        <LeftNavPTO />

        {/* Main content area */}
        <div className={styles.main}>
          {/* Back breadcrumb */}
          <div className={styles.breadcrumb}>
            <button className={styles.breadcrumbBtn} onClick={() => navigate(-1)}>
              <ArrowLeft size="small" />
              Back to SmartReturn
            </button>
          </div>

          {/* Center card */}
          <div className={styles.card}>
            <CircleCheckFill size="large" className={styles.checkIcon} />
            <h2 className={styles.cardTitle}>The return is ready for review</h2>
            <p className={styles.cardBody}>
              Your review starts in a <strong>new tab</strong>, showing output forms first
            </p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} />
            </div>
            <Button priority="primary" onClick={handleReviewReturn}>
              Review the return <NewWindow size="small" />
            </Button>
            <p className={styles.feedback}>
              How was your import?{' '}
              <button className={styles.feedbackLink}>Share your feedback</button>
            </p>
          </div>
        </div>

        {/* Right sidebar */}
        <div className={styles.sidebar}>
          <button className={styles.sidebarItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#6b6c72" strokeWidth="1.5"/><path d="M8 7h8M8 11h8M8 15h5" stroke="#6b6c72" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span>Tax<br />Organizer</span>
          </button>
          <button className={styles.sidebarItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#6b6c72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Import<br />hub</span>
          </button>
          <button className={styles.sidebarItem}>
            <Document size="small" />
            <span>Documents<br />list</span>
          </button>
          <button className={styles.sidebarItem}>
            <InboxActivity size="small" />
            <span>Client<br />activity</span>
          </button>
          <div className={styles.sidebarDivider} />
          <button className={styles.sidebarItem}>
            <Flag size="small" />
            <span>Flagged<br />items</span>
          </button>
          <button className={styles.sidebarItem}>
            <Comment size="small" />
            <span>Comments</span>
          </button>
        </div>
      </div>
    </div>
  )
}
