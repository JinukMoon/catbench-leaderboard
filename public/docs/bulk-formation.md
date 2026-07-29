> **Warning:** Preprocessing deletes all files except `CONTCAR` and `OSZICAR`.

Layout — `bulk_compounds/` and `elements/` side-by-side:

```
your_formation_data/
├── bulk_compounds/
│   ├── Compound_1/  { CONTCAR, OSZICAR }
│   └── Compound_2/  { CONTCAR, OSZICAR }
└── elements/
    ├── Element_A/   { CONTCAR, OSZICAR }
    ├── Element_B/   { CONTCAR, OSZICAR }
    └── Element_C/   { CONTCAR, OSZICAR }
```

```python
from catbench.relative.bulk_formation.data import bulk_formation_vasp_preprocessing
from catbench.relative import BulkFormationCalculation, RelativeEnergyAnalysis

coeff_setting = {
    "Compound_1": {"bulk": 1, "Element_A": -1, "Element_C": -1/2},
    "Compound_2": {"bulk": 1, "Element_B": -2, "Element_C": -3/2},
}
bulk_formation_vasp_preprocessing("your_formation_data", coeff_setting)
BulkFormationCalculation(calculator=calc, benchmark="your_formation_data", mlip_name="MyMLIP").run()
RelativeEnergyAnalysis(task_type="bulk_formation").analysis()
```
