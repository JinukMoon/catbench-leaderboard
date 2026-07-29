`SurfaceEnergyCalculation`, `BulkFormationCalculation`, and `EOSCalculation` all require `calculator`, `benchmark`, and `mlip_name`, and accept `f_crit_relax` and `n_crit_relax` for optimization control.

`RelativeEnergyAnalysis` requires `task_type` (`"surface"`, `"bulk_formation"`, or `"custom"`) and accepts the same plotting options as `AdsorptionAnalysis`.

## EOSAnalysis Advanced Options

| Parameter | Description | Default |
|---|---|---|
| `calculating_path` | Results directory. | `./result` |
| `plot_path` | Plot output directory. | `./plot` |
| `benchmark` | Dataset name. | CWD name |
| `mlip_list` | MLIPs to analyze. | Auto-detect |
| `figsize` | Plot dimensions. | (9, 8) |
| `dpi` | Plot DPI. | 300 |
| `mark_size` | Marker size. | 100 |
| `x_tick_bins`, `y_tick_bins` | Tick bins. | 5, 5 |
| `tick_decimal_places`, `tick_labelsize` | Tick control. | 1, 25 |
| `xlabel_fontsize`, `ylabel_fontsize` | Axis-label font sizes. | 40, 40 |
| `legend_fontsize`, `comparison_legend_fontsize` | Legend font sizes. | 25, 15 |
| `grid` | Show grid. | False |
| `font_setting` | Custom font `[path, family]`. | False |
