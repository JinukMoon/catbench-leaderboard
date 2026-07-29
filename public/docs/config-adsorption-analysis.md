## Commonly Tuned

| Parameter | Description | Default |
|---|---|---|
| `mlip_list` | Limit analysis to specific MLIPs. | Auto-detect all under `./result/` |
| `target_adsorbates` | Analyze only these adsorbates. | All |
| `exclude_adsorbates` | Skip these adsorbates. | None |
| `disp_thrs` | Displacement anomaly threshold (A). | 0.5 |
| `energy_thrs` | Energy anomaly threshold (eV). | 2.0 |
| `reproduction_thrs` | Cross-seed reproducibility threshold (eV). | 0.2 |
| `bond_length_change_threshold` | Bond-length-change anomaly threshold (fraction). | 0.2 |
| `energy_cutoff` | Exclude reference energies above this value (eV). | None |
| `mlip_name_map` | Display-name overrides, e.g. `{"MACE-MP-0": "MACE"}`. | {} |
| `font_setting` | `[path_to_ttf, family_name]` for custom plot font. | False |

## Advanced — Paths, Plot Styling, Font Sizes

| Parameter | Description | Default |
|---|---|---|
| `calculating_path` | Path to results directory. | `./result` |
| `benchmarking_name` | Output file prefix. | CWD name |
| `time_unit` | `"s"`, `"ms"`, or `"us"`. | "ms" |
| `plot_enabled` | Generate plots. | True |
| `figsize` | Figure size (width, height) in inches. | (9, 8) |
| `dpi` | Plot DPI. | 300 |
| `mark_size` | Marker size. | 100 |
| `linewidths` | Line width. | 1.5 |
| `min`, `max` | Plot axis limits. | None |
| `tick_bins`, `tick_decimal_places` | Tick control. | 6, 1 |
| `tick_labelsize` | Tick-label font size. | 25 |
| `xlabel_fontsize`, `ylabel_fontsize` | Axis-label font sizes. | 40, 40 |
| `mae_text_fontsize` | MAE-text font size. | 30 |
| `legend_fontsize`, `comparison_legend_fontsize` | Legend font sizes. | 25, 15 |
| `threshold_xlabel_fontsize`, `threshold_ylabel_fontsize` | Threshold-plot label sizes. | 40, 40 |
| `legend_off`, `mae_text_off`, `error_bar_display` | Display toggles. | False |
| `xlabel_off`, `ylabel_off`, `grid` | Display toggles. | False |
| `specific_color` | Single-MLIP plot color. | "#2077B5" |
