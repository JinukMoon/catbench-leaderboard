## Option A: `get_benchmark` (Recommended)

`get_benchmark(name)` fetches a dataset from the best available source automatically, so you can request any benchmark by name without knowing where it lives:

```python
from catbench.adsorption import get_benchmark, list_zenodo_benchmarks

get_benchmark("MamunHighT2019")   # writes raw_data/MamunHighT2019_adsorption.json
```

It resolves each name through three sources in order:

1. **Zenodo** — the featured datasets below, citable with a DOI ([concept DOI: 10.5281/zenodo.17157085](https://doi.org/10.5281/zenodo.17157085), always resolves to the latest version).
2. **CatBench leaderboard** (`catbench.org`) — every dataset on the leaderboard, gzip-compressed for a fast download.
3. **CatHub** — direct download + preprocessing for anything not hosted above.

**Featured datasets (hosted on Zenodo):**

| Benchmark | Size | Description |
|---|---|---|
| OC20-Dense           | 397 MB | 65,073 dense adsorption configurations (Open Catalyst 2020) |
| MamunHighT2019       | 95 MB  | 45,130 small-molecule adsorptions on 2,035 bimetallic alloys |
| GameNetOx_oxide      | 11 MB  | 987 adsorptions on metal-oxide surfaces |
| FG_dataset           | 9 MB   | 2,651 C1–C10 organic molecules on transition metals |
| KHLOHC_origin        | 6 MB   | Liquid organic hydrogen carrier adsorption (fine-tuning) |
| ComerGeneralized2024 | 1 MB   | 325 adsorptions on metal oxide surfaces |
| BM_dataset           | 0.3 MB | 32 industrial large molecules (biomass, polyurethane, plastics) |

```python
list_zenodo_benchmarks()   # the featured names currently on Zenodo
```

For explicit control, the source-specific functions still work directly: `zenodo_download(name)` (Zenodo only) and `cathub_preprocessing(name)` (CatHub only).

## Option B: CatHub Database

`get_benchmark` already falls back to CatHub automatically; call it directly to force a fresh CatHub download + preprocess:

```python
from catbench.adsorption import cathub_preprocessing

cathub_preprocessing("MamunHighT2019")
```

Downloads are deterministic (stable `order: "id"` pagination + id-based dedup) and **fixed-atom constraints are handled automatically**: CatHub's deposited `constraints` are kept as-is, and for datasets where CatHub omits them the fixed set is **inferred from geometry** (clean slab vs adslab — atoms that do not move were held fixed) and injected as `FixAtoms`. A genuinely unconstrained slab is left free. So every preprocessed dataset is self-describing and runs correctly out of the box.

**Combining datasets and unifying adsorbate names.** Pass a list of benchmarks to process them together, and an optional `adsorbate_integration` map to merge inconsistent adsorbate labels (e.g. `HO` → `OH`) into a single name:

```python
cathub_preprocessing(
    ["MamunHighT2019", "AraComputational2022"],
    adsorbate_integration={"HO": "OH", "O2H": "OOH"},
)
```

## Option C: User VASP Data

> **Note:** Fixed-atom constraints are taken from the data automatically — your VASP Selective-Dynamics (T/F) flags are read into `FixAtoms` on the CONTCAR and applied during relaxation.

> **Warning:** `vasp_preprocessing` deletes every file except `CONTCAR` and `OSZICAR` to save disk space. Always run it on a copy of your original VASP output.

Organize the data as follows. `gas`, `slab`, and the `<name>gas` pattern are reserved; everything else is arbitrary:

```
your_dataset_name/
├── gas/
│   ├── H2gas/     { CONTCAR, OSZICAR }    # gas-reference folder, must end with "gas"
│   └── H2Ogas/    { CONTCAR, OSZICAR }
├── system_A/
│   ├── slab/      { CONTCAR, OSZICAR }    # reserved name (clean surface)
│   ├── H/
│   │   ├── site_0/  { CONTCAR, OSZICAR }  # any name for site variants
│   │   └── site_1/  { CONTCAR, OSZICAR }
│   └── OH/
│       └── ...
└── system_B/
    └── ...
```

Declare the reaction stoichiometry and preprocess:

```python
from catbench.adsorption import vasp_preprocessing

coeff_setting = {
    "H":  {"slab": -1, "adslab": 1, "H2gas": -1/2},
    "OH": {"slab": -1, "adslab": 1, "H2gas": +1/2, "H2Ogas": -1},
}
vasp_preprocessing("your_dataset_name", coeff_setting)
# → raw_data/your_dataset_name_adsorption.json
```

The keys `"slab"` and `"adslab"` are required literals on every entry; all other keys are gas-phase references and must end with `"gas"`. `vasp_preprocessing` validates these rules before deleting anything.
