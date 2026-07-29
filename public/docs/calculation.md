`AdsorptionCalculation` takes a **list** of calculators. Running the same calculator multiple times provides reproducibility statistics that the analysis step uses for anomaly detection.

```python
from catbench.adsorption import AdsorptionCalculation
from your_mlip import YourCalculator

calc = YourCalculator(...)

AdsorptionCalculation(
    [calc] * 3,                    # 3 reproducibility seeds
    mlip_name="YourMLIP",          # folder name under result/ + display name in plots
    benchmark="dataset_name",
    # save_files=False,            # skip trajectory + log files to save disk space
).run()
```

## D3 Dispersion Correction

GPU required:

```python
from catbench.dispersion import DispersionCorrection

d3 = DispersionCorrection()                     # Becke-Johnson damping + PBE by default
calc_d3 = d3.apply(YourCalculator(...))
AdsorptionCalculation([calc_d3] * 3, mlip_name="YourMLIP_D3", benchmark="dataset_name").run()
```

## OC20 Mode

For MLIPs that predict adsorption energy directly:

```python
AdsorptionCalculation(
    [oc20_calc] * 3, mode="oc20", mlip_name="OC20_MLIP", benchmark="dataset_name",
).run()
```

See the [Configuration Reference](#config-adsorption-calculation) for all options, and the [tutorial notebook](https://github.com/JinukMoon/CatBench/blob/main/tutorials/catbench_tutorial.ipynb) for an end-to-end runnable example.
