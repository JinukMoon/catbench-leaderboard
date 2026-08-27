```python
from catbench.adsorption import AdsorptionAnalysis

AdsorptionAnalysis().analysis()    # auto-detects every MLIP under ./result/
```

This produces:

- **Parity plots** under `./plot/<mlip_name>/{mono,multi}/` — `mono/total.png` aggregates all reactions; `multi/total.png` colors by adsorbate.
- **Excel report** `./{cwd_name}_Benchmarking_Analysis.xlsx` with MAE, RMSE, anomaly breakdown, ADwT, AMDwT, and timings across every MLIP in `./result/`.

Every data point is classified into `Normal`, `Migration`, `Energy Anom.`, `Unphys. Relax`, or `Reprod. Fail`. Thresholds are configurable — see the [Configuration Reference](#config-adsorption-analysis).

## Threshold Sensitivity

```python
AdsorptionAnalysis().threshold_sensitivity_analysis()   # displacement + bond-length by default
```

This generates stacked-area charts showing how anomaly-classification rates change with threshold values.

## Gas-Reference Shift Correction

*(v1.1.4+)* Every Excel report also carries a gas-shift-corrected view. For each adsorbate, the median signed error (MLIP − DFT) over the structure-valid reactions (normal + energy anomaly; structural failures excluded) is removed as a constant shift — a systematic gas-reference offset correction (the median, unlike the mean, is not dragged by a minority cluster of wild outliers) — and the energy-anomaly classification is re-evaluated on the shifted errors. Groups with fewer than `gas_shift_min_n` (default 5) structure-valid reactions are left uncorrected.

Results land in the `MLIP_Data_shifted` / `anomaly_shifted` twin sheets and a per-adsorbate "Gas shift correction" block (applied shift, N_fit, shifted MAEs) on each MLIP sheet; the original sheets are unchanged. When plotting is enabled, gas-shifted parity plots are also drawn (`multi/total_shifted.png`, `multi/normal_shifted.png`). The [leaderboard](https://catbench.org) exposes the same correction as a "Gas shift" toggle.
