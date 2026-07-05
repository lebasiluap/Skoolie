// Canonical icon key for each topic name
export function topicIconKey(name: string): string {
  const map: Record<string, string> = {
    // Canonical (post-normalization) labels
    'Reproductive System & OB-GYN': 'venus',
    'Renal System': 'kidney',
    'Respiratory System': 'lung',
    'CNS & Neurology': 'brain',
    'Musculoskeletal System': 'bone',
    'Biochemistry & Genetics': 'microscope',
    // Legacy / variant labels (kept for older saved data)
    'Reproductive System': 'venus',
    'Paediatrics': 'baby',
    'Infectious Diseases': 'virus',
    'Infectious Disease': 'virus',
    'Microbiology': 'microscope',
    'Malaria': 'microscope',
    'Chemical Pathology': 'microscope',
    'Cardiovascular System': 'heart',
    'Cardiovascular': 'heart',
    'Cardiology': 'heart',
    'Renal': 'kidney',
    'Nephrology': 'kidney',
    'Haematology': 'blood',
    'Endocrinology': 'flask',
    'Diabetes': 'flask',
    'Respiratory': 'lung',
    'Neurology': 'brain',
    'Central Nervous System': 'brain',
    'CNS': 'brain',
    'Gastroenterology': 'gi',
    'Musculoskeletal': 'bone',
    'Pharmacology': 'pill',
    'Clinical Pharmacy': 'pill',
    'Antibiotics': 'pill',
    'Pharmacokinetics': 'pill',
    'Hospital Pharmacy': 'syringe',
    'Pain Management': 'thermometer',
    'Immunology': 'virus',
    'Dermatology': 'thermometer',
    'Surgery': 'syringe',
    'Urology': 'kidney',
    'Ophthalmology': 'book',
    'ENT': 'book',
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
  book:        '#6E8AA6',
}

// Returns { color, bgLight } — bgLight is a soft tint suitable for icon badge backgrounds
export function topicColor(name: string): { color: string; bgLight: string } {
  const key = topicIconKey(name)
  const hex = ICON_PALETTE[key] ?? ICON_PALETTE.book
  return { color: hex, bgLight: hex + '26' } // 26 = 15% opacity in hex
}
