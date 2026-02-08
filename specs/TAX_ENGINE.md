# TAX_ENGINE.md
Personal Wealth Management Web App
Version 1.0

## 1) Formål
Denne engine beregner dansk skat på årsbasis (kalenderår) for:
- Personlig indkomst (inkl. arbejdsmarkedsbidrag, bundskat, topskat, kommune, kirke)
- Aktieindkomst (progression)
- Kapitalindkomst (renter mv.)
- Lagerbeskatning vs realisationsbeskatning
- Aktiesparekonto (ASK) som særskilt wrapper med lagerbeskatning

Non negotiables:
- Regeldata (satser, grænser, fradrag) ligger i separate rule files pr. tax-år.
- Tax engine er deterministisk og pure (ingen DB reads inde i engine).
- Output er auditabelt med Calculation Steps (samme princip som CALC_ENGINE.md).

## 2) Scope for MVP
MVP skal kunne:
1) Beregne personskat ud fra årsbeløb og satser for et tax-år
2) Beregne skat på investeringer opdelt i:
   - Aktieindkomst (realisationsbaseret som udgangspunkt)
   - Kapitalindkomst (renter, kursgevinster i kapitalindkomst mv.)
   - Lagerbeskattede instrumenter (årets værdiregulering)
3) Beregne ASK skat som lagerafkast:
   - Afkast = slutværdi - startværdi - nettoindskud + nettoudtræk
   - Skat = afkast * askSkattesats
4) Producere en breakdown og en audit trail pr. delberegning

Explicit out of scope i MVP:
- Komplet fradragskatalog (kørselsfradrag, fagforening, renteudgifter osv. implementeres senere som moduler)
- Særlige regler for virksomhedsordning, ægtefælles overførsel, international skat
- Indviklede corporate actions (splits, fusionsvederlag) ud over manuelle adjustments

## 3) Datamodel og input interface
Tax engine må ikke modtage rå transaktioner. Den modtager aggregerede årsinputs.

### 3.1 Canonical input
TaxInput:
- taxYear: number (fx 2026)
- municipality: { rate: number, churchRate?: number }
- personalIncome:
  - salaryGross: number
  - bonusGross?: number
  - pensionEmployee?: number
  - pensionEmployer?: number
  - otherPersonalIncome?: number
  - deductions:
    - standardDeductionsEnabled: boolean (MVP: true)
    - custom: [{ label: string, amount: number }] (optional)
- investments:
  - equityIncome:
    - realizedGains: number
    - dividends: number
    - lossesCarryForwardUsed?: number
  - capitalIncome:
    - netCapitalIncome: number
  - markToMarket:
    - taxableChange: number
  - ask:
    - openingValue: number
    - closingValue: number
    - netDeposits: number
    - netWithdrawals: number

All amounts are DKK per tax year.

### 3.2 Hvor kommer inputs fra (adapter layer)
Der skal være et separat adapter-lag i src som kan:
- Aggregere income fra forecast eller faktisk data
- Aggregere investeringstal fra holdings/transactions pr. wrapper (DEPOT, ASK)
- Klassificere instrumenter via instrument metadata:
  - wrapper: DEPOT | ASK
  - regime: REALISATION | LAGER
  - incomeType: EQUITY_INCOME | CAPITAL_INCOME
MVP tillader at inputs tastes manuelt og senere udledt automatisk.

## 4) Rule files pr. tax-år
Rule files lever under:
- specs/tax/rules_YYYY.json

Rule file indeholder:
- AM-bidrag sats
- Bundskat sats og bundskatsgrundlag (efter personfradrag mv.)
- Topskat sats og topskattegrænse
- Kommuneskat og kirkeskat som inputs (ikke hardcoded)
- Personfradrag og standardfradrag (hvis anvendt i MVP)
- Aktieindkomst satser og progressionsgrænse
- ASK skat sats
- Eventuelle standardiserede fradrag satser, hvis anvendt

Tax engine må aldrig hardcode tal. Kun bruge rule file.

## 5) Beregningslogik (high level)
### 5.1 Personlig indkomst (MVP)
Flow:
1) AM-bidrag beregnes af arbejdsindkomst (salaryGross + bonusGross + otherPersonalIncome)
2) Skattepligtig indkomst approx:
   - taxableIncome = grossIncome - AM - personfradrag - standard deductions (hvis enabled) - custom deductions
3) Bundskat beregnes af relevant base med bundskatsats
4) Kommuneskat og kirkeskat beregnes af relevant base med angivne satser
5) Topskat beregnes af base over topskattegrænsen

Bemærk: Den præcise danske base definition er kompleks. MVP dokumenterer simplificeringer tydeligt i audit.

### 5.2 Aktieindkomst (MVP)
- equityIncome = realizedGains + dividends - lossesCarryForwardUsed
- Beregn skat med to trins progression:
  - 0 til grænse: rateLow
  - over grænse: rateHigh
- Output: equityTax, og delstep der viser hvilken del i hvert trin

### 5.3 Kapitalindkomst (MVP)
- capitalTax = netCapitalIncome * capitalIncomeRateOrModel
MVP kan starte med:
- vis kun netCapitalIncome og marker at kapitalindkomst påvirker personskat base i senere version
MVP output skal stadig være auditabelt.

### 5.4 Lagerbeskatning (MVP)
- markToMarketTaxBase = taxableChange
- taxation model afhænger af instrumentets incomeType:
  - Hvis equity-like fund: beskattes som aktieindkomst
  - Ellers beskattes som kapitalindkomst
MVP accepterer at taxableChange leveres som input fra adapter.

### 5.5 ASK (MVP)
- askReturn = closingValue - openingValue - netDeposits + netWithdrawals
- askTax = max(0, askReturn) * askRate
- tab (negativt afkast) gemmes som carry forward i senere version (MVP: vis som note)

## 6) Output og audit format (mandatory)
TaxOutput:
- totals:
  - totalTax
  - personalTaxTotal
  - equityTaxTotal
  - capitalTaxTotal
  - askTaxTotal
- breakdown:
  - personal: { am, municipal, church, bottom, top, allowancesUsed }
  - equity: { base, tier1Base, tier1Tax, tier2Base, tier2Tax }
  - capital: { base, tax }
  - markToMarket: { base, tax, treatedAs }
  - ask: { return, tax }
- audits: Audit[] (samme struktur som CALC_ENGINE.md audit)
- warnings: string[] (MVP simplifications and missing inputs)
- assumptions: string[] (explicit simplifications used)

Audit format:
- title
- context: { taxYear, scenarioId?, userId? }
- inputs: [{ label, value, unit, source }]
- steps: [{ label, formula, value, unit }]
- outputs: [{ label, value, unit }]
- notes: string[]

## 7) Testing krav
Minimum golden tests pr tax-år:
- Personskat med og uden topskat
- Aktieindkomst under og over grænse
- ASK med positivt afkast
- ASK med negativt afkast (skal give 0 skat og warning)
- Lagerbeskatning der behandles som equity vs capital

Testcases lagres som JSON under:
- specs/tax/test_cases_YYYY.json

## 8) MVP boundary og tydelighed
Engine skal altid returnere:
- warnings og assumptions hvis simplificeret model er brugt
- tydelige audit steps så brugeren kan se hvad der er gjort

End of file.
