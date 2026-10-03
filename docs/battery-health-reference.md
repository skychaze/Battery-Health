# Battery health reference

## Lenovo guidance

Lenovo's [PSREF for the LOQ 15IAX9](https://psref.lenovo.com/syspool/Sys/PDF/LOQ/LOQ_15IAX9/LOQ_15IAX9_Spec.PDF) lists a 60 Wh rechargeable Li-ion battery. It also says maximum battery capacity decreases with time and use.

Lenovo's [Battery Q&A](https://support.lenovo.com/na/en/solutions/ht509084-battery-qa) describes battery health as a combination of charge cycles and capacity. Lenovo Vantage displays Good or Poor, but this guidance does not define percentage cutoffs for those labels or a LOQ 15IAX9-specific replacement threshold.

Lenovo's [Certified Refurbishment Services](https://www.lenovo.com/gb/en/solutions/sustainability-solutions/climate-action/certified-refurbishment-services/) specifies battery replacement below 80% capacity or above 750 cycles within that refurbishment service. This is a service rule, not a stated LOQ battery lifespan or a universal consumer replacement threshold.

## Chosen app bands

Use remaining capacity relative to design capacity for the color label:

- **Good (green):** 90% or higher.
- **Ok (yellow):** 86% to below 90%.
- **Worn (orange):** 81% to below 86%.
- **Bad (red):** below 81%.

These color boundaries are user-chosen, not OEM standards. Lenovo's 80% refurbishment reference remains separate from the app's 81% red boundary. Cycle count can be shown as context, but do not label 750 cycles as the LOQ's rated life. These sources give no model-specific cycle limit for this battery.

For the reported battery, 54.96 Wh / 60 Wh = **91.60%** capacity health at **422 cycles**, so it falls in the suggested Good band. Keep the raw reading for calculations and round only for display.
