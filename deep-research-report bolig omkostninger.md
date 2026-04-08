# Fuld ejeromkostning og finansieringsomkostning ved boligkøb i Danmark

## Executive summary

Når du køber bolig i Danmark, består din “all-in” omkostning typisk af fire store blokke: (1) engangsomkostninger ved køb og låneoptagelse (tinglysning + etablerings-/kurstillæg), (2) løbende finansieringsydelser (renter + bidrag på realkredit og evt. banklån), (3) løbende boligskatter (ejendomsværdiskat + grundskyld), og (4) øvrige ejeromkostninger (forsikring, fællesudgifter i ejerforening, drift/vedligehold m.m.). citeturn29view0turn37view0turn36view0

På realkreditten er den mest afgørende “prisdriver” sjældent selve obligationsrenten alene, men **kombinationen af**: låntype (fast vs. variabel), **bidragssats** (som især stiger i de høje belåningslag), samt om du vælger **afdragsfrihed** (som normalt koster ekstra og giver højere senere ydelser). citeturn15view0turn18view0turn3view0turn17view0turn21view0

Aktuelt renteniveau (snapshot omkring januar–februar 2026) kan illustreres med markeds-/bankpublicerede nøgletal: et 30-årigt fastforrentet obligationslån med 4% kupon ligger omkring **4,09% effektiv rente** (kurs ca. 99,5), mens korte variable realkreditrenter ligger omkring **2,3–2,7%** afhængigt af refinansiering/auktion og tillæg til reference. citeturn14view0turn23view0

Boligskatter i det nye system (virkning fra 2024) beregnes overordnet som:  
- **Ejendomsværdiskat**: 5,1 promille af beregningsgrundlaget op til en progressionsgrænse (grundbeløb 9.200.000 kr. i 2024-niveau) og 14 promille af resten. citeturn37view0  
- **Grundskyld**: en kommunal promillesats (loft pr. kommune 2024–2028), med store lokale forskelle; i 2026 ligger de laveste/højeste promiller (top 20-lister) omkring **3,1–17,7** promille. citeturn27search2turn38view0turn36view0

Engangsomkostninger styres af lovbestemte tinglysningsafgifter og udbyderpriser:  
- Skøde (ejerskifte): **0,6% + 1.850 kr.** citeturn29view0  
- Pant i fast ejendom (realkredit/bank): **1,25% + 1.825 kr.** (2026-niveau). citeturn29view0  
Derudover kommer typisk lånesagsgebyr, kursfradrag og afregningsprovision hos realkreditinstituttet. citeturn30view0turn19search3

**Din største strukturelle beslutning** er ofte:  
- Kan du (og vil du) undgå banklånet ved at lægge mindst 20% kontant, så du kan finansiere hele resten via realkredit op til 80%?  
- Eller accepterer du en højere samlet ydelse ved 5% udbetaling (typisk: 80% realkredit + 15% banklån + egne midler til øvrige omkostninger), mod at komme hurtigere ind på markedet? citeturn20search10turn29view0

## Inputs og antagelser

Du kan få et mere præcist regneeksempel, hvis du svarer med: boligtype (hus/ejerlejlighed), kommune (grundskyld), og hvis muligt “foreløbig” ejendomsværdi og grundværdi fra vurderingen (eller blot et estimat). Jeg går videre med standardantagelser nu, som du bad om.

**Standardantagelser (dit ønskede default-sæt):**  
- Købspris: 3.500.000 kr.  
- Udbetaling: 5% (= 175.000 kr.)  
- Realkredit (maks): 80% (= 2.800.000 kr.)  
- Banklån: resten (= 525.000 kr.)  
- Løbetid: 30 år på realkredit  
- Option A: fast rente med afdrag  
- Option B: F-kort/kort rente med afdrag  
- Derudover vises: 10 års afdragsfrihed på realkredit (og hvad der typisk betyder for ydelsen)

**Valgte “sensible defaults” for beregning (tydeligt markeret som antagelser):**  
- Renteniveauer: “snapshot” omkring jan–feb 2026; fastforrentet illustreret med 4% obligationslån (effektiv rente ca. 4,09%), og kort variabel rente ca. 2,41% for 1. halvår 2026. citeturn14view0turn23view0  
- Bidrag: illustreret med offentliggjorte niveauer (her anvendt: entity["company","Nordea Kredit","danish mortgage bank"]). citeturn15view0turn30view0  
- Banklånsrente: antaget 5,5% variabel (ligger midt i typiske “fra–til”-spænd). citeturn7search17  
- Banklåns løbetid: antaget 20 år (mange banker ønsker hurtigere afvikling af den dyreste del; konkret afhænger af bank og kreditprofil). citeturn31view0  
- Skattegrundlag i eksempel (da kommune og vurdering ikke er oplyst): ejendomsværdi = 3.500.000 kr., grundværdi = 1.200.000 kr., grundskyldspromille = 8,0. Promillen varierer markant; se afsnittet om grundskyld. citeturn27search2turn37view0

## Realkreditlån

### Låntyper og hvordan renterne dannes

Danske realkreditlån er grundlæggende **obligationsfinansierede**: dit lån hænger 1‑til‑1 sammen med en bagvedliggende obligationsserie, og det er grunden til, at du (som låntager) normalt kan indfri ved at købe obligationerne i markedet (“obligationsindfrielse”). citeturn28search4turn28search15

De mest relevante privat-låntyper ved boligkøb er:

- **Fastforrentet obligationslån**: du kan typisk indfri til kurs 100 ved opsigelse til termin (med varsel), og du kan også indfri ved at købe obligationerne til markedskurs. citeturn28search7turn28search20turn28search0  
- **Rentetilpasningslån (F1/F3/F5)**: renten fastsættes ved refinansiering (auktion) med en fast periode (fx 3 eller 5 år). Du kan typisk opsige til kurs 100 omkring refinansieringstidspunktet, og ellers indfri til markedskurs. citeturn28search24turn19search4  
- **F-kort / Kort rente / FlexKort**: kort variabel rente, hvor renten typisk fastsættes halvårligt og relateres til en pengemarkedsreference (fx CITA 6) plus et tillæg/-fradrag, der fastsættes ved auktion/refinansiering. citeturn21view0turn23view0turn14view0  
- **Renteloft / capped-varianter** (fx “RenteMax” eller “renteloft”): variable lån med en aftalt maksimal rente; de har typisk en “pris” i form af højere løbende omkostninger end ren kort rente (og produktvilkår varierer på tværs af udbydere). citeturn17view0turn28search21

**Hvad flytter renterne?**  
- Fast rente følger især niveauet på lange renter og investorernes prissætning af obligationen (kurs/yield). Når kursen stiger, falder den effektive rente/yield og omvendt. citeturn8view0turn14view0  
- Kort/variabel rente følger især pengemarkedsrenter (fx CITA/CIBOR) og resultatet af refinansieringsauktioner (tillæg/-fradrag). citeturn23view0turn14view0

### Kuponrente, effektiv rente og “kurs” i praksis

I Danmark ser du ofte både en **kuponrente** (fx “4% obligationslån”) og en **effektiv rente**. Et konkret eksempel (jan 2026): et 4% obligationslån kan have kurs omkring 99,5 og effektiv rente omkring 4,09%. citeturn14view0

Kursen (obligationsprisen) betyder meget, fordi udbetalingen sker til obligationskurs **minus** instituttets kursfradrag. Kursfradrag er en omkostning ved udbetaling/refinansiering/indfrielse, som reelt gør finansieringen dyrere over tid. citeturn19search3turn30view0turn19search24

### Aktuelle, typiske renteniveauer pr. låntype

Tabellen nedenfor er et **indikativt snapshot** baseret på offentliggjorte prognose-/auktionstal omkring 19. januar 2026 (opdateret på siden 10. februar 2026) samt offentliggjorte kort-rente niveauer for 1. halvår 2026. Det er ikke et bindende lånetilbud, men bruges her til at give dig et realistisk “nutids-anker”. citeturn14view0turn23view0

| Låntype (dansk) | Typisk renteniveau (ca.) | Hvad betyder det i praksis |
|---|---:|---|
| Fastforrentet obligationslån (30 år, 4% kupon) | Effektiv rente ca. 4,09% (kurs ca. 99,5) | Stabil rente; mulighed for indfrielse til kurs 100 ved opsigelse til termin; kan konverteres/omlægges. citeturn14view0turn28search7 |
| Rentetilpasningslån F3 | Ca. 2,38% (efter kursfradrag i eksemplet) | Rente fastlåst i 3 år ad gangen; typisk lavere startydelse end fast rente, men risiko ved rentestigning ved næste refinansiering. citeturn14view0turn19search4 |
| Rentetilpasningslån F5 | Ca. 2,65% (efter kursfradrag i eksemplet) | Som F3, men længere rentebinding. citeturn14view0turn19search4 |
| F-kort / Kort rente (halvårlig) | Lånerente ca. 2,34–2,47% i 1. halvår 2026 (afhænger af obligation/tillæg) | Rente kendt i 6 mdr.; lånerente = CITA6 + tillæg; inkonverterbar i hverdagen (indfrielse typisk via markedskurs, men ofte tæt på 100). citeturn23view0turn21view0turn14view0 |

### Bidragssats og løbende realkreditomkostninger

**Bidragssatsen** er den løbende betaling til realkreditinstituttet (adskilt fra obligationsrenten). Den beregnes som en procent pr. år af restgælden, typisk vægtet efter hvor stor del af lånet der ligger i belåningsintervaller (0–40%, 40–60%, 60–80% osv.). citeturn18view0turn15view0turn17view0

Overordnet stiger bidrag typisk når:  
- du ligger højt i belåning (især 60–80%),  
- du vælger mere “risikofyldte” låntyper (kort variabel) fremfor fast rente,  
- du vælger afdragsfrihed (typisk tillæg, især på den øverste del af belåningen). citeturn15view0turn18view0turn3view0turn17view0

#### Typiske bidragssatser i praksis, sammenlignet på tværs af store udbydere

Tabellen nedenfor sammenligner offentligt publicerede bidragssatser for nye lån til helårsejerbolig. Bemærk at kategorier og produktnavne varierer; her er “kort variabel” proxied som F-kort/Kort Rente/FlexKort (og hos Jyske som F1-rentetilpasning). citeturn3view0turn17view0turn15view0turn18view0

| Udbyder | Fast rente m/afdrag (0–40 / 40–60 / 60–80) | Kort variabel m/afdrag (0–40 / 40–60 / 60–80) | Tillæg ved afdragsfrihed (indikativt) |
|---|---|---|---|
| entity["company","Realkredit Danmark","danish mortgage bank"] | 0,23% / 0,69% / 1,13% | FlexKort: 0,45% / 1,00% / 1,5252% | Tillæg i afdragsfri periode er højere i høj belåning (se prisblad). citeturn3view0 |
| entity["company","Totalkredit","danish mortgage bank"] | 0,45% / 0,85% / 1,20% | F-kort: 0,50% / 1,05% / 1,55% | Tillæg for afdragsfrihed (fx 0,10% / 0,30% / 0,80%). citeturn17view0 |
| entity["company","Nordea Kredit","danish mortgage bank"] | 0,275% / 0,725% / 1,025% | Kort Rente: 0,40% / 0,925% / 1,275% | Tillæg afdragsfrihed (fx 0,15% / 0,30% / 0,70%). citeturn15view0 |
| entity["company","Jyske Realkredit","danish mortgage bank"] | 0,225% / 0,80% / 1,00% | F1: 0,375% / 0,95% / 1,30% | Afdragsfrihed indbygget i “m/afdrag vs u/afdrag” satser; minimumsbidrag 900 kr./år nævnt. citeturn18view0 |

**Praktisk tommelfingerregel:** På et køb med 80% realkreditbelåning ender den vægtede bidragssats ofte omkring **0,55–0,90% p.a.** for fast rente og ofte **0,75–1,10%+ p.a.** for kort variabel – men det afhænger af udbyder og produkt. citeturn3view0turn15view0turn17view0turn18view0

### Engangsomkostninger ved realkredit

Ud over tinglysningsafgift kommer der normalt 3 udgiftstyper ved realkreditoptagelse:  
1) **Lånesagsgebyr/sagsekspedition** (fast beløb) citeturn30view0turn17view0turn18view0turn3view0  
2) **Afregningsprovision** (typisk % af kursværdien; ofte 0,15% i standardprisblade) citeturn30view0turn17view0turn18view0turn19search8  
3) **Kursfradrag** (typisk 0,15–0,25 kurspoint ved udbetaling i de viste prisblade) citeturn30view0turn17view0turn18view0turn3view0  

### Indfrielse, omlægning og “break costs”

To centrale mekanikker er værd at kende:

- **Obligationsindfrielse**: alle låntyper kan i princippet indfries ved at købe de bagvedliggende obligationer i markedet (en direkte konsekvens af 1‑til‑1-sammenhængen). citeturn28search4turn28search15  
- **Indfrielse til kurs 100 (pari)**: særligt relevant for fastforrentede lån, der kan opsiges til termin og indfries til kurs 100 (med varsel). citeturn28search7turn28search20turn28search2  

For kort variabel (F-kort/Kort Rente) og mange inkonverterbare lån sker indfrielse ofte til markedskurs, men obligationskurserne ligger typisk tættere på 100 pga. kort løbetid; der kan også være mulighed for opsigelse til kurs 100 omkring refinansieringstidspunktet. citeturn21view0turn28search24turn19search4

## Banklån og bankfinansiering

### Hvad banklånet typisk bruges til ved boligkøb

Standardstrukturen ved lav udbetaling beskrives ofte som: 80% realkredit + 15% banklån + 5% egen udbetaling (samt at øvrige omkostninger typisk kræver egne midler). citeturn20search10turn29view0

Banklånet (“boliglån”/“boligkredit”) er typisk:  
- dyrere end realkredit (højere rente),  
- mere individuelt prissat (kundens økonomi og risiko),  
- ofte ønsket afviklet hurtigere end realkreditten, og  
- forbundet med bankens egne gebyrer (dokument, vurdering, oprettelse). citeturn7search17turn31view0

### Typiske rentespænd og prisdrivere

Aktuelle, publicerede “fra–til” intervaller (vejledende, afhænger af kreditprofil og sikkerhed):

| Bank | Publiceret rentespænd (boliglån) | Eksempler på oplyste gebyrer |
|---|---:|---|
| entity["company","Danske Bank","danish retail bank"] | 3,59% – 7,49% p.a. | (Varierer; afhænger af produkt og kunde.) citeturn7search8 |
| entity["company","Nordea","nordic universal bank"] | 3,40% – 7,80% p.a. | Dokumentgebyr 4.200 kr.; vurderingsgebyr 2.262,50 kr. citeturn7search17 |
| entity["company","Jyske Bank","danish retail bank"] | 4,00% – 7,70% p.a. | Oprettelse/lånesag typisk 2% af lånet (min. 1.000 kr.). citeturn7search18 |

**Hvad driver prisen?**  
De vigtigste faktorer er typisk belåningsgrad (inkl. bankdelen), stabilitet i indkomst/beskæftigelse, rådighedsbeløb, gældsfaktor, sikkerhedens kvalitet (boligtype/område), samt om banken vurderer kunden robust ved rentestress. citeturn31view0turn7search17

### Tidlig indfrielse og vilkår

For banklån varierer vilkår meget mere end for realkredit: ved variabelt forrentede banklån er ekstraordinære afdrag ofte mulige, men konkrete gebyrer/evt. rentefastsættelsesvilkår fremgår af låneaftalen. (Her bør du altid kræve et fuldt prisblad og lånetilbud i skrift.) citeturn7search17turn7search18

## Samlet finansieringsstruktur og worked example

### Metode og gennemsigtighed i beregninger

I eksemplerne nedenfor er månedlige ydelser beregnet som annuitet:  
- Månedlig ydelse (uden bidrag) = \(P \cdot r / (1-(1+r)^{-n})\), hvor \(r=\) årlig rente/12 og \(n\) = antal måneder.  
- Månedlige renter = restgæld · r.  
- Månedligt bidrag er beregnet som restgæld fordelt i belåningsintervaller (0–40/40–60/60–80) · bidragssats/12 (dvs. bidrag falder gradvist i takt med afdrag). citeturn18view0turn15view0turn31view0

Der skelnes mellem:  
- **Sikre/statutory omkostninger** (tinglysningsafgift-satser). citeturn29view0  
- **Udbyder-/kundeafhængige omkostninger** (bidrag, kursfradrag, bankrente, gebyrer). citeturn15view0turn30view0turn7search17turn31view0

### Engangsomkostninger ved købet, itemiseret

Nedenfor er de mest almindelige poster for en køber. Beløbene er “hvordan beregnet”; faktiske priser afhænger af valg af långiver/bank og om der allerede findes ejerpantebreve mv.

| Post | Hvem opkræver | Hvordan beregnet |
|---|---|---|
| Tinglysning af skøde | Staten | 0,6% af ejerskiftesum + 1.850 kr. citeturn29view0 |
| Tinglysning af realkreditpant | Staten | 1,25% af pantsikret beløb + 1.825 kr. (2026). citeturn29view0 |
| Tinglysning af bankpant (hvis nyt pant) | Staten | Som ovenfor (1,25% + 1.825 kr.); alternativt kan underpant i ejerpantebrev udløse fast afgift (1.825 kr.). citeturn29view0 |
| Lånesagsgebyr (realkredit) | Realkreditinstitut | Fast beløb (eksempel: 3.500 kr.). citeturn30view0 |
| Afregningsprovision (realkredit) | Realkreditinstitut | Typisk % af kursværdi (fx 0,15% i standardpris). citeturn30view0turn19search8 |
| Kursfradrag ved udbetaling | Realkreditinstitut | Fx 0,20 kurspoint ved udbetaling (varierer pr. instituts prisblad). citeturn30view0turn19search3 |
| Bankens dokument- og vurderingsgebyrer | Bank | Eksempel: dokumentgebyr 4.200 kr. og vurdering 2.262,50 kr. citeturn7search17 |

### Scenarier for samlet månedlig ydelse

For at opfylde dit krav om fire scenarier trækker jeg en klar skillelinje:  
- “Ingen banklån” antager, at du lægger **20% udbetaling**, så hele finansieringen kan ligge i realkredit (80%).  
- “Med banklån” antager dit default (5% udbetaling) og banklån på 15%.

**Nøgletal brugt i scenarierne (realkredit):**  
- Fast rente: effektiv ca. 4,09% (4% obligationslån) citeturn14view0  
- Kort variabel: ca. 2,41% (kort rente i 1. halvår 2026) citeturn23view0  
- Bidrag (80% belåning, helårsbolig): fast rente ca. 0,575% p.a. og kort rente ca. 0,75% p.a. (vægtet). citeturn15view0  

**Nøgletal brugt i scenarierne (bank):**  
- Banklån rente: antaget 5,5% (ligger inden for publiceret spænd) citeturn7search17  
- Banklån løbetid: antaget 20 år (stresstest/efterfinansiering på højst 20 år er en typisk ramme i tilsynsvejledning ved vækstområder, og mange banker ligger i dette leje). citeturn31view0  

#### Resultat: finansieringsydelse (før skat, ekskl. boligskatter og forsikring)

| Scenario | Realkredit (md.) | Banklån (md.) | Samlet finansiering (md.) |
|---|---:|---:|---:|
| Fast rente, ingen banklån | ca. 14.9 t.kr. | 0 | ca. 14.9 t.kr. |
| Kort variabel, ingen banklån | ca. 12.7 t.kr. | 0 | ca. 12.7 t.kr. |
| Fast rente + banklån | ca. 14.9 t.kr. | ca. 3.6 t.kr. | ca. 18.5 t.kr. |
| Kort variabel + banklån | ca. 12.7 t.kr. | ca. 3.6 t.kr. | ca. 16.3 t.kr. |

Forklaring: Realkreditbeløbet er 2.800.000 kr. over 30 år; banklånet er 525.000 kr. over 20 år. Bidrag er inkluderet i realkredit-ydelsen som en særskilt løbende omkostning. Bidragssatser og kort-rente konstruktion (CITA6 + tillæg) er baseret på publicerede kilder. citeturn15view0turn23view0turn14view0turn7search17

### Worked example med fuld månedlig “all-in” breakdown

Her er **måned 1** i default-eksemplet (5% udbetaling), hvor jeg også lægger **boligskatter** og **husforsikring** ind som illustrative standardposter.

**Skatteantagelser i eksemplet:**  
- Ejendomsværdiskat: 5,1 promille af 80% af ejendomsværdi (under progressionsgrænse). citeturn37view0  
- Grundskyld: promille afhænger af kommune; eksemplet bruger 8,0 promille og viser senere spændet i 2026. citeturn27search2turn38view0  

**Forsikringsantagelse i eksemplet:**  
- Husforsikring 6.000 kr./år (midterpunkt i et “få tusinde til mange tusinde”-spænd; varierer efter boligtype, alder, beliggenhed og dækninger). citeturn24search8turn24search4  

| Post (måned 1) | Fast rente + banklån | Kort variabel + banklån |
|---|---:|---:|
| Realkredit rente (ca.) | 9.543 kr. | 5.623 kr. |
| Realkredit afdrag | 3.970 kr. | 5.309 kr. |
| Realkredit bidrag | 1.342 kr. | 1.750 kr. |
| Banklån rente (ca.) | 2.406 kr. | 2.406 kr. |
| Banklån afdrag | 1.205 kr. | 1.205 kr. |
| **Finansiering i alt** | **ca. 18.466 kr.** | **ca. 16.294 kr.** |
| Ejendomsværdiskat (eksempel) | 1.190 kr. | 1.190 kr. |
| Grundskyld (eksempel) | 640 kr. | 640 kr. |
| Husforsikring (eksempel) | 500 kr. | 500 kr. |
| **All-in pr. måned (eksempel)** | **ca. 20.796 kr.** | **ca. 18.624 kr.** |

Bemærk: I praksis betales bidrag og renter ofte kvartalsvist/terminsvis afhængigt af institut og betalingsform, men det er meningsfuldt at omregne til månedlig gennemsnitsomkostning for budgetformål. citeturn15view0turn14view0turn23view0turn37view0turn36view0turn7search17

### Hvad ændrer sig ved 10 års afdragsfrihed?

Afdragsfrihed betyder, at du i perioden betaler renter + bidrag, men **ingen afdrag**; derefter skal restgælden afvikles på kortere tid, hvilket typisk giver en markant højere ydelse efter den afdragsfrie periode. citeturn21view0turn28search0turn15view0

I de publicerede produktvilkår ses afdragsfrihed typisk op til 10 år for flere standardprodukter, mens længere afdragsfrihed (fx op til 30 år) kan være betinget af lavere belåning (fx max 60%) og specifikke produkter. citeturn28search0

I tal (samme lånestørrelse, illustrativt):  
- **Fast rente**: ydelsen falder i de første 10 år, men stiger markant efterfølgende, fordi afviklingen komprimeres.  
- **Kort variabel**: samme mekanik, men med renterisiko oveni. citeturn21view0turn31view0

### Sensitivitet: rente- og bidragsændringer

Dette er den praktiske “stress test”, du bør bruge på dit budget:

- Hvis den **korte realkreditrente** stiger 1 procentpoint, kan månedlig ydelse på 2,8 mio. kr. (30 år) stige i størrelsesordenen ca. 1.500 kr. i starten (alt andet lige). Ved +2 procentpoint ca. 3.100 kr. i starten. citeturn31view0turn23view0  
- Hvis **banklånsrenten** stiger 1 procentpoint, stiger ydelsen på 525.000 kr. over 20 år typisk ca. 300 kr./md. i starten (alt andet lige). citeturn7search17  
- Hvis bidragssatsen ændrer sig +0,10 procentpoint, koster det i størrelsesorden ca. 233 kr./md. pr. 2,8 mio. kr. restgæld i starten (falder gradvist når du afdrager). Bidrag kan ændres over tid ifølge prisblade/forretningsbetingelser. citeturn15view0turn18view0turn17view0

## Boligskatter og øvrige løbende ejeromkostninger

### Ejendomsværdiskat

Ejendomsværdiskat er statslig skat på ejerboliger, der kan anvendes til beboelse af ejeren (rådighedsprincip). citeturn36view0

**Satser (hovedregel):** 5,1 promille op til grundbeløb/progressionsgrænse 9.200.000 kr. (2024-niveau; reguleres efter reglerne) og 14 promille af resten. citeturn37view0

Der findes overgangs-/nedslagsregler for visse ejendomme (fx erhvervet før 1. juli 1998). citeturn37view0

**Skatterabat (“skatterabat”)** ved overgangen til de nye boligskatter gælder i udgangspunktet kun, hvis ejendommen er overtaget senest 31. december 2023; købere fra 1. januar 2024 og frem er som udgangspunkt ikke omfattet af rabatten på ejendomsværdiskat. citeturn32view0

### Grundskyld

Grundskyld er en kommunal skat på grundværdi, men fra 2024 opkræves den af staten på kommunernes vegne. citeturn36view0

**Satsen (promillen)** fastsættes af kommunen, men:  
- der er et generelt loft (max 30 promille), og  
- der er et kommunespecifikt loft i perioden 2024–2028 (kommunen kan ikke sætte promillen over loftet i bilaget til ejendomsskatteloven; den kan sætte den lavere). citeturn38view0

**Hvor meget varierer promillen?**  
Skatteministeriets statistik over top 20 viser, at grundskyldspromillen i 2026 (lav/høj) ligger omkring 3,10 promille (fx Frederiksberg) op til 17,70 promille (fx Varde) blandt yderpunkterne. citeturn27search2

Der findes desuden en stigningsbegrænsningsmekanisme (loft over stigninger) i den nye grundskyld, som skal skabe tryghed om boligbeskatningen. citeturn6search0turn38view0

### Hvordan skatterne betales og timing

Boligskatter i det nye system hænger tæt sammen med ejendomsvurderinger og (pga. forsinkelser) foreløbige beregningsgrundlag: ejendomsværdiskat opkrævet på baggrund af foreløbige beregningsgrundlag bliver reguleret, når endelige vurderinger foreligger. citeturn35view0turn37view0

For mange boligejere fremgår boligskatterne løbende via personskattesystemet (forskudsopgørelse/årsopgørelse), og betalingsmåde/tidspunkt fremgår af borgerrettet vejledning. citeturn6search12turn5search12turn38view0

### Øvrige løbende ejeromkostninger

**Forsikring**  
Som boligejer er bygningsbrandforsikring i praksis et krav fra långiver (nævnes direkte som krav i produktvilkår). citeturn21view0  
Prisen varierer fra “et par tusinde” til “mange tusinde” kr. årligt afhængigt af bolig, dækning og risiko. citeturn24search8turn24search4  
Et nyttigt benchmarksignal: en gennemsnitlig husstand bruger knap 15.900 kr. på skadesforsikringer (alle typer samlet) i 2022, hvilket illustrerer at forsikring kan være en stor løbende post i budgettet. citeturn24search18turn24search20

**Fællesudgifter ved ejerlejlighed (ejerforening)**  
Hvis du køber ejerlejlighed, kommer der normalt fællesudgifter til ejerforeningen (drift/vedligehold, forsikringer, administration, hensættelser). Niveauet kan i mange foreninger ligge omkring ca. 275 kr. pr. m² pr. år (illustrativt eksempel fra Bolius). citeturn24search7turn24search22  
Fællesudgifter kan være undervurderet, hvis foreningen ikke hensætter nok og i stedet må optage fælleslån. citeturn24search7

**Forsyning og drift (ikke skatter, men ofte “uundgåelige”)**  
El, varme, vand/spildevand, renovation, internet, samt løbende vedligehold (hus: tag/installationer/udvendigt; lejlighed: indvendigt + fælles via foreningen). Disse poster varierer så meget, at de sjældent kan estimeres meningsfuldt uden boligtype, størrelse og energiforhold; de bør dog altid indgå i rådighedsbudgettet. citeturn31view0turn24search1