import { createContext, useContext } from 'react'

// confirm({ title, message, confirmLabel, tone, image }) resolves to true or false.
export const ConfirmContext = createContext(async () => true)

export const useConfirm = () => useContext(ConfirmContext)
