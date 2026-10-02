import Icon from './Icon'

// Segmented switch between related views, e.g. Tasks: List | Calendar.
export default function SubTabs({ items, page, onNavigate, label }) {
  const activeIndex = Math.max(0, items.findIndex((item) => item.page === page))
  return (
    <div className="subtabs" role="tablist" aria-label={label} style={{ '--count': items.length, '--index': activeIndex }}>
      <span className="subtabs__indicator" aria-hidden="true" />
      {items.map((item) => (
        <button
          key={item.page}
          type="button"
          role="tab"
          aria-selected={item.page === page}
          className={item.page === page ? 'is-active' : ''}
          onClick={() => onNavigate(item.page)}
        >
          <Icon name={item.icon} size={16} />
          {item.label}
        </button>
      ))}
    </div>
  )
}
