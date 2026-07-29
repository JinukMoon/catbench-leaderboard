Options are grouped into **Required**, **Commonly tuned**, and **Advanced**. Required parameters must be passed at construction; the rest have sensible defaults and can be overridden as needed.

## Required

| Parameter | Description | Type |
|---|---|---|
| `mlip_name` | Free-form label. Used as the folder name under `result/` and as the display name in plots and Excel sheets. | str |
| `benchmark` | Dataset name; matches `raw_data/{benchmark}_adsorption.json`. | str |

## Commonly Tuned

| Parameter | Description | Default |
|---|---|---|
| `save_files` | If False, skips trajectory + log files to save disk space. | True |
| `f_crit_relax` | Force convergence criterion (eV/A). | 0.05 |
| `n_crit_relax` | Max optimization steps per structure. | 999 |
| `mode` | `"basic"` (relaxation + references) or `"oc20"` (direct E_ads prediction). | "basic" |

## Advanced

| Parameter | Description | Default |
|---|---|---|
| `damping` | Optimization damping factor. | 1.0 |
| `structure_cache` | Reuse a relaxed clean-slab result across frame-equivalent slabs (and gas references) — large GPU savings on datasets with shared slabs (v1.1.1+). | True |
| `optimizer` | ASE optimizer: LBFGS / LBFGSLineSearch / BFGS / BFGSLineSearch / GPMin / MDMin / FIRE. | "LBFGS" |
| `save_step` | Save interval for `result.json` during long runs. | 50 |
| `chemical_bond_cutoff` | Cutoff distance for bond-change detection (A). | 6.0 |
