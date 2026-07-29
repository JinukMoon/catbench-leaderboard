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
