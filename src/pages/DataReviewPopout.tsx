import { useState } from 'react'
import ReviewTab from './data-review/ReviewTab'
import type { TopTab } from './data-review/ReviewTab'
import DocumentPreview from './data-review/DocumentPreview'
import DetailFields from './data-review/DetailFields'
import w2BingEquipment from '../assets/w2-bing-equipment.png'
import w2TechCircle from '../assets/w2-tech-circle.png'
import img1099Int from '../assets/1099-int-megabank.png'
import img1099Div from '../assets/1099-div-citigroup.png'
import imgK1 from '../assets/k1-easy-money.png'
import img1040Preview from '../assets/1040-2024-preview.png'

export default function DataReviewPopout() {
  const [activeTopTab, setActiveTopTab] = useState<TopTab>('w2s')
  const [activeSubTab, setActiveSubTab] = useState<'bingEquipment' | 'techCircle'>('bingEquipment')

  const imageSrc =
    activeTopTab === '1099-ints'  ? img1099Int :
    activeTopTab === '1099-divs'  ? img1099Div :
    activeTopTab === 'k1'         ? imgK1 :
    activeTopTab === 'prior-1040' ? img1040Preview :
    activeSubTab === 'techCircle' ? w2TechCircle : w2BingEquipment

  const imageAlt =
    activeTopTab === '1099-ints'  ? '1099-INT MegaBank' :
    activeTopTab === '1099-divs'  ? '1099-DIV Citigroup' :
    activeTopTab === 'k1'         ? 'K-1 Easy Money Ltd' :
    activeTopTab === 'prior-1040' ? 'Prior Year 1040' :
    activeSubTab === 'techCircle' ? 'W-2 Tech Circle' : 'W-2 Bing Equipment'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ReviewTab
        isPopout
        activeTopTab={activeTopTab}
        onTopTabChange={(tab) => { setActiveTopTab(tab); setActiveSubTab('bingEquipment') }}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid #d5dee3' }}>
          <DocumentPreview
            imageSrc={imageSrc}
            alt={imageAlt}
            docType={
              activeTopTab === '1099-ints' ? '1099-int' :
              activeTopTab === '1099-divs' ? '1099-div' :
              activeTopTab === 'k1'        ? 'k1' : 'w2'
            }
          />
        </div>
        {activeTopTab === 'w2s' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DetailFields
              formTitle="Details: Wages, Salaries, Tips (W-2)"
              tabs={[
                { label: 'Bing Equipment', active: activeSubTab === 'bingEquipment' },
                { label: 'Tech Circle',    active: activeSubTab === 'techCircle'    },
              ]}
              activeSubTab={activeSubTab}
              onSubTabChange={(tab) => setActiveSubTab(tab === 'techCircle' ? 'techCircle' : 'bingEquipment')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
