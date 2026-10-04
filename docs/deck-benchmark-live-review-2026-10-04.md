# Live deck-builder pilot, 4 October 2026

Twelve paid AI requests covered Akali, Diana and Irelia under four fixed scenarios. Nine returned both versions: **18 accepted decklists**. Three expensive-core cases declined both versions with explanations. All returned lists passed the existing deterministic legality, quantities, ownership, favourite and priced-budget checks. No request failed. Measured token-usage estimates total **12.04 SEK**, excluding taxes and fees.

This is construction evidence, not proven competitive quality. Each case ran once, with synthetic inventory and prices. Only three champions with reviewed engine annotations were sampled. No games, independent player reviews, other-legend live tests or controlled before/after comparison were performed. The report below is an assistant desk review.

## Findings and strategic compromises

| Scenario | Akali | Diana | Irelia |
|---|---|---|---|
| Complete reference owned | Both versions preserve official LA reference | Both preserve official LA reference | Owned preserves mobile tempo; budget switches to Heron, purchasing 13 missing copies for 130 synthetic SEK. Coherent alternative, not demonstrated upgrade |
| Unknown price | Owned swaps flex interaction for protection; budget switches to reported Shanghai movement/empower strategy with weaker source evidence | Main engine unchanged; unavailable sideboard Acceptable Losses dropped or replaced by proactive Ravenbloom Prefect | Owned replaces cheap En Garde with costlier Akali Silent; budget switches to heavier Heron strategy |
| Fun favourite | Baccai Sandspinner adds costly empower threats, loses recovery/protection slots | Ahri Inquisitive replaces bounce/filtering/denial with battlefield Might reduction; not standalone removal | Sona Harmonious provides delayed end-step rune refresh, at the cost of cheap interaction and ready enablers |
| Expensive core | Missing Shuriken Flip; supplied alternatives retain the same engine dependency | Missing Ravenbloom Student across supplied strategy groups | Missing Defiant Dance in mobile and Heron strategies |

The 18 accepted lists retain reviewed core quantities: Akali's three Shuriken Flips and three Astral Herons; Diana's three Students, Moonfalls and Hwei; Irelia's three Defiant Dances, plus three Herons when using that strategy. Chosen champions are checked separately. This verifies adherence to supplied annotations, not their completeness.

The refusals are appropriate under the supplied reviewed strategy annotations and synthetic prices (1001 SEK per missing essential copy against a 1000 SEK budget). They do not prove no other playable strategy exists. The evaluator's `correctImpossibleRefusals` metric is zero because it tracks the unsampled empty-collection/zero-budget scenario, not these annotation-dependent strategic refusals.

Equipment data warrants a separate audit: Boots of Swiftness and Guardian Angel currently contain Equip text and no Might value, while Sterak's Gage contains Quick-Draw/Equip and no Might value. The model disclosed this and avoided guessing combat bonuses or effects from names. These outputs cannot establish that every printed Equipment property is represented correctly.

## Changes prompted by this review

The production instructions now require an explicit owned-versus-budget comparison, describe the budget as a ceiling rather than a spending target, and require a defensible reason for extra purchases. Switching reference strategy or pointing at tournament placement alone cannot establish an upgrade. Missing Equipment properties must be disclosed rather than inferred from names. These safeguards were added after the captured pilot; their effect has not been measured in another paid batch.

Temporary protected testing access was removed. Synthetic captures below contain no credentials, account IDs or provider request IDs. Test provider records were deleted while the billing ledger was retained.

## What would establish broader quality

1. Run the remaining fixed scenarios and legends, with repeated runs and realistic incomplete collections. Report failures and refusals as well as accepted lists.
2. Independently have experienced players review engine preservation, roles, resource demands, replacement accuracy and whether purchases improve the plan. Keep their ratings separate from deterministic checks.
3. Test difficult interactions and audit Equipment data against authoritative printed properties. Check rules coverage before claiming legality beyond supported exceptions.
4. Use actual playtesting to measure matchups. A future simulator needs its own rule-conformance tests and calibrated agents before its results can support strength claims.

The raw captured outputs, generation-time references, synthetic holdings and validated purchase calculations accompany this report in the JSON files. Prices below are test fixtures, not shopping quotes, and exclude shipping.

## Full captured lists

### blade dancer/complete

AI usage estimate: 1.01 SEK.

Feasibility selects the fully owned, reference-ready mobile-tempo list for ownedOnly: Heron has an owned core gap of three Astral Herons. For budget, the complete official Heron baseline is reference-ready at 130 SEK for 13 missing copies, including its sideboard and extra Chaos rune, using supplied prices dated 2026-10-04; shipping is excluded. This preserves reviewed engine quantities rather than relying on the optimistic one-Heron floor. Both lists reproduce a single strategy's official baseline without substitutions or a chosen-champion change. Mobile tempo remains my default competitive recommendation: its recent official overall result is stronger and it requires no purchases. The budget proposal is an affordable alternative resource engine, not a demonstrated upgrade or a reason to spend the full 1000 SEK. Sideboard gear answers are Prefect and Adaptatron; extra protection and threats allow matchup tuning. Equipment text is incomplete for tactical assessment, so no omitted abilities are invented.

#### Owned only

Irelia — owned mobile tempo

Win through repeated battlefield conquests and protected holds. Choosing Fervent with Discipline or Defiant Dance increases her Might and can trigger Blade Dancer's paid ready; conquering can ready the Legend for another activation. Preserve all three essential Defiant Dances. Tideturner swaps reposition Herder for draws or Akali for her battlefield-entry bonus; Ride the Wind combines movement and readying. Crab supplies early bodies and cards, while Charm and Gust clear scoring lanes. Defy and Not So Fast protect tempo; Hourglass saves a unit but recalls it rather than moving it. Star-Crossed can recover a friendly play-effect unit while bouncing an enemy. The trade-off against Heron is less late-game resource leverage, but no seven-energy engine deployment requirement.

Reference: [Irelia, Blade Dancer / Xeno](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Blade Dancer

CHOSEN
1 Irelia, Fervent

MAIN
2 En Garde
1 Gust
1 Twilight Shroud
2 Charm
3 Defiant Dance
3 Defy
1 Abandon
3 Discipline
1 Flash
1 Guardian Angel
3 Scuttle Crab
3 Tideturner
2 Zhonya's Hourglass
1 Not So Fast
2 Ride the Wind
2 Boots of Swiftness
1 Pyke, Returned
2 Star-Crossed
3 Stellacorn Herder
1 Vex, Apathetic
1 Akali, Silent

RUNES
6 Calm Rune
6 Chaos Rune

BATTLEFIELDS
1 Targon's Peak
1 Sunken Temple
1 Abandoned Hall

SIDEBOARD
1 Decree of Focus
1 Not So Fast
1 Switcheroo
1 Pyke, Returned
2 Ravenbloom Prefect
2 Adaptatron
1 Vex, Apathetic
1 Akali, Silent
```

Limitations: ['Limited evidence: two mobile-tempo lists and one confirmed event; the official baseline placed second on 2026-09-27, not a predicted result for you.', 'Energy curve: mostly 1–3-energy support, 4-energy Herder/Vex/Akali and 5-energy Fervent. Reserve power for counters, movement and Legend readying.', 'The 6/6 rune split balances both domains; repeated readying also needs power, plus energy to reset the Legend after conquering.', 'Flexible slots are singleton answers and sideboard roles; retain Dance redundancy and the movement/draw package when tuning.', 'Supplied Boots and Guardian Angel text shows only Equip. No additional movement or revival effect is assumed.']

Replacements: []

#### Budget version

Irelia — budget Heron alternative

Score early with inexpensive units and Irelia's choosing/readying engine, then establish a seven-Might Heron at a battlefield to support holds and discounted interaction. Keep all three Herons and all three essential Defiant Dances. Deploy Heron to base, then move it normally, with Ride the Wind, or through Tideturner's swap with a unit already at a battlefield. With Heron established, Discipline on a friendly unit can be the first card, enabling a second-card Rebuke discounted by two energy and two power. Herder draws through movement; Crab and Poro help bridge deployment. Defy, Not So Fast and Hourglass protect the investment, while Star-Crossed offers emergency recovery at the cost of redeployment. Compared with mobile tempo, this accepts slower setup and fewer cheap tricks for a larger body and recurring resource discounts.

Reference: [Irelia, Blade Dancer / TM2](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Blade Dancer

CHOSEN
1 Irelia, Fervent

MAIN
3 Astral Heron
3 Boots of Swiftness
1 Charm
3 Defiant Dance
3 Defy
3 Discipline
1 Gust
2 Lonely Poro
1 Not So Fast
1 Pyke, Returned
2 Rebuke
1 Ride the Wind
2 Scuttle Crab
2 Star-Crossed
3 Stellacorn Herder
1 Switcheroo
3 Tideturner
1 Vex, Apathetic
3 Zhonya's Hourglass

RUNES
5 Calm Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Sunken Temple
1 Targon's Peak

SIDEBOARD
1 Abandon
1 Adaptatron
1 Decree of Focus
1 Gust
1 Not So Fast
3 Ravenbloom Prefect
1 Star-Crossed
1 Vex, Apathetic
```

Limitations: ['Limited evidence: three Heron lists and one verified event. This official baseline placed fifth on 2026-09-27; that does not establish superiority over mobile tempo.', 'Energy curve: 1–3-energy interaction and early bodies, 4-energy Herder/Vex, 5-energy Fervent, then three 7-energy Herons.', "Heron's discount requires battlefield presence and first-card sequencing each turn; it does not discount itself during initial deployment.", 'The 5/7 rune split supports Chaos-heavy interaction. Rebuke and unhidden Switcheroo each require two power before discounts.', 'Flexible slots include Poro, singleton answers and sideboard choices; cutting Herons would reduce engine redundancy rather than merely trim price.', "Supplied Boots text shows only Equip; no movement ability is assumed. Hourglass recall does not trigger Herder's movement draw."]

Replacements: []

### blade dancer/expensive_core

AI usage estimate: 0.77 SEK.

Neither proposal is feasible without removing a reviewed essential engine card. I compared mobile tempo and Heron separately: mobile tempo has the stronger supplied event result (2nd overall at LA, 2026-09-27), while Heron placed 5th. Owned-only: both require Defiant Dance, with zero confirmed copies; Heron also lacks all three Astral Herons. Budget: even one Defiant Dance costs 1,001 SEK, exceeding your 1,000 SEK limit; the reviewed three-copy packages are therefore unavailable. En Garde and Discipline can target Irelia to enable Blade Dancer's ready effect, but neither reproduces Dance's cheap Reaction combining a friendly boost with an enemy reduction. Substituting them solely for price would remove the reviewed engine, not preserve it. Buying Herons does not resolve that shared gap, and no alternative strategy cluster was supplied. Evidence is limited to two mobile-tempo and three Heron lists, each covering only one verified event; it does not establish adapted-deck strength. Confirm additional Dance holdings or revise its price or the budget to enable a coherent proposal.

#### Owned only

No deck proposed.

#### Budget version

No deck proposed.

### blade dancer/fun_favourite

AI usage estimate: 1.08 SEK.

Feasibility first: ownedOnly selects mobile tempo because the official baseline is entirely owned and its reviewed core is intact; Heron lacks all three reviewed Astral Herons. Budget independently selects mobile tempo too: both engines are affordable, but its cheaper deployment and movement-draw plan naturally support central Sona. Heron instead requires deploying and protecting a seven-energy battlefield unit, then sequencing a cheap first card to discount the next; an affordable core alone is not a reason to switch engines. The September 27 official mobile reference finished second overall, versus fifth for the official Heron reference; that supports baseline preference, not a strength prediction for these adaptations. Both preserve Fervent as chosen and all three Defiant Dances. Budget purchases only Sona redundancy and leaves the remaining budget unused rather than introducing another engine. Evidence is limited: mobile tempo has two distinct supplied lists from only one confirmed event. Equipment effects beyond the supplied text are not assumed.

#### Owned only

Sona's Mobile Dance — Owned

Win through repeated conquests and protected holds. Make Sona your resource anchor: deploy her to a battlefield through Tideturner's swap or Ride the Wind, then protect her so her end-step rune refresh funds opposing-turn interaction. Targeting a friendly unit with Discipline or Defiant Dance enables Blade Dancer's paid ready; Fervent gains Might when chosen and readied. Conquering can ready the Legend for another sequence. Herder turns movement into cards; Crab supplies early draw and uncontested scoring. Charm and Gust clear early lanes, while Defy and Not So Fast protect your board. Essential Defiant Dance remains at full redundancy. Units cost 2–5 energy; most spells cost 1–3, with regular one-power demands and additional power needed for Legend readies. Preserve runes rather than spending all power immediately. Shroud protects Sona; Hourglass saves a unit but recalls it, interrupting battlefield value. Abandon is the flexible cut: you lose unrestricted counter coverage to make Sona central. Sideboard gear answers and extra Vex/Akali adjust interaction without changing the movement plan.

Reference: [Irelia, Blade Dancer / Xeno](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Blade Dancer

CHOSEN
1 Irelia, Fervent

MAIN
1 Sona, Harmonious
2 En Garde
1 Gust
1 Twilight Shroud
2 Charm
3 Defiant Dance
3 Defy
3 Discipline
1 Flash
1 Guardian Angel
3 Scuttle Crab
3 Tideturner
2 Zhonya's Hourglass
1 Not So Fast
2 Ride the Wind
2 Boots of Swiftness
1 Pyke, Returned
2 Star-Crossed
3 Stellacorn Herder
1 Vex, Apathetic
1 Akali, Silent

RUNES
6 Calm Rune
6 Chaos Rune

BATTLEFIELDS
1 Targon's Peak
1 Sunken Temple
1 Abandoned Hall

SIDEBOARD
1 Decree of Focus
1 Not So Fast
1 Switcheroo
1 Pyke, Returned
2 Ravenbloom Prefect
2 Adaptatron
1 Vex, Apathetic
1 Akali, Silent
```

Limitations: ['Only one confirmed Sona: Crab, Discipline and Herder help find her, but the resource-anchor plan is not reliably available every game.', 'Sona refreshes existing runes only at your end step; she neither accelerates deployment nor restores runes recycled for power.', "Mobile tempo has only two supplied lists and one confirmed event: limited evidence, not proof of this adaptation's competitive strength.", 'Hourglass recall is not movement and does not trigger Herder; saving Sona also switches off her battlefield refresh until redeployed.']

Replacements: [{"fromCardId": "abandon", "toCardId": "sona harmonious", "reason": "Use the owned favourite as a battlefield resource anchor supporting protection and opposing-turn reactions.", "compromise": "Lose a broad counter and Predict. Defy has cost limits, and Not So Fast only covers effects choosing friendly units or gear; Sona needs deployment and protection."}]

#### Budget version

Sona's Mobile Dance — Budget

Win through mobile conquests followed by defended holds, with three Sona copies making the favourite a recurring resource anchor. Tideturner relocates Sona or Herder; Ride the Wind moves and readies them. Sona at a battlefield refreshes runes at your end step for opposing-turn counters and combat tricks. Discipline and essential Defiant Dance choose friendly units to enable Blade Dancer's paid ready; Fervent gains Might from both choosing and readying. Conquests can reset the Legend, while Herder movement and Crab draw sustain the hand. Charm and Gust provide early displacement; Defy, Not So Fast and Shroud defend established units. The energy curve remains 2–5 for units and mostly 1–3 for spells, but replacing a cheap trick increases deployment demands. Keep power available for counters and Legend activations; Sona cannot recover recycled runes. Hourglass and Star-Crossed preserve threatened units at the cost of redeployment. Abandon, one En Garde and main-deck Akali are flexible cuts: more Sona redundancy means less broad counter coverage, fewer cheap ready enablers and less independent attacking pressure.

Reference: [Irelia, Blade Dancer / Xeno](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Blade Dancer

CHOSEN
1 Irelia, Fervent

MAIN
3 Sona, Harmonious
1 En Garde
1 Gust
1 Twilight Shroud
2 Charm
3 Defiant Dance
3 Defy
3 Discipline
1 Flash
1 Guardian Angel
3 Scuttle Crab
3 Tideturner
2 Zhonya's Hourglass
1 Not So Fast
2 Ride the Wind
2 Boots of Swiftness
1 Pyke, Returned
2 Star-Crossed
3 Stellacorn Herder
1 Vex, Apathetic

RUNES
6 Calm Rune
6 Chaos Rune

BATTLEFIELDS
1 Targon's Peak
1 Sunken Temple
1 Abandoned Hall

SIDEBOARD
1 Decree of Focus
1 Not So Fast
1 Switcheroo
1 Pyke, Returned
2 Ravenbloom Prefect
2 Adaptatron
1 Vex, Apathetic
1 Akali, Silent
```

Limitations: ['Confirmed missing-card spend is 20 SEK, excluding shipping; no other purchases are required.', 'Three Sona copies improve access and replacement after removal, but multiple copies can crowd the four-energy deployment slot.', "Sona's end-step refresh needs battlefield survival and existing runes; it is not immediate ramp or a replacement for power management.", 'Removing one En Garde reduces cheap targeting-enabler redundancy; all three essential Defiant Dances remain.', 'Main-deck Akali is removed; the owned sideboard copy remains available for matchups needing a resilient mobile attacker.', 'Only two supplied mobile-tempo lists and one confirmed event support this baseline; the Sona adaptation has no verified tournament result.']

Replacements: [{"fromCardId": "abandon", "toCardId": "sona harmonious", "reason": "Establish the favourite as the resource anchor instead of a situational counter slot.", "compromise": "Lose unrestricted spell-counter coverage and Predict. Remaining counters are narrower, and Sona requires battlefield access before generating value."}, {"fromCardId": "en garde", "toCardId": "sona harmonious", "reason": "Trade one flexible combat trick for a second Sona, improving access without reducing Defiant Dance.", "compromise": "Lose a one-energy targeting/ready enabler and up to +2 Might for a lone unit. Another four-energy unit makes early hands more deployment-heavy."}, {"fromCardId": "akali silent", "toCardId": "sona harmonious", "reason": "Use a third Sona to sustain the favourite-led plan after removal; retain Akali as a sideboard option.", "compromise": "Lose Akali's protection outside combat and +2 Might on battlefield entry. Sona offers delayed resources rather than the same immediate attacking pressure."}]

### blade dancer/unknown_price

AI usage estimate: 1.03 SEK.

Feasibility selects mobile tempo separately for ownedOnly: its complete reviewed core is owned, whereas Heron has a three-copy core gap. Xeno's official overall second-place list is the baseline, with one coherent substitution for the unpriced missing En Garde and a reduced optional sideboard. No purchases are needed. For budget, Heron is reference-ready: TM2's complete list, including its sideboard and rune adjustment, requires SEK 130 in confirmed missing-copy purchases, within SEK 1,000; shipping is excluded. Mobile tempo's exact reference remains price-unresolved, although its adapted engine is viable. Heron is chosen for a fully priced, unchanged official baseline—not inventory percentage or pooled card frequencies. Both retain Fervent as chosen champion. Mobile tempo emphasizes cheaper movement and targeting turns; Heron adds a heavier deployment requirement in exchange for next-card discounts. Evidence is limited within each strategy, and neither proposal is claimed to have proven tournament strength.

#### Owned only

Owned Irelia Mobile Tempo

Win through repeated conquers and protected holds, not a large finisher. Choosing a friendly unit lets Blade Dancer ready it for power; conquering can ready the Legend again for energy. Fervent gains Might from both choosing and readying. Keep all three essential Defiant Dances: their opposing Might swings win combat and can bring an enemy into Gust range. Discipline supplies targeting, Might and replacement cards. Tideturner and Ride the Wind move Stellacorn Herder for draw or Akali for her battlefield-entry boost; Flash rescues units and also triggers Herder's movement draw. Charm clears scoring lanes, while Defy and Not So Fast protect commitments. Zhonya preserves a threatened unit but recalls it rather than moving it. The extra Akali replaces one cheap combat enabler with another scoring threat; the mobile engine remains intact, but explosive low-resource turns become less redundant.

Reference: [Irelia, Blade Dancer / Xeno](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Blade Dancer

CHOSEN
1 Irelia, Fervent

MAIN
1 En Garde
1 Gust
1 Twilight Shroud
2 Charm
3 Defiant Dance
3 Defy
1 Abandon
3 Discipline
1 Flash
1 Guardian Angel
3 Scuttle Crab
3 Tideturner
2 Zhonya's Hourglass
1 Not So Fast
2 Ride the Wind
2 Boots of Swiftness
1 Pyke, Returned
2 Star-Crossed
3 Stellacorn Herder
1 Vex, Apathetic
2 Akali, Silent

RUNES
6 Calm Rune
6 Chaos Rune

BATTLEFIELDS
1 Targon's Peak
1 Sunken Temple
1 Abandoned Hall

SIDEBOARD
1 Decree of Focus
1 Not So Fast
1 Switcheroo
1 Pyke, Returned
2 Ravenbloom Prefect
2 Adaptatron
1 Vex, Apathetic
```

Limitations: ['Only two supplied mobile-tempo lists and one verified event: limited evidence. The September 27 finalist result belongs to the reference, not this adaptation.', 'Curve: early 2-energy Crab/Tideturner, 3–4-energy support and threats, then 5-energy Fervent. Most interaction costs 1–3 energy; reserve power for counters and Legend readiness.', "The 6/6 rune split supports both domains. Targeting, equipping and repeated readiness compete for power; Targon's Peak refunds runes only at turn end.", 'Flexible slots are the extra Akali, Abandon and situational interaction. Do not cut Defiant Dance merely for convenience; Herder/Tideturner redundancy sustains recovery.', 'Supplied Boots and Guardian Angel text lists only Equip. Their reference roles are retained, but no unstated movement or resurrection effect is assumed.']

Replacements: [{"fromCardId": "en garde", "toCardId": "akali silent", "reason": "The second En Garde is neither owned nor priced. Promote the owned sideboard Akali into main as a movement-payoff threat; omit her sideboard slot.", "compromise": "Lose one 1-energy Reaction that cheaply chooses Fervent and enables Legend readiness. Gain a 4-energy, 1-power threat; early trick density falls and deployment becomes heavier."}]

#### Budget version

Budget Irelia Heron — TM2 Baseline

Use TM2's complete September 27 reference without replacements. Win by establishing protected battlefield threats, then converting Heron's discounts into efficient interaction and repeated scoring. Preserve three Astral Herons and three essential Defiant Dances: this is the full reviewed engine, not a one-copy affordability floor. Deploy Heron, then move it to a battlefield before a later turn's first card. A cheap first card such as Discipline or Defy triggers a discount of 2 energy and two power on the next card, making Rebuke, Star-Crossed or Switcheroo efficient follow-ups. Tideturner supplies deployment swaps and Herder movement draw; choosing Fervent enables Blade Dancer readiness and additional Might. Crab replaces itself, Poro contests early, and Charm/Gust disrupt lanes. Counters and three Hourglasses protect expensive commitments; Star-Crossed can rescue a friendly unit while removing an enemy. Compared with mobile tempo, this plan accepts slower deployment for a 7-Might threat and sustained resource efficiency.

Reference: [Irelia, Blade Dancer / TM2](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Blade Dancer

CHOSEN
1 Irelia, Fervent

MAIN
3 Astral Heron
3 Boots of Swiftness
1 Charm
3 Defiant Dance
3 Defy
3 Discipline
1 Gust
2 Lonely Poro
1 Not So Fast
1 Pyke, Returned
2 Rebuke
1 Ride the Wind
2 Scuttle Crab
2 Star-Crossed
3 Stellacorn Herder
1 Switcheroo
3 Tideturner
1 Vex, Apathetic
3 Zhonya's Hourglass

RUNES
5 Calm Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Sunken Temple
1 Targon's Peak

SIDEBOARD
1 Abandon
1 Adaptatron
1 Decree of Focus
1 Gust
1 Not So Fast
3 Ravenbloom Prefect
1 Star-Crossed
1 Vex, Apathetic
```

Limitations: ["Only three supplied Heron lists and one verified event: limited evidence. TM2's official overall fifth place is stronger evidence than community popularity, but proves no future result.", 'Curve: 2-energy early units, 3–4-energy support, 5-energy Fervent and 7-energy Heron. Drawing expensive threats early can delay pressure; protect your deployment window.', "The 5/7 rune split supports Calm counters and Chaos's two-power spells. Budget power for Legend readiness; Heron must be at a battlefield when the first-card trigger occurs.", "Heron's discount affects the next card, not itself or every subsequent card. Cheap first-card sequencing and protection matter; losing Heron removes that resource advantage.", 'Gust, Charm, bounce counts and sideboard choices are flexible. Keep the reviewed three-copy Heron/Dance core; Hourglass saves units but recalls them without movement triggers.', 'Supplied Boots text lists only Equip, so no unstated movement ability is assumed. Confirm complete Equipment wording before tournament play.']

Replacements: []

### rogue assassin/complete

AI usage estimate: 1.06 SEK.

Feasibility selects movement/empower separately for both proposals: it is the only supplied strategy, and the complete Los Angeles reference is ready from confirmed holdings. I retain it for both, prioritizing Riot's verified seventh-place finish over reported first-place evidence, not selecting by inventory percentage. Spending is unnecessary. Early interaction comes from Flip, Marai's battlefield play damage and Defy; Back Off disables combat damage, while Discipline protects combat and replaces itself. The energy curve starts with one–two-energy spells and bodies, develops Akali at three and Herder/Kai'Sa at four, then reaches five–seven-energy threats. Most printed power costs are zero or one; Falling Star and Gage require two. Budget separately for Akali's empowerment, Legend empowerment and Flow. Flexible singleton roles are Block's defensive Tank, Blitzcrank's Tank, Witness's combat growth and Forerunner's death recovery. Sideboard Irelia rewards choosing/readying, Rake answers gear, and counters/combat tricks address matchups. No replacements means no strategic sacrifices; preserve the reviewed core quantities.

#### Owned only

Akali — owned Los Angeles baseline

Win through repeated conquers and protected holds, using movement to turn combat into damage and cards. Empowered Akali deals 2 whenever she moves; Shuriken Flip adds damage and another move, with Flow providing a later reuse. Void Gate increases each damage instance against units there. Empowering the Legend lets its own-turn showdown retreat ready the returning unit for redeployment; moving Herder draws a card. At a battlefield, Heron rewards a cheap first card with a discounted second, also aligning with Darius's second-card ready trigger. Crab, Herder and Kai'Sa sustain cards; Defy, Not So Fast and Hourglass preserve threats. Keep the reviewed Akali/Flip/Heron core intact. The trade-off is a slower, resource-sensitive setup rather than all-in aggression.

Reference: [Akali, Rogue Assassin / HXN TEMPETE一些雪](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Rogue Assassin

CHOSEN
1 Akali, Deadly Weapon

MAIN
3 Shuriken Flip
3 Falling Star
1 Darius, Trifarian
3 Kai'Sa, Survivor
2 Long Sword
1 Ferrous Forerunner
3 Defy
1 Block
3 Discipline
1 Blitzcrank, Impassive
3 Zhonya's Hourglass
1 Not So Fast
1 Sterak's Gage
2 Back Off
2 Scuttle Crab
1 Mournful Witness
2 Mischievous Marai
3 Stellacorn Herder
3 Astral Heron

RUNES
6 Fury Rune
6 Calm Rune

BATTLEFIELDS
1 Sigil of the Storm
1 Void Gate
1 Forgotten Monument

SIDEBOARD
2 Ferrous Forerunner
2 Irelia, Fervent
1 Akali, Silent
1 Decree of Focus
1 Not So Fast
1 Against the Odds
2 Disarming Rake
```

Limitations: ['Evidence is limited: nine supplied independent lists across three events, fewer than ten. Only one has official overall-placement evidence.', 'The official baseline placed seventh on 2026-09-27; that result does not predict your win rate or establish performance in your local field.', 'Heron must reach a battlefield before its discount works. Reserve interaction rather than spending everything on its seven-energy deployment.', 'Hourglass recalls rather than moves, so its rescue does not trigger Akali or Herder movement abilities.', 'Sigil forces rune recycling on conquest; Forgotten Monument cannot score before your third turn.', 'Supplied Equipment text omits static combat bonuses. No unstated Equipment Might bonus is assumed.']

Replacements: []

#### Budget version

Akali — budget retained, no purchases

Retain the fully owned official baseline rather than spend without a demonstrated strategic need. Score through conquers and holds while empowered Akali and Shuriken Flip clear defenders; Void Gate amplifies their damage. Flip's Flow and Herder's movement draw support repeat engagements. The empowered Legend retreats and readies a unit during your own-turn showdown, enabling redeployment without sacrificing it. Heron at a battlefield turns a cheap first card into a discounted second; Darius rewards that same sequence with extra Might and readiness. Kai'Sa supplies conquer draw, while counters and Hourglass protect your scoring units. No essential cards, engine redundancy or chosen champion are changed; the original setup and resource demands remain.

Reference: [Akali, Rogue Assassin / HXN TEMPETE一些雪](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Rogue Assassin

CHOSEN
1 Akali, Deadly Weapon

MAIN
3 Shuriken Flip
3 Falling Star
1 Darius, Trifarian
3 Kai'Sa, Survivor
2 Long Sword
1 Ferrous Forerunner
3 Defy
1 Block
3 Discipline
1 Blitzcrank, Impassive
3 Zhonya's Hourglass
1 Not So Fast
1 Sterak's Gage
2 Back Off
2 Scuttle Crab
1 Mournful Witness
2 Mischievous Marai
3 Stellacorn Herder
3 Astral Heron

RUNES
6 Fury Rune
6 Calm Rune

BATTLEFIELDS
1 Sigil of the Storm
1 Void Gate
1 Forgotten Monument

SIDEBOARD
2 Ferrous Forerunner
2 Irelia, Fervent
1 Akali, Silent
1 Decree of Focus
1 Not So Fast
1 Against the Odds
2 Disarming Rake
```

Limitations: ['No missing copies are required, so confirmed purchase cost is 0 SEK. The 1,000 SEK ceiling is not a spending target.', 'Evidence is limited to nine supplied independent lists; reported Shanghai and Fuzhou results are weaker evidence than the official Los Angeles placement.', 'A purchased alternative is not automatically stronger. No supplied evidence establishes that changing this baseline would improve your results.', "Heron's discount requires battlefield presence and a first-card setup; losing that unit removes the resource engine.", "Sigil's forced rune recycling can delay expensive deployment. Falling Star and Sterak's Gage also demand two power.", 'Hourglass rescues through recall, not movement; supplied Equipment text does not establish static combat bonuses.']

Replacements: []

### rogue assassin/expensive_core

AI usage estimate: 0.84 SEK.

The feasibility comparison leaves both proposals with a core gap in the only supplied strategy, Akali movement and empower. Owned-only has no Shuriken Flip; budget cannot buy even one at the supplied 1,001 SEK price within 1,000 SEK. The reviewed three-copy package costs 3,003 SEK. Flip combines damage, flexible friendly movement and Flow reuse, supporting Akali's movement damage, Stellacorn Herder's draw and repeated battlefield pressure. Resonating Strike requires a battlefield you already control; Forgotten Signpost requires another unit to exhaust at the destination. Neither preserves Flip's complete role or replay redundancy. Removing this essential card solely for price would undermine the supplied engine, so I cannot recommend either competitive proposal. No alternative strategy group was supplied. Evidence is limited to nine distinct lists: the strongest verified reference is Riot's September 27 list with seventh overall placement; the other eight results are reported evidence. These results do not establish an adaptation's strength. Confirmed owned Flips or a larger budget would allow reassessment.

#### Owned only

No deck proposed.

#### Budget version

No deck proposed.

### rogue assassin/fun_favourite

AI usage estimate: 1.12 SEK.

Feasibility offers only one strategy, core-ready for both proposals. Separately for each, I chose the fully owned Los Angeles baseline: Riot's verified overall seventh place is stronger evidence than reported results or a best-of-champion label. Its flexible slots accommodate the favourite without cutting chosen Akali, three Shuriken Flips or three Herons. Evidence is limited to nine distinct lists across three events; neither adaptation has established tournament strength. Early Crab/Witness bodies, Marai damage, Flip and Defy bridge into four-energy Herder/Kai'Sa, then five-to-seven-energy threats. Falling Star's two-power cost and protection demand careful rune reserves; retain the baseline's balanced domains. The budget version shifts slightly upward in energy while Shroud lowers protection costs. Flexible slots are equipment, Block/Shroud and the recovery threat; preserve movement, draw and protection density. Both keep the chosen champion unchanged. The sideboard offers recovery bodies, Irelia for targeting/ready synergies, Fury combat protection, extra counters and gear removal; never board out every Sandspinner in fun mode.

#### Owned only

Owned Akali: Sandspinner Strike

Conquer and hold with protected attackers, making your owned Sandspinner the priority heavy threat: empowered, it attacks at 8 Might with Deflect. Empower the Legend to extract it during your own-turn showdown and ready it for another deployment. Shuriken Flip supplies damage and movement; moving chosen Akali adds damage, while moving Stellacorn Herder draws cards. Void Gate increases each damage instance against units there. Establish Astral Heron at a battlefield, then play a cheap first card to discount a substantial second play; this sequencing also supports Darius. Kai'Sa supplies conquest draw. Defy, Not So Fast and Hourglass protect your investment. Replacing Forerunner trades its death-trigger recovery bodies for a stronger single attacker; the movement engine remains intact.

Reference: [Akali, Rogue Assassin / HXN TEMPETE一些雪](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Rogue Assassin

CHOSEN
1 Akali, Deadly Weapon

MAIN
3 Shuriken Flip
3 Falling Star
1 Darius, Trifarian
3 Kai'Sa, Survivor
2 Long Sword
1 Baccai Sandspinner
3 Defy
1 Block
3 Discipline
1 Blitzcrank, Impassive
3 Zhonya's Hourglass
1 Not So Fast
1 Sterak's Gage
2 Back Off
2 Scuttle Crab
1 Mournful Witness
2 Mischievous Marai
3 Stellacorn Herder
3 Astral Heron

RUNES
6 Fury Rune
6 Calm Rune

BATTLEFIELDS
1 Sigil of the Storm
1 Void Gate
1 Forgotten Monument

SIDEBOARD
2 Ferrous Forerunner
2 Irelia, Fervent
1 Akali, Silent
1 Decree of Focus
1 Not So Fast
1 Against the Odds
2 Disarming Rake
```

Limitations: ['Only one confirmed Sandspinner is available: it is the priority finisher when drawn, but cannot be a reliably recurring centerpiece every game.', 'Sandspinner costs 6 energy, then 5 to empower above four runes. Its cheaper empower window is situational; do not sacrifice development just to maintain it.', "Hourglass recalls rather than moves: it preserves a unit but does not trigger Akali or Herder's movement abilities.", "Long Sword and Sterak's supplied text omits any attached stat benefit; no unstated equipment bonus is assumed."]

Replacements: [{"fromCardId": "ferrous forerunner", "toCardId": "baccai sandspinner", "reason": "Replace the main-deck recovery threat with the favourite as the protected, empowered attacker.", "compromise": "Lose two replacement Mechs on death. Sandspinner needs additional empower energy and concentrates your threat in one body."}]

#### Budget version

Budget Akali: Sandspinner at the Altar

Keep the official movement engine, but make Sandspinner a more frequent protected finisher with a second copy. Empowered Sandspinner attacks at 8 Might; the empowered Legend can withdraw and ready it during your own-turn showdown. Risen Altar reduces its empower cost while it is there, or removes chosen Akali's empower power requirement. Twilight Shroud shields a key attacker from enemy targeting and can be reused through Flow. Shuriken Flip and Akali clear defenders, Herder turns movement into draw, and Kai'Sa rewards conquest. Battlefield Heron discounts your second card after a cheap opener, helping deploy heavy threats without abandoning interaction. Compared with the owned list, gain favourite redundancy and targeted protection, but lose Block's defensive Tank package, Sterak's equipment option and Monument's scoring delay.

Reference: [Akali, Rogue Assassin / HXN TEMPETE一些雪](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Rogue Assassin

CHOSEN
1 Akali, Deadly Weapon

MAIN
3 Shuriken Flip
3 Falling Star
1 Darius, Trifarian
3 Kai'Sa, Survivor
2 Long Sword
2 Baccai Sandspinner
3 Defy
1 Twilight Shroud
3 Discipline
1 Blitzcrank, Impassive
3 Zhonya's Hourglass
1 Not So Fast
2 Back Off
2 Scuttle Crab
1 Mournful Witness
2 Mischievous Marai
3 Stellacorn Herder
3 Astral Heron

RUNES
6 Fury Rune
6 Calm Rune

BATTLEFIELDS
1 Sigil of the Storm
1 Void Gate
1 Risen Altar

SIDEBOARD
2 Ferrous Forerunner
2 Irelia, Fervent
1 Akali, Silent
1 Decree of Focus
1 Not So Fast
1 Against the Odds
2 Disarming Rake
```

Limitations: ['Confirmed missing-copy cost is 30 SEK using prices dated 2026-10-04; shipping is excluded. There is no need to spend the remaining budget.', 'Two Sandspinners increase favourite redundancy but also raise the energy curve. Heron discounts deployment, not activated empower costs.', "Risen Altar helps either player and only discounts units there. It does not discount the Legend's empower ability.", 'Shroud stops enemy targeting, not combat damage or untargeted effects. Hourglass remains the main death safeguard.']

Replacements: [{"fromCardId": "ferrous forerunner", "toCardId": "baccai sandspinner", "reason": "Make the favourite the primary heavy attacker without reducing reviewed movement-engine quantities.", "compromise": "Lose Forerunner's two-Mech death recovery; the replacement needs empower investment to gain its offensive and targeting defenses."}, {"fromCardId": "sterak s gage", "toCardId": "baccai sandspinner", "reason": "Add a second favourite threat instead of retaining a flexible Quick-Draw equipment slot.", "compromise": "Lose reactive equipment deployment and reuse. Gain another independent body, but with a higher energy commitment."}, {"fromCardId": "block", "toCardId": "twilight shroud", "reason": "Favor cheap, reusable targeting protection for Sandspinner, Akali or Heron.", "compromise": "Lose Hidden defensive Shield 3 and Tank redistribution. Shroud supplies only +1 Might and cannot prevent ordinary combat death."}, {"fromCardId": "forgotten monument", "toCardId": "risen altar", "reason": "Make unit empowerment easier at the battlefield where Sandspinner or chosen Akali is deployed.", "compromise": "Lose the early scoring lockout and give opponents access to the same empower discount."}]

### rogue assassin/unknown_price

AI usage estimate: 1.09 SEK.

Feasibility supports the same movement-and-empower strategy separately for both proposals; no other strategy group is supplied. OwnedOnly starts from the recent official seventh-place Los Angeles list, preserves its full reviewed core and replaces only the unavailable third Falling Star with owned protection. No purchases are required. Budget follows the recommended reference-ready Shanghai twelfth-place list without substitutions: all 18 missing copies have supplied prices, totalling SEK 180 against SEK 1,000, excluding shipping. Its two Falling Stars are already owned, so their unknown purchase price is irrelevant. This reference-ready choice preserves a complete engine rather than assuming that an affordable minimum package is enough. It is a different coherent variant, not a demonstrated upgrade over the owned list. Both retain Deadly Weapon as chosen champion. Evidence is limited to nine distinct lists across three events, below the requested ten-reference threshold; eight results are reported and one is official. These references do not establish either proposal's win rate.

#### Owned only

Akali — owned movement tempo

Win through repeated conquests and protected holds. Empower the Legend to retreat a unit from your attacking showdown and ready it for redeployment; moving Stellacorn Herder draws, while empowered Akali deals 2 on each move. Shuriken Flip combines removal and movement, with Flow providing another use; Void Gate amplifies its damage and Akali's pings. Keep the essential chosen Akali, three Flips and three Herons intact. Once Heron occupies a battlefield, play a cheap first card to discount the second card's energy and power; this also supports Darius's second-card ready trigger. Crab and Kai'Sa replenish cards, Marai supplies hidden interaction, and Forerunner leaves recovery bodies. Defy, Discipline and Not So Fast protect scoring units. Hourglass saves a unit, but its recall is not movement and triggers neither Akali nor Herder. The sole adaptation exchanges removal redundancy for targeted protection.

Reference: [Akali, Rogue Assassin / HXN TEMPETE一些雪](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Rogue Assassin

CHOSEN
1 Akali, Deadly Weapon

MAIN
3 Shuriken Flip
2 Falling Star
1 Darius, Trifarian
3 Kai'Sa, Survivor
2 Long Sword
1 Ferrous Forerunner
3 Defy
1 Block
3 Discipline
1 Blitzcrank, Impassive
3 Zhonya's Hourglass
2 Not So Fast
1 Sterak's Gage
2 Back Off
2 Scuttle Crab
1 Mournful Witness
2 Mischievous Marai
3 Stellacorn Herder
3 Astral Heron

RUNES
6 Fury Rune
6 Calm Rune

BATTLEFIELDS
1 Sigil of the Storm
1 Void Gate
1 Forgotten Monument

SIDEBOARD
2 Ferrous Forerunner
2 Irelia, Fervent
1 Akali, Silent
1 Decree of Focus
1 Against the Odds
2 Disarming Rake
```

Limitations: ["The curve starts with 2-energy bodies, reaches Herder/Kai'Sa at 4, then 5–7-energy threats. Deploy Heron before relying on its battlefield discount.", 'Reserve power for Flip, Defy and Not So Fast; Falling Star demands 2 power. Empowering Akali and the Legend competes with early deployment.', 'Early interaction is Flip, hidden Marai, Back Off and two Falling Stars. Losing the third Star weakens removal against larger or multiple threats.', "Block, Witness, Sterak's Gage and the second Not So Fast are flexible slots; preserve the movement engine and Herder draw package.", 'Not So Fast moves from the reference sideboard into main, leaving nine sideboard cards. Its total redundancy is unchanged.', 'This adaptation has no demonstrated event result; the official baseline finished seventh overall on 2026-09-27.']

Replacements: [{"fromCardId": "falling star", "toCardId": "not so fast", "reason": "The third Falling Star is unowned and unpriced. Move the owned sideboard Not So Fast into main to protect Akali, Heron and other scoring units.", "compromise": "Lose one two-instance damage spell and removal redundancy. Gain targeted spell/ability protection, not a removal substitute; retain two Falling Stars and all essential engine quantities."}]

#### Budget version

Akali — reference-ready Irelia movement

Use the complete Shanghai twelfth-place engine: conquer through movement, then protect units to hold. Gem Jammer grants temporary Ganking for battlefield-to-battlefield pressure; move Herder to draw or Akali to deal damage. Empowered Legend retreats and readies a showdown unit on your turn, enabling another deployment. Irelia gains Might whenever chosen or readied, linking Flip, Discipline, En Garde and the Legend's ready effect; Abandoned Hall adds spell-driven Might to a friendly unit there. Keep chosen Akali and all three essential Flips and Herons. With Heron at a battlefield, lead with a cheap card before a discounted second card; Noxus Hopeful also rewards playing another card first. Charm displaces defenders, Back Off shuts down combat damage, and counters protect the scoring board. Compared with the owned proposal, this trades Kai'Sa's conquer draw, Marai's damage and resilient Forerunner bodies for Ganking access and Irelia-focused combat scaling.

Reference: [Shanghai City Challenge · 12 place](https://riftboundfrance.fr/en/decks/s4-shanghai-city-challenge-2026-09-27-12th-ost-akali), 2026-09-27, Tournament result reported by source.

```text

LEGEND
1 Rogue Assassin

CHOSEN
1 Akali, Deadly Weapon

MAIN
3 Astral Heron
2 Back Off
2 Charm
3 Defy
3 Discipline
2 En Garde
2 Falling Star
3 Gem Jammer
3 Irelia, Fervent
2 Long Sword
1 Not So Fast
2 Noxus Hopeful
2 Scuttle Crab
3 Shuriken Flip
3 Stellacorn Herder
3 Zhonya's Hourglass

RUNES
6 Calm Rune
6 Fury Rune

BATTLEFIELDS
1 Abandoned Hall
1 Forgotten Monument
1 Sigil of the Storm

SIDEBOARD
3 Adaptatron
1 Against the Odds
1 Akali, Silent
2 Brittle Steel
1 Not So Fast
1 Thermo Beam
1 Void Seeker
```

Limitations: ['The curve uses 2-energy Crab/Jammer, 3-energy Akali, 4-energy Herder/Hopeful, 5-energy Irelia and 7-energy Heron. Hopeful can fall to 2 energy after another card.', "Keep power available for Charm, Flip and Defy; Falling Star requires 2 power. Heron's discount needs battlefield presence and correct first/second-card sequencing.", 'Early interaction is Charm, Flip, Back Off and Falling Star. Unlike the owned list, there is no hidden Marai damage or Void Gate damage amplification.', "En Garde and one Not So Fast are flexible protection slots. Reducing Jammer or Irelia changes this reference's movement and combat redundancy.", "Hourglass recall does not trigger movement draw or damage. Without Kai'Sa, card recovery relies more heavily on Crab, Discipline and Herder.", "The baseline's twelfth-place finish is reported by Riftbound France, not supplied as an official event verification."]

Replacements: []

### scorn of the moon/complete

AI usage estimate: 1.04 SEK.

I assessed the feasibility comparison separately for each proposal. Spell tempo is fully reference-ready from confirmed holdings. Recursion preserves the same reviewed core but adds Retreat-based protection/ramp, Consult the Past draw and a Watcher finish; its full reference is affordable at 150 SEK. The temporal variant adds Temporal Breach play-effect resets, notably for Fizz, and a higher-cost Watcher finish; it is affordable at 120 SEK. Neither has verified event results. For both proposals I therefore choose the complete, already-owned spell-tempo baseline backed by Riot's 2026-09-27 event list and overall 22nd place—not its best-of-champion label. Both lists intentionally match: there is no supported reason to spend merely to differentiate them. No replacements or strategic sacrifices are needed. Fewer than ten references and only one confirmed event limit the evidence; this recommendation is not a predicted win rate or a claim of proven tournament strength.

#### Owned only

Diana Hwei — owned event baseline

Win through conquering and holding with cheap bodies, spell-grown Students and Hwei; Vex at a battlefield delays opposing reinforcements. Preserve all three Students, Moonfalls and Hweis as the reviewed engine. Tideturner's swaps and Ride the Wind trigger Hwei: discard spells for cards, gear to ready runes, or units for +3 Might. Diana filters and draws spells in showdowns. Early Gust and Stupefy contest combat; Eclipse or Moonfall can lower enemies into Gust range. Hard Bargain protects key plays; Flash and Star-Crossed rescue units. Acceptable Losses kills your Fountain to generate another ready Sprite while attacking enemy gear. Sprites conquer but cannot survive their Temporary trigger to hold. Fizz replays cheap spells, still paying Power. Most plays cost 1–3 Energy; Vex costs 4 and Hwei 5 plus 1 Power. The Legend supplies showdown-only Energy; reserve Power for movement and interaction. Abandoned Hall rewards spells, Seat rewards spreading out, and Targon's Peak restores runes at turn end. Rebuke, Switcheroo and the gear package are flexible; cutting them sacrifices unrestricted bounce, combat reversal or burst bodies.

Reference: [Diana, Scorn of the Moon / ASC nalkpas](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Scorn of the Moon

CHOSEN
1 Diana, Lunari

MAIN
1 Acceptable Losses
2 Gust
3 Stupefy
1 Flash
2 Hard Bargain
3 Ravenbloom Student
3 Tideturner
3 Traveling Merchant
2 Ride the Wind
1 Smoke Screen
2 Sprite Fountain
1 Rebuke
1 Switcheroo
2 Eclipse
1 Fizz, Trickster
3 Moonfall
2 Star-Crossed
3 Vex, Apathetic
3 Hwei, Brooding Painter

RUNES
5 Mind Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Seat of Power
1 Targon's Peak

SIDEBOARD
1 Acceptable Losses
2 Decree of Insight
2 Turn to Dust
1 Up from the Deep
1 Fizz, Trickster
1 Star-Crossed
1 Tail-Cloaked Matriarch
1 Singularity
```

Limitations: ['Limited evidence: five strategy references represent four distinct main lists and one verified event; the official baseline placed 22nd on 2026-09-27.', 'Hwei needs movement and discard fuel. Drawing several expensive units without movement can slow deployment and recovery.', 'Rebuke and Switcheroo each require 2 Power. The Legend adds Energy, not Power; avoid spending all runes before interaction.', 'Stupefy and Smoke Screen cannot reduce Might below 1. Hard Bargain is a tax, not an unconditional counter.', "Sideboard Matriarch recovers eligible cheap units, not Hwei. Singularity's 6 Energy and 2 Power demand a slower-game resource reserve."]

Replacements: []

#### Budget version

Diana Hwei — budget retained

Retain the owned event baseline rather than spend without evidence of improvement. Score through Student-led early contests, Hwei movement value and Vex-supported holds. Keep three Students, Moonfalls and Hweis: no engine redundancy or chosen-champion change. Tideturner and Ride the Wind enable Hwei's draw, rune-readying and Might modes. Cheap spells grow Student and reward Abandoned Hall; Eclipse and Moonfall enable Gust against larger targets. Diana sustains spell access, while Fizz recasts spells costing at most 3 Energy but still requires their Power. Fountain plus Acceptable Losses supplies burst Sprites, not lasting holders. Flash, Star-Crossed and Hard Bargain protect deployment. The curve concentrates at 1–3 Energy before Vex at 4 and Hwei at 5 plus 1 Power; the Legend helps only during showdowns. Reserve Power for Ride the Wind, Moonfall and bounce; Targon's Peak readies runes only at turn end. Rebuke, Switcheroo and Fountain/Losses remain flexible, with unrestricted bounce, combat reversal and burst scoring respectively lost if removed.

Reference: [Diana, Scorn of the Moon / ASC nalkpas](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Scorn of the Moon

CHOSEN
1 Diana, Lunari

MAIN
1 Acceptable Losses
2 Gust
3 Stupefy
1 Flash
2 Hard Bargain
3 Ravenbloom Student
3 Tideturner
3 Traveling Merchant
2 Ride the Wind
1 Smoke Screen
2 Sprite Fountain
1 Rebuke
1 Switcheroo
2 Eclipse
1 Fizz, Trickster
3 Moonfall
2 Star-Crossed
3 Vex, Apathetic
3 Hwei, Brooding Painter

RUNES
5 Mind Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Seat of Power
1 Targon's Peak

SIDEBOARD
1 Acceptable Losses
2 Decree of Insight
2 Turn to Dust
1 Up from the Deep
1 Fizz, Trickster
1 Star-Crossed
1 Tail-Cloaked Matriarch
1 Singularity
```

Limitations: ['No purchases are recommended. Available budget alone does not establish that a community variant improves this baseline.', 'Evidence remains limited: five strategy references, four distinct main lists and one verified event, with an overall 22nd-place finish.', 'Movement and discard fuel constrain Hwei; the deck cannot replace lost battlefield presence with card draw alone.', 'Power-heavy bounce competes with movement and Moonfall. The Legend cannot cover Power costs.', 'Temporary Sprites are burst scorers; maintain permanent units for holds. Sideboard recovery does not directly resurrect Hwei.']

Replacements: []

### scorn of the moon/expensive_core

AI usage estimate: 0.82 SEK.

Neither constraint supports a coherent proposal from the supplied strategies. Spell tempo combines cheap spell-scaling pressure with Hwei movement; recursion adds spell recovery and replay; the temporal variant adds unit resets. Their reviewed engines all retain three Ravenbloom Students. OwnedOnly has none, and budget cannot buy even one: its supplied price is 1,001 SEK against 1,000 SEK available. Preserving the reviewed three-copy package would cost 3,003 SEK before other gaps. Removing Student entirely would sacrifice the cheap, repeatable spell-to-Might payoff; the supplied alternatives do not justify treating that essential role as replaceable. Switching among these strategies therefore does not resolve either constraint, and I will not pad a list with unrelated cards. Evidence is limited: spell tempo has five references but only four distinct main lists and one verified event, with an overall 22nd-place finish on 2026-09-27; recursion and temporal each have one community reference. None establishes the strength of an adaptation. Confirmed Student holdings, lower supplied prices, or another supported strategy would allow reassessment.

#### Owned only

No deck proposed.

#### Budget version

No deck proposed.

### scorn of the moon/fun_favourite

AI usage estimate: 1.11 SEK.

For each proposal, the feasibility comparison favors the spell-tempo baseline: its complete reference and reviewed core are owned. Recursion and temporal also have owned cores, but require additional purchases for their complete references and have only community evidence. Their engines were assessed separately: recursion adds Retreat/rune growth and Consult recovery; temporal uses Breach replay effects. Neither is needed to support Ahri's combat plan. Choose the official 2026-09-27 spell-tempo list, placed 22nd overall—not its best-of-Diana alias—as both baselines. OwnedOnly changes one flexible slot with zero purchases; budget buys only missing Ahri copies to increase favourite redundancy, not to exhaust the allowance. The spell-tempo group has five references but only four distinct main lists and one confirmed event: limited evidence, with no proven strength for either adaptation. Ahri is legal in main through Mind support, while Diana remains chosen. Abandoned Hall rewards the spell-combat plan, Seat of Power rewards expanding control, and Targon's Peak restores runes at turn end.

#### Owned only

Diana–Ahri: Owned Spell Tempo

Win through conquering and holding with spell-grown Students, Ahri-led combat and Hwei's movement value. Prioritize deploying Ahri: Tideturner exchanges her into position, while Ride the Wind moves and readies her for another combat. Resolve her enemy Might reduction before Moonfall or Eclipse to finish weakened units; it also brings larger enemies into Gust range. Flash and Star-Crossed protect her. Keep all three Students, Moonfalls and Hweis—the reviewed engine remains intact. Hwei movement turns discarded spells into extra draw, gear into rune readiness, or units into combat Might; Tideturner and Ride the Wind enable it. Vex restricts enemy deployment, Fizz reuses cheap spells, and Fountain supplies immediate attackers plus a death trigger for Acceptable Losses. The sacrifice is unconditional bounce: Ahri adds repeatable combat leverage but cannot replace Rebuke's reach.

Reference: [Diana, Scorn of the Moon / ASC nalkpas](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Scorn of the Moon

CHOSEN
1 Diana, Lunari

MAIN
1 Ahri, Inquisitive
1 Acceptable Losses
2 Gust
3 Stupefy
1 Flash
2 Hard Bargain
3 Ravenbloom Student
3 Tideturner
3 Traveling Merchant
2 Ride the Wind
1 Smoke Screen
2 Sprite Fountain
1 Switcheroo
2 Eclipse
1 Fizz, Trickster
3 Moonfall
2 Star-Crossed
3 Vex, Apathetic
3 Hwei, Brooding Painter

RUNES
5 Mind Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Seat of Power
1 Targon's Peak

SIDEBOARD
1 Acceptable Losses
2 Decree of Insight
2 Turn to Dust
1 Up from the Deep
1 Fizz, Trickster
1 Star-Crossed
1 Tail-Cloaked Matriarch
1 Singularity
```

Limitations: ['Ahri is a singleton: the plan prioritizes her when drawn, but cannot reliably find her. Star-Crossed/Flash preserve her; sideboard Matriarch can revive her.', 'Early interaction: Gust and Stupefy cost 1 energy; Hard Bargain protects key plays. Might reductions need sequencing around their minimum-1 clauses.', 'Units curve from 2-energy enablers through Ahri/Diana at 3 and Vex at 4 to Hwei at 5. Most spells cost 1–3 energy.', "Keep the reference's 5 Mind/7 Chaos runes. Ahri and Hwei each need 1 power; Switcheroo needs 2. Diana's Legend supplies showdown energy, not power.", 'Diana, Lunari remains chosen. Fountain, Switcheroo and narrow interaction are flexible slots; do not cut the three-copy reviewed engine for them.', 'Limited evidence: one official event baseline, overall 22nd on 2026-09-27. This favourite adaptation is untested, not tournament-proven.']

Replacements: [{"fromCardId": "rebuke", "toCardId": "ahri inquisitive", "reason": "Replace the single flexible Rebuke with owned Ahri, making her combat reduction central to Moonfall/Eclipse removal and Gust targeting.", "compromise": "Lose unconditional battlefield bounce and a spell trigger. Ahri requires deployment and combat; her reduction bottoms out at 1 and does not remove a unit alone."}]

#### Budget version

Diana–Ahri: Favourite-Focused Spell Tempo

Win by repeatedly contesting battlefields with Ahri and spell-grown Students, then sustaining pressure through Hwei movement and Vex deployment denial. Three Ahris make the favourite a recurring combat piece rather than a singleton bonus. Tideturner positions her or triggers Hwei; Ride the Wind moves and readies either. Ahri's attack/defend reduction followed by Moonfall or Eclipse can remove enemies; Gust bounces enemies reduced to 3 Might or less. Protect invested units with Hard Bargain, Flash and Star-Crossed. All three Students, Moonfalls and Hweis remain: Hwei discards spells for draw, gear for rune readiness, or units for +3 Might. Fizz recasts cheap interaction while Fountain and Acceptable Losses provide ready-token pressure. Compared with the official baseline, trade unconditional bounce, some cheap filtering and some Vex lock redundancy for much more frequent Ahri combat.

Reference: [Diana, Scorn of the Moon / ASC nalkpas](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Scorn of the Moon

CHOSEN
1 Diana, Lunari

MAIN
3 Ahri, Inquisitive
1 Acceptable Losses
2 Gust
3 Stupefy
1 Flash
2 Hard Bargain
3 Ravenbloom Student
3 Tideturner
2 Traveling Merchant
2 Ride the Wind
1 Smoke Screen
2 Sprite Fountain
1 Switcheroo
2 Eclipse
1 Fizz, Trickster
3 Moonfall
2 Star-Crossed
2 Vex, Apathetic
3 Hwei, Brooding Painter

RUNES
5 Mind Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Seat of Power
1 Targon's Peak

SIDEBOARD
1 Acceptable Losses
2 Decree of Insight
2 Turn to Dust
1 Up from the Deep
1 Fizz, Trickster
1 Star-Crossed
1 Tail-Cloaked Matriarch
1 Singularity
```

Limitations: ['Missing-copy spend is 20 SEK at supplied 2026-10-04 prices; only two additional Ahris are needed. Shipping is excluded.', 'Merchant and Vex each fall from 3 to 2: less early filtering and less deployment-lock redundancy. The reviewed three-copy engine is unchanged.', "Early Gust/Stupefy interaction and Hard Bargain remain. Ahri's minimum-1 reduction must resolve before a finishing Moonfall/Eclipse.", 'Units span 2–5 energy, with more 3-energy bodies. Most spells cost 1–3; Ahri/Hwei need 1 power and Switcheroo 2. Keep 5 Mind/7 Chaos runes.', 'Diana, Lunari remains chosen. Fountain, Switcheroo and narrow interaction remain flexible; Ahri and the reviewed engine are priorities for this fun plan.', 'Limited evidence: the baseline placed 22nd overall at the 2026-09-27 official event. No result validates this three-Ahri adaptation.']

Replacements: [{"fromCardId": "rebuke", "toCardId": "ahri inquisitive", "reason": "Use Ahri's repeatable combat reduction to set up Moonfall/Eclipse finishes and Gust bounce, supported by existing movement and protection.", "compromise": "Lose unconditional bounce and one spell trigger. Ahri needs a combat to reduce Might and cannot answer an arbitrary battlefield unit immediately."}, {"fromCardId": "traveling merchant", "toCardId": "ahri inquisitive", "reason": "Replace one Merchant with another Ahri to increase favourite access without cutting Tideturner's positioning or the reviewed engine.", "compromise": "Merchant drops from 3 to 2: fewer 2-energy openings and movement-filter triggers. Ahri costs 3 energy plus 1 power and provides no hand filtering."}, {"fromCardId": "vex apathetic", "toCardId": "ahri inquisitive", "reason": "Replace one Vex with the third Ahri, shifting a flexible body slot toward proactive combat reduction while retaining two deployment-denial units.", "compromise": "Vex drops from 3 to 2: less Deflect protection and less reliable enemy deployment lockdown. Ahri is smaller and needs spells or support to win larger combats."}]

### scorn of the moon/unknown_price

AI usage estimate: 1.07 SEK.

For ownedOnly, feasibility shows all three engines core-ready. Spell tempo also has the entire official main, runes and battlefields owned; recursion needs additional Retreat/Consult resources, while Temporal Breach replays units but does not trigger Hwei's movement ability. Choose spell tempo without reducing its reviewed core. For budget, first considered the reference-ready God Save The Queen list: affordable, but Porobot lacks its three-other-gear draw setup and its expensive finishers increase resource demands. Prefer the coherent official tempo baseline, adapting only its optional sideboard with a priced Prefect. Its verified 2026-09-27 overall 22nd place outweighs community attribution or an unverified reported fourth place, without implying a win rate. Both proposals preserve one strategy and the same chosen champion. Spending the remaining budget is unnecessary; the unresolved Acceptable Losses price is not treated as free.

#### Owned only

Diana Hwei — owned event baseline

Win through repeated conquests, then protect holds with Vex's deployment lock. Student and Abandoned Hall turn cheap spells into combat strength; Moonfall gathers enemies and reduces their Might. Eclipse can put larger targets into Gust range. Tideturner swaps with Hwei to trigger his movement filtering; Ride the Wind moves and readies him for another push. Discard spells to Hwei for card advantage, gear to ready runes, or units for immediate Might. Merchant filters weaker draws, while Diana supplies showdown selection. Fizz reuses cheap spells but still pays their Power costs. Fountain supplies immediate conquest bodies; Acceptable Losses can kill it to trigger another Sprite while removing opposing gear. Flash, Gust and Star-Crossed protect units, with bounce enabling Fizz replay. The complete main engine is preserved; only the reference's extra sideboard Acceptable Losses is omitted.

Reference: [Diana, Scorn of the Moon / ASC nalkpas](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Scorn of the Moon

CHOSEN
1 Diana, Lunari

MAIN
1 Acceptable Losses
2 Gust
3 Stupefy
1 Flash
2 Hard Bargain
3 Ravenbloom Student
3 Tideturner
3 Traveling Merchant
2 Ride the Wind
1 Smoke Screen
2 Sprite Fountain
1 Rebuke
1 Switcheroo
2 Eclipse
1 Fizz, Trickster
3 Moonfall
2 Star-Crossed
3 Vex, Apathetic
3 Hwei, Brooding Painter

RUNES
5 Mind Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Seat of Power
1 Targon's Peak

SIDEBOARD
2 Decree of Insight
2 Turn to Dust
1 Up from the Deep
1 Fizz, Trickster
1 Star-Crossed
1 Tail-Cloaked Matriarch
1 Singularity
```

Limitations: ['Limited evidence: five strategy references, four distinct mains and one verified event. The official baseline placed 22nd on 2026-09-27; this sideboard adaptation is untested.', 'Curve: establish 2-energy units, use 1-energy Gust/Stupefy early, then deploy 4-energy Vex and 5-energy/1-Power Hwei without spending all protection resources.', 'The 5 Mind/7 Chaos split supports movement and bounce. Rebuke/Switcheroo need 2 Power; Fizz needs additional Power for replay. Legend Energy works only in showdowns.', 'Essential Student, Moonfall and Hwei retain three copies each; Diana remains chosen. Rebuke, Switcheroo, Eclipse and Fountain are flexible roles, not engine cuts.', "Sprites die before holding scores: use them to conquer or contest, not secure future holds. Turn to Dust removes gear only at its controller's next Beginning Phase.", 'The second Acceptable Losses is neither owned nor priced. Omitting it reduces immediate gear answers and Fountain sacrifice access after sideboarding.']

Replacements: []

#### Budget version

Diana Hwei — priced gear-tech adaptation

Keep the event baseline's conquest-and-hold engine rather than spend the budget changing strategies. Cheap spells grow Student and units at Abandoned Hall; Moonfall and Eclipse weaken opposition for combat or Gust. Tideturner and Ride the Wind trigger Hwei's movement engine, producing cards, readied runes or an immediate Might boost according to the discard. Vex disrupts enemy deployment, while Diana and Merchant improve selection. Fizz recasts cheap interaction with Power still payable; bounce protects threats and lets Fizz be replayed. Fountain provides ready conquest bodies, and the owned Acceptable Losses can convert it into another Sprite while answering gear. Add Prefect as proactive sideboard gear insurance. This preserves all engine redundancy but trades a second immediate gear-removal spell for a unit that must already be deployed when opposing gear is played.

Reference: [Diana, Scorn of the Moon / ASC nalkpas](https://playriftbound.com/en-us/news/organizedplay/los-angeles-top-decks/), 2026-09-27, Official event list and overall placement.

```text

LEGEND
1 Scorn of the Moon

CHOSEN
1 Diana, Lunari

MAIN
1 Acceptable Losses
2 Gust
3 Stupefy
1 Flash
2 Hard Bargain
3 Ravenbloom Student
3 Tideturner
3 Traveling Merchant
2 Ride the Wind
1 Smoke Screen
2 Sprite Fountain
1 Rebuke
1 Switcheroo
2 Eclipse
1 Fizz, Trickster
3 Moonfall
2 Star-Crossed
3 Vex, Apathetic
3 Hwei, Brooding Painter

RUNES
5 Mind Rune
7 Chaos Rune

BATTLEFIELDS
1 Abandoned Hall
1 Seat of Power
1 Targon's Peak

SIDEBOARD
2 Decree of Insight
2 Turn to Dust
1 Up from the Deep
1 Fizz, Trickster
1 Star-Crossed
1 Tail-Cloaked Matriarch
1 Singularity
1 Ravenbloom Prefect
```

Limitations: ['The only purchase is the priced Prefect; confirmed missing-copy cost is 10 SEK, excluding shipping. No unpriced copies are required.', 'Limited evidence: five strategy references, four distinct mains and one verified event. Overall 22nd place supports the baseline, not proven strength for this adaptation.', 'Curve remains 2-energy deployment into 4-energy Vex and 5-energy/1-Power Hwei. Gust/Stupefy interact early; reserve resources for protection and movement.', 'The 5 Mind/7 Chaos split is unchanged. Double-Power tricks and Fizz replay compete with Hidden setup; the Legend supplies showdown Energy, not deployment Power.', 'Student, Moonfall and Hwei remain at full reviewed quantities; chosen Diana is unchanged. Flexible tricks and sideboard answers should vary with expected opponents.', "Prefect cannot remove gear already in play or trigger Fountain's Deathknell. Temporary Sprites cannot survive to score holds; Singularity is a costly recovery option."]

Replacements: [{"fromCardId": "acceptable losses", "toCardId": "ravenbloom prefect", "reason": "Replace only the unowned, unpriced sideboard copy with a fully priced proactive gear answer; retain the owned main-deck copy.", "compromise": "Prefect costs 3 Energy and must be deployed before the gear is played. It sacrifices itself, cannot answer existing gear, does not grow Student, and cannot kill Fountain for its Deathknell."}]
