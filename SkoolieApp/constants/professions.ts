export const YEARS_BY_PROFESSION: Record<string, { id: string; label: string }[]> = {
  medicine: [
    { id: 'year1', label: 'Year 1' },
    { id: 'year2', label: 'Year 2' },
    { id: 'year3', label: 'Year 3' },
    { id: 'year4', label: 'Year 4' },
    { id: 'year5', label: 'Year 5' },
    { id: 'year6', label: 'Year 6' },
    { id: 'practitioner', label: 'Practitioner' },
  ],
  pharmacy: [
    { id: 'year1', label: 'Year 1' },
    { id: 'year2', label: 'Year 2' },
    { id: 'year3', label: 'Year 3' },
    { id: 'year4', label: 'Year 4' },
    { id: 'year5', label: 'Year 5' },
    { id: 'year6', label: 'Year 6' },
    { id: 'practitioner', label: 'Practitioner' },
  ],
  nursing: [
    { id: 'year1', label: 'Year 1' },
    { id: 'year2', label: 'Year 2' },
    { id: 'year3', label: 'Year 3' },
    { id: 'year4', label: 'Year 4' },
    { id: 'practitioner', label: 'Practitioner' },
  ],
  dentistry: [
    { id: 'year1', label: 'Year 1' },
    { id: 'year2', label: 'Year 2' },
    { id: 'year3', label: 'Year 3' },
    { id: 'year4', label: 'Year 4' },
    { id: 'year5', label: 'Year 5' },
    { id: 'year6', label: 'Year 6' },
    { id: 'practitioner', label: 'Practitioner' },
  ],
  midwifery: [
    { id: 'year1', label: 'Year 1' },
    { id: 'year2', label: 'Year 2' },
    { id: 'year3', label: 'Year 3' },
    { id: 'year4', label: 'Year 4' },
    { id: 'practitioner', label: 'Practitioner' },
  ],
}

// Fallback for any unrecognised profession
export const DEFAULT_YEARS = [
  { id: 'year1', label: 'Year 1' },
  { id: 'year2', label: 'Year 2' },
  { id: 'year3', label: 'Year 3' },
  { id: 'year4', label: 'Year 4' },
  { id: 'practitioner', label: 'Practitioner' },
]

export const PRACTITIONER_TITLES: Record<string, string> = {
  medicine: 'Dr.',
  dentistry: 'Dr.',
  pharmacy: 'Pharm.',
  nursing: 'RN',
  midwifery: 'RM',
}
