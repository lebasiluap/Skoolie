// Canonical icon key for each topic name.
// Every live topic gets a UNIQUE icon; the same topic shared across
// professions (e.g. CNS in nursing/pharmacy/medicine) shares its icon.
export function topicIconKey(name: string): string {
  const map: Record<string, string> = {
    // Canonical (post-normalization) labels — one icon each
    'Biochemistry & Genetics': 'dna',
    'Cardiovascular System': 'heart',
    'Chemical Pathology': 'microscope',
    'Clinical Pharmacy': 'pill',
    'CNS & Neurology': 'brain',
    'Community Health Nursing': 'people',
    'Dermatology': 'thermometer',
    'Endocrinology': 'flask',
    'Fundamentals of Nursing': 'clipboard',
    'Gastroenterology': 'gi',
    'Haematology': 'blood',
    'Hospital Pharmacy': 'syringe',
    'Immunology': 'shield',
    'Infectious Diseases': 'virus',
    'Maternal, Newborn & Child Health': 'mother',
    'Medical Ethics & Law': 'scale',
    'Medication Administration & Calculations': 'calculator',
    'Mental Health Nursing': 'chatheart',
    'Musculoskeletal System': 'bone',
    'Ophthalmology & ENT': 'eye',
    'Paediatrics': 'baby',
    'Pharmacoepidemiology': 'chart',
    'Pharmacokinetics': 'curve',
    'Professional Practice & Ethics': 'badge',
    'Psychiatry': 'mind',
    'Public Health': 'globe',
    'Renal System': 'kidney',
    'Reproductive System & OB-GYN': 'venus',
    'Respiratory System': 'lung',
    'Surgery': 'scissors',
    'Urology': 'drop',
    // Legacy / variant labels (kept for older saved data)
    'Reproductive System': 'venus',
    'Infectious Disease': 'virus',
    'Microbiology': 'microscope',
    'Malaria': 'virus',
    'Cardiovascular': 'heart',
    'Cardiology': 'heart',
    'Renal': 'kidney',
    'Nephrology': 'kidney',
    'Diabetes': 'flask',
    'Respiratory': 'lung',
    'Neurology': 'brain',
    'Central Nervous System': 'brain',
    'CNS': 'brain',
    'Musculoskeletal': 'bone',
    'Pharmacology': 'pill',
    'Antibiotics': 'pill',
    'Pain Management': 'thermometer',
    'Ophthalmology': 'eye',
    'ENT': 'eye',
  }
  return map[name] ?? 'book'
}

// Canonical identity color per topic icon key
const ICON_PALETTE: Record<string, string> = {
  heart:       '#E25C54',
  lung:        '#2E9BC4',
  kidney:      '#C98A2E',
  blood:       '#C2415A',
  flask:       '#7A6BCC',
  virus:       '#2F9E63',
  microscope:  '#3E8E6E',
  venus:       '#C45C82',
  baby:        '#E08A4A',
  brain:       '#8E6BD0',
  gi:          '#D98C3A',
  bone:        '#6E8AA6',
  pill:        '#0E9E8E',
  thermometer: '#E2674A',
  syringe:     '#2E83A6',
  dna:         '#5C8FD6',
  people:      '#3D9970',
  clipboard:   '#4A90B8',
  shield:      '#3F8F4F',
  mother:      '#D06A8C',
  scale:       '#8A7B4A',
  calculator:  '#597FD1',
  chatheart:   '#C25CA8',
  eye:         '#3AA6B9',
  chart:       '#C07A30',
  curve:       '#4FA3A5',
  badge:       '#7D6E9E',
  mind:        '#9C6ADE',
  globe:       '#2E7DAF',
  scissors:    '#A65C5C',
  drop:        '#D3A429',
  book:        '#6E8AA6',
}

// Returns { color, bgLight } — bgLight is a soft tint suitable for icon badge backgrounds
export function topicColor(name: string): { color: string; bgLight: string } {
  const key = topicIconKey(name)
  const hex = ICON_PALETTE[key] ?? ICON_PALETTE.book
  return { color: hex, bgLight: hex + '26' } // 26 = 15% opacity in hex
}
