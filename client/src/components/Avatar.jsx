const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?'

// The user's profile photo, or their initials when they haven't added one.
export default function Avatar({ user, size = 32, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) }
  if (user.avatar) {
    return <img className={`avatar avatar--photo ${className}`} src={user.avatar} alt="" style={style} />
  }
  return <span className={`avatar ${className}`} style={style} aria-hidden="true">{initialsOf(user.name)}</span>
}
