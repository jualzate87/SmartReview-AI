import ReviewTab from './data-review/ReviewTab'
import DocumentPreview from './data-review/DocumentPreview'
import DetailFields from './data-review/DetailFields'
import w2BingEquipment from '../assets/w2-bing-equipment.png'

export default function DataReviewPopout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ReviewTab isPopout />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid #d5dee3' }}>
          <DocumentPreview imageSrc={w2BingEquipment} alt="W-2 Bing Equipment" />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <DetailFields
            formTitle="Details: Wages, Salaries, Tips (W-2)"
            tabs={[
              { label: 'Bing Equipment', active: true },
              { label: 'Tech circle', active: false },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
