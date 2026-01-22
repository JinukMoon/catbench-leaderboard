// Dataset descriptions
export const DATASET_DESCRIPTIONS = {
  'MamunHighT2019': 'Small molecules (H, C, N, O, S, CH, CH₂, CH₃, OH, NH, SH) on 2,035 bimetallic alloy surfaces. 37 metals in binary combinations.',
  'FG': 'Large organic molecules with functional groups (alcohols, amines, thiols, aromatics) on metallic surfaces.',
  'ComerGeneralized2024': 'Small molecules on metal oxide surfaces with diverse oxide compositions.',
  'BM': 'Extended large molecules (up to 30 heteroatoms) for biomass conversion, polyurethane synthesis, and plastic recycling on Ni/Ru/Ag/Au/Pt surfaces.',
  'KHLOHC': 'Liquid Organic Hydrogen Carriers - methylcyclohexane (MCH) and toluene on Pt-based alloys for hydrogen storage applications.',
  'Game-Net-Ox': 'C1-C3 organic molecules (alcohols, acids, amines, thiols, aldehydes, ketones) on metal oxide surfaces (IrO₂, RuO₂, TiO₂).',
}

// Override source display for specific datasets
export const SOURCE_DISPLAY_OVERRIDE = {
  'FG': 'ioChem-BD',
  'BM': 'ioChem-BD',
  'Game-Net-Ox': 'ioChem-BD',
}

// External links for datasets
export const EXTERNAL_LINKS = {
  'MamunHighT2019': 'https://www.catalysis-hub.org/publications/MamunHighT2019',
  'ComerGeneralized2024': 'https://www.catalysis-hub.org/publications/ComerGeneralized2024',
  'FG': 'https://iochem-bd.iciq.es/browse/handle/100/43401',
  'BM': 'https://iochem-bd.iciq.es/browse/handle/100/43401',
  'Game-Net-Ox': 'https://iochem-bd.iciq.es/browse/handle/100/100710',
  'KHLOHC': 'https://zenodo.org/records/17157086',
}

// Get display source name
export function getDisplaySource(dataset) {
  return SOURCE_DISPLAY_OVERRIDE[dataset.id] || dataset.source
}
