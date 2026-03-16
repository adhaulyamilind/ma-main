export function Tabs({ active, onChange }) {
  return (
    <div className="tabs">
      <button
        type="button"
        className={active === 'upload' ? 'tab active' : 'tab'}
        onClick={() => onChange('upload')}
      >
        Upload
      </button>
      <button
        type="button"
        className={active === 'dashboard' ? 'tab active' : 'tab'}
        onClick={() => onChange('dashboard')}
      >
        Upload history
      </button>
      <button
        type="button"
        className={active === 'analytics' ? 'tab active' : 'tab'}
        onClick={() => onChange('analytics')}
      >
        Analytics
      </button>
    </div>
  )
}

