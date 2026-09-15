// Dataset descriptions
export const DATASET_DESCRIPTIONS = {
  'MamunHighT2019': 'Small molecules (H, C, N, O, S, CH, CH₂, CH₃, OH, NH, SH) on 2,035 bimetallic alloy surfaces. 37 metals in binary combinations.',
  'FG': 'Large organic molecules with functional groups (alcohols, amines, thiols, aromatics) on metallic surfaces.',
  'ComerGeneralized2024': 'Small molecules on metal oxide surfaces with diverse oxide compositions.',
  'BM': 'Extended large molecules (up to 30 heteroatoms) for biomass conversion, polyurethane synthesis, and plastic recycling on Ni/Ru/Ag/Au/Pt surfaces.',
  'KHLOHC': 'Liquid Organic Hydrogen Carriers - methylcyclohexane (MCH) and toluene on Pt-based alloys for hydrogen storage applications.',
  'Game-Net-Ox': 'C1-C3 organic molecules (alcohols, acids, amines, thiols, aldehydes, ketones) on metal oxide surfaces (IrO₂, RuO₂, TiO₂).',
  'OC20-Dense': 'Densely sampled adsorbate placements from AdsorbML (validation split): 65,073 converged DFT relaxations over 973 adsorbate-surface systems drawn from the OC20 validation set, ~250 each from the in-domain and three out-of-domain subsplits. DFT follows OC20 (VASP, RPBE, no dispersion correction), so models trained on OC20-level data share its level of theory.',
}

// Override source display for specific datasets
export const SOURCE_DISPLAY_OVERRIDE = {
  'FG': 'ioChem-BD',
  'BM': 'ioChem-BD',
  'Game-Net-Ox': 'ioChem-BD',
  'OC20-Dense': 'Open Catalyst (AdsorbML)',
}

// External links for datasets
export const EXTERNAL_LINKS = {
  'MamunHighT2019': 'https://www.catalysis-hub.org/publications/MamunHighT2019',
  'ComerGeneralized2024': 'https://www.catalysis-hub.org/publications/ComerGeneralized2024',
  'FG': 'https://iochem-bd.iciq.es/browse/handle/100/43401',
  'BM': 'https://iochem-bd.iciq.es/browse/handle/100/43401',
  'Game-Net-Ox': 'https://iochem-bd.iciq.es/browse/handle/100/100710',
  'KHLOHC': 'https://zenodo.org/records/17157086',
  'OC20-Dense': 'https://github.com/Open-Catalyst-Project/AdsorbML',
}

// Get display source name
export function getDisplaySource(dataset) {
  return SOURCE_DISPLAY_OVERRIDE[dataset.id] || dataset.source
}
