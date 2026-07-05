import { createContext, useContext, useState, type ReactNode } from 'react'

export type QSet = 'All' | 'Global' | 'Regional'
export type MCQFilter = { cognitiveType: string; highYield: boolean; difficulty: string; sessionSize: number }
export type FCFilter = { difficulty: 'all' | 'easy' | 'medium' | 'hard'; sessionSize: number; allYears: boolean }
export type CaseFilter = { difficulty: string; sessionSize: number }

interface FiltersCtx {
  qSet: QSet
  setQSet: (v: QSet) => void
  mcqFilter: MCQFilter
  setMcqFilter: React.Dispatch<React.SetStateAction<MCQFilter>>
  fcFilter: FCFilter
  setFcFilter: React.Dispatch<React.SetStateAction<FCFilter>>
  caseFilter: CaseFilter
  setCaseFilter: React.Dispatch<React.SetStateAction<CaseFilter>>
}

const FiltersContext = createContext<FiltersCtx | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [qSet, setQSet] = useState<QSet>('All')
  const [mcqFilter, setMcqFilter] = useState<MCQFilter>({
    cognitiveType: 'all', highYield: false, difficulty: 'all', sessionSize: 10,
  })
  const [fcFilter, setFcFilter] = useState<FCFilter>({
    difficulty: 'all', sessionSize: 10, allYears: false,
  })
  const [caseFilter, setCaseFilter] = useState<CaseFilter>({
    difficulty: 'all', sessionSize: 3,
  })

  return (
    <FiltersContext.Provider
      value={{ qSet, setQSet, mcqFilter, setMcqFilter, fcFilter, setFcFilter, caseFilter, setCaseFilter }}
    >
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters(): FiltersCtx {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider')
  return ctx
}
