# HOME_PURCHASE_SIMULATION.md
Personal Wealth Management Web App
Version 1.0

## 1) Formål
Dette modul modellerer et huskøb som en simulation der påvirker:
- Balance (asset: bolig, liabilities: realkredit og banklån)
- Cash flow (ydelser, bidrag, renter, afdrag)
- Budget (disponibel indkomst før og efter køb)
- Net worth over tid
- Audit trail: forklarer alle centrale tal med calculation steps

Modulet er både et beslutningsværktøj og et læringsværktøj.

## 2) Produktpræmisser og afgrænsning
MVP fokuserer på finansieringen og transaktionsomkostninger. Den modellerer:
- Købspris, udbetaling, lånesammensætning
- Realkreditlån med obligationrente + bidragssats
- Banklån for restfinansiering hvis relevant
- Tinglysningsafgifter og standard købsomkostninger

Out of scope i MVP:
- Ejerudgifter som grundskyld, ejendomsværdiskat og forsikringer som komplette moduler (kan indgå som simple inputs)
- Kompleks refinansiering og konverteringer (tilføjes senere)
- Skattefradrag for renteudgifter integreres i TAX engine senere

## 3) Fakta der skal respekteres i modellen
- Realkredit belåningsgrænse for helårs ejerbolig er typisk 80%. (Finans Danmark)
- Køber skal typisk selv lægge mindst 5% kontant udbetaling. (Danske Bank)
- Bidragssats er et løbende administrationsbidrag til realkreditinstituttet og er variabel. (Totalkredit)
- Tinglysning af skøde er fast afgift plus variabel procent af købesum. (Skødecenret, Legaldesk som forklaring)
- Tinglysning af pant (pantebrev) har fast afgift og procent af pantsikret beløb. (Skattestyrelsen satser)

Bemærk: satser kan ændre sig pr år. Derfor ligger tal i rule files pr tax-år.

## 4) Canonical input (simulation)
HousingPurchaseInput:
- year: number (fx 2026)
- purchase:
  - price: number (DKK)
  - downPaymentCash: number (DKK)
  - closeDate: string (YYYY-MM-DD)
- financing:
  - mortgage:
    - enabled: boolean
    - ltvMax: number (default from rules, fx 0.80)
    - principal: number (DKK) optional if user specifies, otherwise derived
    - termYears: number (typisk 30)
    - amortizationProfile: "FULL" | "IO" (interest-only) | "CUSTOM"
    - ioYears?: number (0-10 in MVP)
    - bondRateNominalAnnual: number (annual nominal interest, input or provider)
    - contributionRateAnnual: number (bidragssats, input or rules range)
    - paymentsPerYear: 12
  - bankLoan:
    - enabled: boolean
    - principal: number (derived if needed)
    - rateNominalAnnual: number
    - termYears: number
    - paymentsPerYear: 12
- transactionCosts:
  - includeDefaultCosts: boolean
  - customCosts: [{ label: string, amount: number }]
- budgetIntegration:
  - monthlyDisposableIncomeBeforeHousing: number
  - monthlyHousingRunningCosts: number (simplified, MVP)
- scenarioMeta:
  - scenarioId: string
  - notes?: string

## 5) Derivation rules
### 5.1 Lånesammensætning
Compute:
- minDownPaymentRequired = price * rules.minDownPaymentPct
- maxMortgage = price * rules.mortgageLtvMax (default 0.80)
- equity = downPaymentCash
- fundingGap = price - equity
- mortgagePrincipal = min(fundingGap, maxMortgage) unless user overrides
- bankPrincipal = max(0, fundingGap - mortgagePrincipal)

Validate:
- downPaymentCash >= minDownPaymentRequired (warning if not)
- mortgagePrincipal <= maxMortgage (warning if exceeded)
- sum funding: equity + mortgage + bank >= price

### 5.2 Tinglysningsafgifter (MVP)
Compute using rules:
- deedFee = fixed + deedRate * price (rounded to nearest 100 if rule says so)
- mortgageDeedFee = fixed + mortgageRate * mortgagePrincipal
- bankPledgeFee = fixed + mortgageRate * bankPrincipal (if bank loan is secured similarly, optional switch)

Satser skal komme fra rules file. Forklaringskilder: Skattestyrelsen og oversigter.

### 5.3 Månedlig ydelse og betalingsstrømme
MVP bruger standard annuitetsformel pr lån.

Annuity payment per month:
- r = nominalAnnual / 12
- n = termYears * 12
- payment = principal * r / (1 - (1 + r)^(-n))

Realkredit total cost of carry:
- interest component uses bondRateNominalAnnual
- contribution component approximated as:
  - contributionMonthly = principal * (contributionRateAnnual / 12)
Bidragssats forklares som løbende omkostning ved realkredit.

MVP simplification:
- Realkredit modeled as a loan with interest plus a separate contribution cash flow.
- Exact bond pricing, kurs og refinansieringsmekanik er v2.

### 5.4 Cash flow integration i budget
- monthlyHousingPaymentTotal = mortgagePayment + mortgageContribution + bankPayment + monthlyHousingRunningCosts
- monthlyDisposableAfterHousing = monthlyDisposableIncomeBeforeHousing - monthlyHousingPaymentTotal

Output skal vise før og efter.

## 6) Outputs
HousingPurchaseOutput:
- derived:
  - mortgagePrincipal
  - bankPrincipal
  - deedFee
  - mortgagePledgeFee
  - totalUpfrontCosts
- monthly:
  - mortgagePayment
  - mortgageContribution
  - bankPayment
  - housingRunningCosts
  - totalHousingCostPerMonth
  - disposableAfterHousing
- balanceImpact:
  - assetHomeValueInitial = price
  - liabilitiesInitial = mortgagePrincipal + bankPrincipal
  - equityInitial = price - liabilitiesInitial
- audits: Audit[] (samme format som CALC_ENGINE.md)
- warnings: string[]
- assumptions: string[]

## 7) Audit trail (mandatory)
For hver af disse skal der være et audit object:
1) Loan split (mortgage vs bank)
2) Deed registration fee
3) Mortgage pledge fee
4) Mortgage monthly payment
5) Mortgage monthly contribution
6) Bank loan monthly payment
7) Total monthly housing cost and budget impact

Audit format skal være kompatibel med CALC_ENGINE.md.

## 8) Rule files
- specs/housing/rules_YYYY.json
Skal indeholde:
- minDownPaymentPct
- mortgageLtvMax
- deed fee: fixed + rate + rounding
- pledge fee: fixed + rate + rounding
- optional: default bank fees and buyer costs

No hardcoded numbers in engine.

## 9) Test cases
- specs/housing/test_cases_YYYY.json
Golden cases:
- standard purchase under 80% LTV
- purchase with small down payment requiring bank loan
- weekend close date does not matter (payments monthly)
- verify deed and pledge fees and rounding

End of file.
