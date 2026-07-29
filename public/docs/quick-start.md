Minimum viable benchmark in 5 lines:

```python
from catbench.adsorption import get_benchmark, AdsorptionCalculation, AdsorptionAnalysis
from your_mlip import YourCalculator

get_benchmark("BM_dataset")        # 0.3 MB
calc = YourCalculator(...)
AdsorptionCalculation([calc] * 3, mlip_name="MyMLIP", benchmark="BM_dataset").run()
AdsorptionAnalysis().analysis()    # parity plots + Excel
```

For an end-to-end walkthrough on the publication's main benchmark (MamunHighT2019) with MACE-MP-0, see the [tutorial notebook](#tutorials).
