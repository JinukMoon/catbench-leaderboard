import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.font_manager as fm
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mlip_color_map import get_model_colors

# List of MLIP models
MLIP_models = [
    "AlphaNet",
    "CHGNet",
    "DPA-3-1-FT",
    "Eqnorm",
    "eSEN_OAM",
    "GRACE-2L-OAM",
    "MACE_MPA-0",
    # "MATLANTISv8",  # excluded
    "MatterSim_v1_5M",
    "ORB",
    "SevenNet-MF-OMPA",
    "UMA-s-1_oc20",
    "UMA-m-1_oc20",
]

# Short labels
MLIP_names = [
    "AlphaNet",
    "CHGNet",
    "DPA-3-FT",
    "Eqnorm",
    "eSEN",
    "GRACE",
    "MACE",
    # "Matlantis",  # excluded
    "MatterSim",
    "ORB",
    "SevenNet",
    "UMA-s",
    "UMA-m",
]

# Unique color per model pulled from the centralized palette
colors, _ = get_model_colors(MLIP_names, exclude_matlantis=True)

# Path to the Excel source
excel_path = "/home/jumoon/01_research/01_2025/14_catbench_revision/12_figures/03_figure3/00_mamun_Benchmarking_Analysis_0812.xlsx"

# Load the Excel sheet
df = pd.read_excel(excel_path, sheet_name='MLIP_Data')

# Prepare containers
MAE_normal = []
Time_per_step = []
normal_ratio = []

# Extract metrics for each MLIP
for model in MLIP_models:
    model_data = df[df['MLIP_name'] == model]
    if len(model_data) > 0:
        MAE_normal.append(float(model_data['MAE_normal (eV)'].values[0]))
        Time_per_step.append(float(model_data['Time_per_step (s)'].values[0]))
        normal_ratio.append(float(model_data['Normal ratio (%)'].values[0]))

# Configure Helvetica font
font_path = "/home/jumoon/fonts/Helvetica.ttf"
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Helvetica']
fm.fontManager.addfont(font_path)

# Typography settings
label_size = 50
tick_size = 50
annotation_size = 36  # large labels for model names
label_pad = 15
marker_size = 1200  # oversized markers for readability

def find_pareto_frontier(x_values, y_values, minimize_x=True, minimize_y=True):
    """Find the Pareto frontier."""
    points = np.column_stack((x_values, y_values))
    pareto_indices = []
    
    for i in range(len(points)):
        is_pareto = True
        for j in range(len(points)):
            if i != j:
                if minimize_x and minimize_y:
                    if (points[j][0] <= points[i][0] and points[j][1] <= points[i][1] and 
                        (points[j][0] < points[i][0] or points[j][1] < points[i][1])):
                        is_pareto = False
                        break
                elif minimize_x and not minimize_y:
                    if (points[j][0] <= points[i][0] and points[j][1] >= points[i][1] and 
                        (points[j][0] < points[i][0] or points[j][1] > points[i][1])):
                        is_pareto = False
                        break
        if is_pareto:
            pareto_indices.append(i)
    
    return pareto_indices

def adjust_label_positions(x_vals, y_vals, names, y_range):
    """Adjust label offsets in both axes to reduce overlap.

    Returns:
        tuple[list[float], list[float]]: (x_offsets, y_offsets)
    """
    num_points = len(x_vals)
    positions = [(x_vals[i], y_vals[i]) for i in range(num_points)]
    # Labels are large, so start with bigger default offsets
    x_offsets = [0 for _ in range(num_points)]
    y_offsets = [22 for _ in range(num_points)]

    x_range = max(x_vals) - min(x_vals) if num_points > 0 else 0
    # Perform multiple passes to relieve collisions
    for _ in range(3):
        for i in range(num_points):
            for j in range(i + 1, num_points):
                x_diff = abs(positions[i][0] - positions[j][0])
                y_diff = abs(positions[i][1] - positions[j][1])
                rel_x_diff = (x_diff / x_range) if x_range > 0 else 0
                rel_y_diff = (y_diff / y_range) if y_range > 0 else 0

                # If points are close in both axes, push their labels apart
                if rel_x_diff < 0.05 and rel_y_diff < 0.05:
                    # Alternate offsetting vertically and horizontally
                    if positions[i][1] >= positions[j][1]:
                        y_offsets[i] = max(y_offsets[i], 28)
                        y_offsets[j] = min(y_offsets[j], -28)
                    else:
                        y_offsets[i] = min(y_offsets[i], -28)
                        y_offsets[j] = max(y_offsets[j], 28)

                    # Spread horizontally as well
                    if positions[i][0] >= positions[j][0]:
                        x_offsets[i] = min(x_offsets[i], -24)
                        x_offsets[j] = max(x_offsets[j], 24)
                    else:
                        x_offsets[i] = max(x_offsets[i], 24)
                        x_offsets[j] = min(x_offsets[j], -24)

    return x_offsets, y_offsets

pareto_mae = find_pareto_frontier(Time_per_step, MAE_normal, True, True)
pareto_mae.sort(key=lambda i: Time_per_step[i])
pareto_rate = find_pareto_frontier(Time_per_step, normal_ratio, True, False)
pareto_rate.sort(key=lambda i: Time_per_step[i])

# ===== Alternate version: keep only x/y ticks and remove all other text =====
def strip_texts_keep_ticks(ax):
    # Remove axis labels and titles (tick labels remain)
    ax.set_xlabel('')
    ax.set_ylabel('')
    ax.set_title('')
    # Hide annotations such as model names (tick labels stay visible)
    for txt in list(ax.texts):
        txt.set_visible(False)

# Skip saving the combined ticks-only plot
plt.close()

print("Final dual Pareto plot complete!")
print(f"Performance Pareto optimal: {[MLIP_names[i] for i in pareto_mae]}")
print(f"Stability Pareto optimal: {[MLIP_names[i] for i in pareto_rate]}")

# ===== Generate standalone plots: figure b (performance) and figure c (stability) =====
# Figure b: performance vs. efficiency
fig_b, ax_b = plt.subplots(1, 1, figsize=(15, 12))

# Re-create the left-hand plot
y_range_mae_b = max(MAE_normal) - min(MAE_normal)
label_x_offsets_mae_b, label_offsets_mae_b = adjust_label_positions(Time_per_step, MAE_normal, MLIP_names, y_range_mae_b)

for i, (x, y, name, color) in enumerate(zip(Time_per_step, MAE_normal, MLIP_names, colors)):
    if i in pareto_mae:
        ax_b.scatter(x, y, s=marker_size*1.3, c=color, marker='*', edgecolors='black', linewidth=3, zorder=5)
    else:
        ax_b.scatter(x, y, s=marker_size, c=color, marker='o', edgecolors='black', linewidth=2, zorder=4)
    ax_b.annotate(
        name,
        (x, y),
        xytext=(label_x_offsets_mae_b[i], label_offsets_mae_b[i]),
        textcoords='offset points',
        ha=('left' if label_x_offsets_mae_b[i] > 0 else ('right' if label_x_offsets_mae_b[i] < 0 else 'center')),
        fontsize=annotation_size,
        weight='bold',
    )

if len(pareto_mae) > 1:
    pareto_x_b = [Time_per_step[i] for i in pareto_mae]
    pareto_y_b = [MAE_normal[i] for i in pareto_mae]
    for i in range(len(pareto_x_b) - 1):
        ax_b.plot([pareto_x_b[i], pareto_x_b[i+1]], [pareto_y_b[i], pareto_y_b[i]], 'r-', linewidth=2.5, alpha=0.5)
        ax_b.plot([pareto_x_b[i+1], pareto_x_b[i+1]], [pareto_y_b[i], pareto_y_b[i+1]], 'r-', linewidth=2.5, alpha=0.5)
    min_time_b = min(Time_per_step)
    ax_b.fill_between([min_time_b] + pareto_x_b + [max(Time_per_step)*1.15], [pareto_y_b[0]] + pareto_y_b + [pareto_y_b[-1]], max(MAE_normal)*1.1, alpha=0.1, color='red')

ax_b.set_xlabel('Time per step (s)', fontsize=label_size, weight='bold', labelpad=label_pad)
ax_b.set_ylabel('Normal MAE (eV)', fontsize=label_size, weight='bold', labelpad=label_pad)
ax_b.grid(True, alpha=0.3, linestyle='--', linewidth=1)
ax_b.tick_params(axis='both', labelsize=tick_size, length=8, width=2, pad=8)
[spine.set_linewidth(4) for spine in ax_b.spines.values()]

x_margin_b = (max(Time_per_step) - min(Time_per_step)) * 0.15
y_margin_b = (max(MAE_normal) - min(MAE_normal)) * 0.1
ax_b.set_xlim(-0.015, max(Time_per_step) + x_margin_b)
ax_b.set_ylim(min(MAE_normal) - y_margin_b, max(MAE_normal) + y_margin_b)

plt.tight_layout()
plt.savefig('b/figure3b.png', dpi=300, bbox_inches='tight')

# ticks-only for b
strip_texts_keep_ticks(ax_b)
plt.tight_layout()
plt.savefig('b/figure3b_ticks.png', dpi=300, bbox_inches='tight')
plt.close(fig_b)

# Figure c: stability vs. efficiency
fig_c, ax_c = plt.subplots(1, 1, figsize=(15, 12))

y_range_rate_c = max(normal_ratio) - min(normal_ratio)
label_x_offsets_rate_c, label_offsets_rate_c = adjust_label_positions(Time_per_step, normal_ratio, MLIP_names, y_range_rate_c)

for i, (x, y, name, color) in enumerate(zip(Time_per_step, normal_ratio, MLIP_names, colors)):
    if i in pareto_rate:
        ax_c.scatter(x, y, s=marker_size*1.3, c=color, marker='*', edgecolors='black', linewidth=3, zorder=5)
    else:
        ax_c.scatter(x, y, s=marker_size, c=color, marker='o', edgecolors='black', linewidth=2, zorder=4)
    ax_c.annotate(
        name,
        (x, y),
        xytext=(label_x_offsets_rate_c[i], label_offsets_rate_c[i] + 3),
        textcoords='offset points',
        ha=('left' if label_x_offsets_rate_c[i] > 0 else ('right' if label_x_offsets_rate_c[i] < 0 else 'center')),
        fontsize=annotation_size,
        weight='bold',
    )

if len(pareto_rate) > 1:
    pareto_x_c = [Time_per_step[i] for i in pareto_rate]
    pareto_y_c = [normal_ratio[i] for i in pareto_rate]
    for i in range(len(pareto_x_c) - 1):
        ax_c.plot([pareto_x_c[i], pareto_x_c[i+1]], [pareto_y_c[i], pareto_y_c[i]], 'b-', linewidth=2.5, alpha=0.5)
        ax_c.plot([pareto_x_c[i+1], pareto_x_c[i+1]], [pareto_y_c[i], pareto_y_c[i+1]], 'b-', linewidth=2.5, alpha=0.5)
    min_time_c = min(Time_per_step)
    ax_c.fill_between([min_time_c] + pareto_x_c + [max(Time_per_step)*1.15], 0, [pareto_y_c[0]] + pareto_y_c + [pareto_y_c[-1]], alpha=0.1, color='blue')

ax_c.set_xlabel('Time per step (s)', fontsize=label_size, weight='bold', labelpad=label_pad)
ax_c.set_ylabel('Normal Rate (%)', fontsize=label_size, weight='bold', labelpad=label_pad)
ax_c.grid(True, alpha=0.3, linestyle='--', linewidth=1)
ax_c.tick_params(axis='both', labelsize=tick_size, length=8, width=2, pad=8)
[spine.set_linewidth(4) for spine in ax_c.spines.values()]

ax_c.set_xlim(-0.015, max(Time_per_step) + x_margin_b)
# Lock the y-ticks to specific values and ensure the range contains them
desired_ticks_c = [73, 77, 81, 85]
ymin_c = min(min(normal_ratio), min(desired_ticks_c))
ymax_c = max(max(normal_ratio), max(desired_ticks_c))
y_span_c = max(1e-9, ymax_c - ymin_c)
y_pad_c = 0.05 * y_span_c
ax_c.set_ylim(max(0, ymin_c - y_pad_c), min(100, ymax_c + y_pad_c))
ax_c.set_yticks(desired_ticks_c)

plt.tight_layout()
plt.savefig('c/figure3c.png', dpi=300, bbox_inches='tight')

# ticks-only for c
strip_texts_keep_ticks(ax_c)
plt.tight_layout()
plt.savefig('c/figure3c_ticks.png', dpi=300, bbox_inches='tight')
plt.close(fig_c)