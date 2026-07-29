Each material has N volume-point subfolders named `0`, `1`, …, `N`:

```
your_eos_data/
├── Material_1/
│   ├── 0/   { CONTCAR, OSZICAR }    # smallest volume
│   ├── 1/   { CONTCAR, OSZICAR }
│   └── ...   (up to 10, typically)
├── Material_2/
│   └── ...
```

```python
from catbench.eos import eos_vasp_preprocessing, EOSCalculation, EOSAnalysis

eos_vasp_preprocessing("your_eos_data")
EOSCalculation(calculator=calc, mlip_name="MyMLIP", benchmark="your_eos_data").run()
EOSAnalysis().analysis()
```

![EOS Analysis Example](/images/docs/EOS_example.png)

The Excel report includes Birch-Murnaghan fits with bulk modulus (B0), equilibrium volume (V0), and derivative (B0'):

| MLIP | RMSE (eV) | MAE (eV) | VASP B0 (GPa) | MLIP B0 (GPa) | B0 Error (GPa) | VASP V0 (A^3) | MLIP V0 (A^3) | V0 Error (A^3) |
|---|---|---|---|---|---|---|---|---|
| MLIP_A | 0.634 | 0.462 | 80.53 | 102.59 | 22.06 | 475.37 | 469.42 | 5.95 |
| MLIP_B | 0.411 | 0.318 | 80.53 | 72.29 | 8.24 | 475.37 | 478.51 | 3.13 |
| MLIP_C | 0.444 | 0.350 | 80.53 | 88.02 | 7.49 | 475.37 | 470.70 | 4.67 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
