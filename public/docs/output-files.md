## Parity Plots

![Mono Plot](/images/docs/mono_plot.png)

**Mono** — all reactions combined

![Multi Plot](/images/docs/multi_plot.png)

**Multi** — colored by adsorbate

## Excel Report

The Excel workbook has three sheet types. Example numbers from the paper:

**Main comparison sheet** — one row per MLIP:

| MLIP | Normal (%) | Anomaly (%) | MAE_total (eV) | MAE_normal (eV) | ADwT (%) | AMDwT (%) | Time/step (ms) |
|---|---|---|---|---|---|---|---|
| MLIP_A | 77.25 | 14.39 | 1.118 | 0.316 | 77.98 | 84.71 | 125.3 |
| MLIP_B | 74.22 | 16.84 | 0.667 | 0.512 | 69.66 | 80.80 | 89.7 |
| MLIP_C | 80.18 | 13.51 | 0.917 | 0.241 | 78.97 | 86.79 | 156.8 |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Anomaly breakdown** — counts per anomaly category per MLIP:

| MLIP | Normal | Migration | Energy Anom. | Unphys. Relax | Reprod. Fail |
|---|---|---|---|---|---|
| MLIP_A | 34,869 | 3,774 | 590 | 3,845 | 2,052 |
| MLIP_B | 33,503 | 4,035 | 834 | 5,221 | 1,537 |
| ... | ... | ... | ... | ... | ... |

**Per-MLIP adsorbate sheets** — one sheet per MLIP, one row per adsorbate:

| Adsorbate | Normal | Anomaly | MAE_total (eV) | MAE_normal (eV) | ADwT (%) | AMDwT (%) |
|---|---|---|---|---|---|---|
| H | 1,247 | 89 | 0.891 | 0.234 | 89.3 | 93.4 |
| OH | 1,156 | 124 | 1.045 | 0.298 | 82.7 | 87.1 |
| ... | ... | ... | ... | ... | ... | ... |

## Threshold Sensitivity Charts

![Displacement Threshold Sensitivity](/images/docs/disp_thrs_sensitivity.png)

Displacement threshold

![Bond Length Threshold Sensitivity](/images/docs/bond_threshold_sensitivity.png)

Bond-length change threshold
