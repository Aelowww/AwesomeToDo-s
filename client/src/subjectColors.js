import { createContext, useContext } from 'react'
import { subjectColor } from './utils'

// Maps a subject name to the color of the class with that name, if there is one.
export const SubjectColorContext = createContext({})

export const useSubjectColor = () => {
  const classColors = useContext(SubjectColorContext)
  return (subject) => classColors[subject.toLowerCase()] ?? subjectColor(subject)
}
