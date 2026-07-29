Same data → calculation → analysis shape as Adsorption, but with a **single** calculator (no reproducibility seeds) and a `task_type` dispatch.

> **Warning:** Preprocessing deletes all files except `CONTCAR` and `OSZICAR`. Always work on a copy.

Layout — per material, one `bulk/` and one `slab/`:

```
your_surface_data/
├── Material_1/
│   ├── bulk/  { CONTCAR, OSZICAR }
│   └── slab/  { CONTCAR, OSZICAR }
├── Material_2/
│   └── ...
```

```python
from catbench.relative.surface_energy.data import surface_energy_vasp_preprocessing
from catbench.relative import SurfaceEnergyCalculation, RelativeEnergyAnalysis

surface_energy_vasp_preprocessing("your_surface_data")
SurfaceEnergyCalculation(calculator=calc, benchmark="your_surface_data", mlip_name="MyMLIP").run()
RelativeEnergyAnalysis(task_type="surface").analysis()
```

![Surface Energy Parity Plot](/images/docs/surface_parity.png)

The Excel report provides MAE, RMSE, and max error (J/m2) across all surfaces per MLIP.
