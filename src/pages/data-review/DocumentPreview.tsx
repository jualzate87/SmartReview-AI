import { useState } from 'react'
import { ZoomOut, ZoomIn } from '@design-systems/icons'
import styles from '../../styles/data-review/DocumentPreview.module.css'

type DocType = 'w2' | '1099-int' | '1099-div' | 'k1'

interface FieldOverlay {
  left: string; top: string; width: string; height: string
}

// Overlay positions (%) for each 1040 field on each document image
// Positions measured against the actual PNG dimensions
// Overlay positions — measured via pixel-level border scan on each PNG
// W-2: 2284×1540px  |  1099-INT: 1146×762px
// W-2:  Box 1 cell x=1240–1725, Box 2 cell x=1725–2212, wages/withholding row y=68–188
//        Box 12a row x=1240–2212, y=681–779
// 1099-INT: value column x=542–942; row 1 y=55–197; EW row y=197–269
const OVERLAYS: Record<DocType, Partial<Record<string, FieldOverlay>>> = {
  'w2': {
    // Box 1  "1 Wages, tips / 60,000"        x=1240–1725, y=68–188
    wages:       { left: '54.3%', top: '4.4%',  width: '21.2%', height: '7.8%' },
    // Box 2  "2 Federal income tax / 10,000"  x=1725–2212, y=68–188
    withholding: { left: '75.5%', top: '4.4%',  width: '21.3%', height: '7.8%' },
    // Box 12a "D / 5000"  x=1240–2212, y=681–779 (full 12a row)
    box12:       { left: '54.3%', top: '44.2%', width: '42.6%', height: '6.4%' },
  },
  '1099-int': {
    // Box 1  "1 Interest income / 3500"  x=542–942, y=55–197
    taxableInterest: { left: '47.3%', top: '7.2%',  width: '34.9%', height: '18.6%' },
    // Box 2  "2 Early withdrawal / 0"    x=542–942, y=197–269
    earlyWithdrawal: { left: '47.3%', top: '25.9%', width: '34.9%', height:  '9.4%' },
  },
  // No 1099-DIV image yet — overlays suppressed to avoid mismatch
  '1099-div': {},
  'k1': {},
}

interface DocumentPreviewProps {
  imageSrc: string
  alt: string
  selectedField?: string | null
  highlightMode?: 'orange' | 'blue'
  docType?: DocType
}

const ZOOM_LEVELS = [50, 60, 65, 70, 75, 85, 100, 125, 150, 200]

export default function DocumentPreview({ imageSrc, alt, selectedField, highlightMode = 'blue', docType = 'w2' }: DocumentPreviewProps) {
  const [zoomIndex, setZoomIndex] = useState(5) // default 85%
  const zoom = ZOOM_LEVELS[zoomIndex]

  const zoomOut = () => setZoomIndex(i => Math.max(0, i - 1))
  const zoomIn  = () => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))

  // Find if there's an overlay for the currently selected field on this doc type
  const overlay = selectedField ? OVERLAYS[docType]?.[selectedField] : undefined

  return (
    <div className={styles.container}>
      {/* Scrollable image area */}
      <div className={styles.imageArea}>
        <div style={{ position: 'relative', width: `${zoom}%`, lineHeight: 0, flexShrink: 0 }}>
          <img
            src={imageSrc}
            alt={alt}
            className={styles.documentImage}
          />

          {/* Field highlight overlay — orange for issue mode, blue for generic */}
          {overlay && (
            <div
              style={{
                position: 'absolute',
                left:   overlay.left,
                top:    overlay.top,
                width:  overlay.width,
                height: overlay.height,
                background: highlightMode === 'orange'
                  ? 'rgba(201, 80, 15, 0.08)'
                  : 'rgba(32, 94, 163, 0.08)',
                border: highlightMode === 'orange'
                  ? '2px solid #c9500f'
                  : '2px solid #205ea3',
                borderRadius: '2px',
                pointerEvents: 'none',
                zIndex: 3,
                transition: 'opacity 200ms ease',
              }}
            />
          )}
        </div>
      </div>

      {/* Zoom toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarControls}>
          <span className={styles.zoomLevel}>{zoom}%</span>
          <button
            className={styles.toolbarBtn}
            aria-label="Zoom out"
            onClick={zoomOut}
            disabled={zoomIndex === 0}
          >
            <ZoomOut size="medium" />
          </button>
          <button
            className={styles.toolbarBtn}
            aria-label="Zoom in"
            onClick={zoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          >
            <ZoomIn size="medium" />
          </button>
        </div>
      </div>
    </div>
  )
}
