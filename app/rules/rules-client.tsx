"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, Clock3, ExternalLink, Flag, Layers3, LayoutGrid, Search, Sparkles, Swords, UserRound, X, ChartNoAxesColumnIncreasing, RotateCw, Recycle } from "lucide-react";
import { gameTerms, keywords, rulesSources, type ReferenceEntry } from "../../lib/rules-reference";
import printedLabels from "../../data/rules-printed-labels.json";

type Topic = "symbols" | "keywords" | "play" | "prerift";
const topics = [{ id: "symbols", label: "Symbols", icon: Sparkles }, { id: "keywords", label: "Keywords", icon: BookOpen }, { id: "play", label: "Playing a turn", icon: Swords }, { id: "prerift", label: "Pre-Rift", icon: Flag }] as const;
const domains = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];
type PrintedLabelAsset = { src: string; width: number; height: number; card: string; sourceUrl: string };
const labelAssets: Record<string, PrintedLabelAsset> = printedLabels;

function PrintedLabel({ name, className = "" }: { name: string; className?: string }) {
  const asset = labelAssets[name];
  if (!asset) return <strong>{name}</strong>;
  return <img className={`printed-label ${className}`} src={asset.src} width={asset.width} height={asset.height} alt={name} decoding="async" />;
}

function GameSymbol({ name }: { name: string }) {
  return <img className={`game-symbol game-symbol-${name}`} src={`/rules/${name}.png`} width="36" height="36" alt={`${name === "any" ? "Any-domain Power" : name} symbol`} />;
}

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="rule-source" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink aria-hidden="true" /></a>;
}

function Entry({ entry }: { entry: ReferenceEntry }) {
  const asset = labelAssets[entry.name];
  return <details className="reference-entry"><summary><span className="entry-heading"><PrintedLabel name={entry.name} />{/ [XN]$/.test(entry.name) && <span className="entry-variable">{entry.name}</span>}{entry.group === "Radiance" && <span className="rules-chip">Radiance</span>}</span><span className="entry-summary">{entry.summary}</span><ChevronDown aria-hidden="true" /></summary><div className="entry-detail"><p>{entry.detail}</p>{asset && <p className="printed-label-source">Printed on <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.card}<ExternalLink aria-hidden="true" /></a>.{/ [XN]$/.test(entry.name) && " The number on the label is a card example; use the value on your card."}</p>}<SourceLink href={rulesSources.core}>Core Rules §{entry.rule}</SourceLink></div></details>;
}

export default function RulesClient({ accountName, signOutPath }: { accountName: string; signOutPath: string }) {
  const [topic, setTopic] = useState<Topic>("symbols");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const referenceStart = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const syncTopic = () => {
      const requested = window.location.hash.slice(1);
      if (topics.some(({ id }) => id === requested)) setTopic(requested as Topic);
    };
    syncTopic();
    window.addEventListener("hashchange", syncTopic);
    return () => window.removeEventListener("hashchange", syncTopic);
  }, []);
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => [...keywords, ...gameTerms].filter((entry) => `${entry.name} ${entry.summary} ${entry.detail} ${entry.group}`.toLowerCase().includes(normalized)).sort((a, b) => a.name.localeCompare(b.name)), [normalized]);
  const visibleKeywords = keywords.filter((entry) => group === "All" || entry.group === group);
  const guideResults = normalized ? [
    { topic: "symbols" as Topic, title: "Symbols & costs", text: "Energy, Power, exhaust, recycle, Might, domains and the two cost examples", search: "energy power exhaust recycle might domain symbol rune cost pay number 3 6 add" },
    { topic: "play" as Topic, title: "Playing a turn", text: "Turn order, starting hand, mulligan, combat, scoring and the final point", search: "turn awaken beginning channel draw main end first second start hand mulligan fight combat damage score point win 8 hold conquer" },
    { topic: "prerift" as Topic, title: "Pre-Rift sealed rules", text: "25+ cards, 12 runes, up to 3 domains, pool rules, sideboarding and kit contents", search: "pre-rift prerift sealed event sunday kit 25 12 3 deck size domain pool promo heimerdinger legend champion signature sideboard battlefield blank duplicate unique rune pack booster" },
  ].filter((guide) => guide.search.includes(normalized) || guide.title.toLowerCase().includes(normalized)) : [];

  function chooseTopic(next: Topic) {
    setTopic(next);
    setQuery("");
    window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    requestAnimationFrame(() => referenceStart.current?.scrollIntoView({ block: "start", behavior: "instant" }));
  }

  return <>
    <a className="skip-link" href="#main-content">Skip to reference</a>
    <header className="site-header rules-site-header"><div className="site-header-inner">
      <a className="brand" href="/"><img className="brand-mark" src="/riftbound-logo-96.png" alt="" width="44" height="44" /><span>Riftbound<span className="brand-light">Collection</span></span></a>
      <nav className="section-nav" aria-label="Website sections">
        <a href="/"><Layers3 aria-hidden="true" />My collection</a>
        <a href="/?section=decks"><ChartNoAxesColumnIncreasing aria-hidden="true" />Decks &amp; upgrades</a>
        <a href="/?section=builder"><LayoutGrid aria-hidden="true" />Deck builder</a>
        <a href="/?section=history"><Clock3 aria-hidden="true" />History</a>
        <a href="/rules" className="active" aria-current="page"><BookOpen aria-hidden="true" />Rules &amp; reference</a>
      </nav>
      <div className="rules-sidebar-note"><BookOpen aria-hidden="true" /><p>A little less remembering.<br />A little more playing.</p><span>Checked 16 October 2026</span></div>
      <div className="account-area"><UserRound aria-hidden="true" /><div><span className="account-name" title={accountName}>{accountName}</span><a href={signOutPath}>Sign out</a></div></div>
    </div></header>
    <main className="collection-shell rules-page" id="main-content" tabIndex={-1}>
      <div className="rules-heading"><div><h1>Rules &amp; reference</h1><p>Your quick lookup at the table.</p></div><span className="rules-edition"><Flag aria-hidden="true" />Radiance ready</span></div>
      <div ref={referenceStart} />
      <div className="rules-controls">
        <div className="rules-search"><Search aria-hidden="true" /><label className="visually-hidden" htmlFor="reference-search">Search rules, symbols and keywords</label><input id="reference-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a keyword, symbol or rule…" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear reference search"><X aria-hidden="true" /></button>}</div>
        <nav className="rules-topics" aria-label="Reference topics">{topics.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={!normalized && topic === id} onClick={() => chooseTopic(id)}><Icon aria-hidden="true" />{label}</button>)}</nav>
      </div>
      {normalized ? <section className="rules-content" aria-labelledby="search-results-title">
        <p className="visually-hidden" role="status">{results.length} matching terms and {guideResults.length} guides</p>
        <div className="rules-section-title"><h2 id="search-results-title">Search results</h2><span role="status">{results.length} terms · {guideResults.length} guides</span></div>
        {guideResults.length > 0 && <div className="rules-guide-results">{guideResults.map((guide) => <button key={guide.topic} type="button" onClick={() => chooseTopic(guide.topic)}><span><strong>{guide.title}</strong><small>{guide.text}</small></span><ArrowRight aria-hidden="true" /></button>)}</div>}
        {/energy|power|rune|exhaust|recycl|symbol|pay|cost|might/.test(normalized) && <div className="rules-search-symbols"><Symbols compact /></div>}
        <div className="reference-list">{results.map((entry) => <Entry key={entry.name} entry={entry} />)}</div>
        {!results.length && !guideResults.length && !/energy|power|rune|exhaust|recycl|symbol|pay|cost|might/.test(normalized) && <div className="rules-empty"><Search aria-hidden="true" /><h3>No matching term</h3><p>Try “recycle”, “stun”, “hidden” or “disarm”.</p><button className="secondary-button" type="button" onClick={() => chooseTopic("prerift")}>Open Pre-Rift rules</button></div>}
        <button type="button" className="rules-text-button" onClick={() => { setQuery(""); setTopic("prerift"); }}>Looking for deck size or event rules? Open Pre-Rift<ArrowRight aria-hidden="true" /></button>
      </section> : <div className="rules-content">
        {topic === "symbols" && <Symbols />}
        {topic === "keywords" && <section aria-labelledby="keyword-title"><div className="rules-section-title"><div><h2 id="keyword-title">What does that keyword do?</h2><p>Real labels from the cards. Tap one for the detail.</p><p className="printed-label-note">Numbers shown are examples. Always use the value on your card.</p></div><span>{keywords.length} keywords</span></div>
          <div className="rules-group-filter" role="group" aria-label="Keyword category">{["All", "Combat", "Timing", "Effects", "Radiance"].map((name) => <button type="button" aria-pressed={group === name} key={name} onClick={() => setGroup(name)}>{name}</button>)}</div>
          <div className="reference-list">{visibleKeywords.map((entry) => <Entry key={entry.name} entry={entry} />)}</div>
          <h3 className="rules-subheading">Common card instructions</h3><div className="reference-list">{gameTerms.map((entry) => <Entry key={entry.name} entry={entry} />)}</div>
        </section>}
        {topic === "play" && <PlayGuide />}
        {topic === "prerift" && <PreRift />}
      </div>}
      <details className="rules-sources"><summary>Sources &amp; rule versions<ChevronDown aria-hidden="true" /></summary><p>Checked 16 October 2026. Core and Tournament Rules dated 9 October; Radiance changes effective 16 October. These are beginner summaries. Use current official text and your event judge for a specific interaction.</p><div><SourceLink href={rulesSources.hub}>Official Rules Hub</SourceLink><SourceLink href={rulesSources.core}>Core Rules</SourceLink><SourceLink href={rulesSources.tournament}>Tournament Rules</SourceLink><SourceLink href={rulesSources.prerift}>Radiance Pre-Rift guide</SourceLink><SourceLink href={rulesSources.radiance}>Radiance changes</SourceLink><SourceLink href="/rules/radiance-sealed-cheatsheet.jpg">Your French sealed cheat sheet</SourceLink></div><p>Printed keyword labels, card instructions, game symbols and card artwork © Riot Games, cropped from the official card gallery. Each illustrated term links to its source card. Cost examples supplied by you. The supplied sheet is a community reference, checked against official rules.</p></details>
    </main>
  </>;
}

function Symbols({ compact = false }: { compact?: boolean }) {
  return <section aria-labelledby={compact ? "search-symbols-title" : "symbols-title"}>
    <div className="rules-section-title"><div><h2 id={compact ? "search-symbols-title" : "symbols-title"}>Numbers are Energy. Symbols are Power.</h2><p>The distinction you will use in every game.</p></div></div>
    <div className="resource-pair">
      <article className="resource-card"><div className="resource-top"><GameSymbol name="energy" /><span><h3>Energy</h3><small>The number in a cost</small></span></div><p><strong>Exhaust a ready rune → gain 1 Energy.</strong></p><p>Turn it sideways. It stays on the board and normally readies next turn. Any rune domain works.</p><span className="resource-memory"><RotateCw aria-hidden="true" />Use it, keep it.</span></article>
      <article className="resource-card power-resource"><div className="resource-top"><GameSymbol name="calm" /><span><h3>Power</h3><small>A domain symbol in a cost</small></span></div><p><strong>Recycle a rune → gain 1 matching Power.</strong></p><p>Put it on the bottom of your Rune Deck. It leaves the board. You can recycle an exhausted rune.</p><span className="resource-memory"><Recycle aria-hidden="true" />Use it, send it back.</span></article>
    </div>
    <div className="rules-callout"><Check aria-hidden="true" /><p><strong>The same rune can do both.</strong> Exhaust it for Energy first, then recycle it for Power. “Pay” means spend the resource shown; it does not always mean recycle.</p></div>
    {!compact && <>
      <h3 className="rules-subheading">Read these two costs</h3>
      <div className="cost-examples"><article><div className="cost-image"><img src="/rules/energy-example.png" alt="A 3 inside a circle, meaning 3 Energy" width="83" height="38" /></div><h4>Pay 3 Energy</h4><p>Exhaust 3 ready runes of any domains. <strong>No Power cost is shown.</strong></p><div className="rune-outcome"><span>3 runes stay</span><span>All 3 exhausted</span></div></article><article><div className="cost-image"><img src="/rules/mixed-cost-example.png" alt="A 6 and a red Fury symbol, meaning 6 Energy plus 1 Fury Power" width="134" height="52" /></div><h4>Pay 6 Energy + 1 Fury Power</h4><p>Exhaust 6 runes, then recycle 1 Fury rune. <strong>It can be one of those same 6.</strong></p><div className="rune-outcome"><span>5 exhausted runes stay</span><span>1 Fury rune goes back</span></div></article></div>
      <h3 className="rules-subheading">The symbols on your cards</h3>
      <div className="symbol-reference-grid">
        <article className="symbol-reference"><GameSymbol name="exhaust" /><div><h4>Exhaust this</h4><p>The turning-card symbol means turn <strong>this card</strong> sideways to pay that part of its ability’s cost. It must be ready.</p></div></article>
        <article className="symbol-reference"><GameSymbol name="might" /><div><h4>Might</h4><p>The sword and shield is a unit’s combat strength. It normally deals that much damage and dies at that much damage.</p></div></article>
        <article className="symbol-reference"><GameSymbol name="any" /><div><h4>Any-domain Power</h4><p>The rainbow swirl asks for 1 Power of any domain. You can recycle any rune for it. <strong>This is Power, not Energy.</strong></p></div></article>
        <article className="symbol-reference recycle-reference"><div><h4><PrintedLabel name="Recycle" /></h4><p>Written as a word on the card. Send it to the bottom of its own deck: runes to Rune Deck, Main Deck cards to Main Deck.</p></div></article>
      </div>
      <h3 className="rules-subheading">Six domains, six Power symbols</h3><p className="rules-muted">In a cost, each symbol asks for 1 Power of that domain.</p>
      <div className="domain-symbols">{domains.map((domain) => <div key={domain} className={`domain-symbol domain-${domain.toLowerCase()}`}><GameSymbol name={domain.toLowerCase()} /><strong>{domain}</strong><span>1 {domain} Power</span></div>)}</div>
      <details className="reference-entry symbol-notes"><summary><span className="entry-heading"><strong>A few easy mix-ups</strong></span><span className="entry-summary">Power, Might, “Add”, and floating resources</span><ChevronDown aria-hidden="true" /></summary><div className="entry-detail"><ul><li><strong>Power pays costs; Might is strength.</strong> The two are unrelated.</li><li><strong>“Add” generates resources.</strong> The following number or symbol tells you which. Other cards, such as Seals, can generate Power too.</li><li><strong>Read the whole cost.</strong> Before a colon is what you pay; after it is the effect. A number plus a symbol means both.</li><li><strong>Unused resources do not last forever.</strong> Both players’ pools clear at the start of each Main Phase and at the end of each turn.</li><li><strong>Domain icons also identify cards.</strong> A domain mark in the bottom corner is card identity, not an extra cost.</li></ul></div></details>
    </>}
  </section>;
}

function PlayGuide() {
  const steps = [
    ["Awaken", "Ready your cards.", "Turn your exhausted units, runes, gear and legend upright."],
    ["Beginning", "Resolve start effects, then hold.", "Score 1 point for each battlefield you still control. Temporary permanents die before scoring."],
    ["Channel", "Bring out 2 runes.", "Take the top 2 from your Rune Deck and put them onto the board ready, or as many as remain."],
    ["Draw", "Draw 1 card.", "The second player in standard 1v1 channels 3 runes on their first turn. The first player still draws 1."],
    ["Main", "Play, move, use abilities.", "Choose your order. Standard moves exhaust units to go between your base and a battlefield. Ganking allows battlefield to battlefield."],
    ["End", "Resolve end effects and clean up.", "Damage and Stun clear, this-turn effects expire, and unused Energy and Power are lost."],
  ];
  return <section aria-labelledby="play-title"><div className="rules-section-title"><div><h2 id="play-title">Your turn, at a glance</h2><p>Standard 1v1. Ready → hold → channel → draw → play.</p></div></div><ol className="turn-steps">{steps.map(([name, title, detail], i) => <li key={name}><span className="turn-number">{i + 1}</span><div><small>{name}</small><h3>{title}</h3><p>{detail}</p></div></li>)}</ol>
    <div className="rules-callout"><Flag aria-hidden="true" /><p><strong>First game?</strong> Draw 4 to start. For your one mulligan, set aside up to 2 cards, draw replacements, then recycle the set-aside cards.</p></div>
    <h3 className="rules-subheading">Playing your cards</h3><div className="play-cards"><article><h4>Units enter exhausted</h4><p>Play them to your base or a battlefield you control, unless a card says otherwise. A ready unit can exhaust to move; an exhausted unit still fights.</p></article><article><h4>Spells &amp; gear</h4><p>Spells resolve, then go to the trash. Gear normally enters your base ready. Deploy gear goes to a battlefield instead. There is no maximum hand size.</p></article></div>
    <h3 className="rules-subheading">Win by controlling battlefields</h3><div className="play-cards"><article><h4>Conquer to score</h4><p>Take control after a showdown, and normally gain 1 point. Even an empty battlefield gives your opponent a chance to respond.</p></article><article><h4>Hold to score</h4><p>Keep control until your Beginning Phase to gain 1 point. You can score each battlefield only once per turn.</p></article><article className="final-point"><h4>The final point is special</h4><p>In standard 1v1, reach <strong>8 points</strong>. To get your final point from a conquer, you must have scored <strong>every battlefield that turn</strong>. Otherwise draw 1 instead. Holding can give the final point normally.</p></article></div>
    <details className="reference-entry"><summary><span className="entry-heading"><strong>A fight in four steps</strong></span><span className="entry-summary">Arrive, respond, deal damage, resolve</span><ChevronDown aria-hidden="true" /></summary><div className="entry-detail"><ol><li>Move to a battlefield with enemies. Defend triggers resolve before attack triggers.</li><li>Play the combat showdown. Actions need an empty chain; Reactions can respond. The newest chain item resolves first.</li><li>Each side assigns damage equal to its units’ total combat Might, then both sides deal it simultaneously. Assign lethal to a unit before moving to another; respect Tank and Backline. Stunned units contribute no damage.</li><li>Kill units with lethal damage. A side left alone there can win and conquer. If both sides still have units, the attackers are recalled to base and this combat has no winner. If neither side remains, nobody wins.</li></ol><p><strong>Exhausted units still fight.</strong> Exhaustion does not prevent combat damage.</p></div></details>
    <SourceLink href={rulesSources.core}>Core Rules: turn structure, combat and scoring</SourceLink>
  </section>;
}

function PreRift() {
  const facts = [["25+", "Main Deck cards", "Including your Chosen Champion, if used."], ["12", "Runes exactly", "Only your chosen domains; outside runes allowed."], ["Up to 3", "Domains", "Every domain on a card must fit."], ["3", "Battlefields for best-of-one", "Opened fields or blank substitutes."]];
  return <section aria-labelledby="prerift-title"><div className="rules-section-title"><div><h2 id="prerift-title">Your first Pre-Rift</h2><p>Open your kit, build from your pool, and learn as you play.</p></div><span className="rules-chip">Sealed</span></div>
    <div className="prerift-facts">{facts.map(([value, label, detail]) => <article key={label}><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></article>)}</div>
    <div className="rules-callout"><Flag aria-hidden="true" /><p><strong>Radiance kit:</strong> 5 boosters + 1 champion pack with its supporting cards. The Heimerdinger promo is a keepsake and cannot go in your sealed deck. General sealed events may instead provide 6 boosters.</p></div>
    <div className="prerift-guides">
      <article className="prerift-panel"><h3>Build from what you open</h3><ul><li>Use your provided pool, including the champion pack. No extra collection cards, except permitted runes and token representations.</li><li>As many copies as you opened are allowed. <strong>Ignore Unique.</strong></li><li>Your Legend and Chosen Champion can represent different champions, as long as their domains fit.</li><li>Signature spells need all their domains in your deck’s identity; they do not need the matching Legend.</li><li>You may omit the Legend, Chosen Champion, or both. Draw <strong>1 extra card total</strong> at the start of your first Beginning Phase.</li></ul></article>
      <article className="prerift-panel"><h3>Battlefields &amp; between games</h3><ul><li>Use battlefields from your pool or a facedown blank with no name or abilities. Duplicate names are allowed when you opened multiple copies.</li><li>For best-of-one, prepare 3 battlefields for random selection. For best-of-three, choose from your pool or blanks; a specific battlefield copy is normally used only once per match.</li><li>Your unused pool is your sideboard. At casual Pre-Rift, you can normally change cards, domains, runes, Legend and champion between games and matches. Follow the judge’s event instructions.</li><li>Constructed bans do not automatically apply in Sealed. Follow any limited-specific bans or event addenda.</li></ul></article>
    </div>
    <details className="reference-entry"><summary><span className="entry-heading"><strong>A simple deckbuilding starting point</strong></span><span className="entry-summary">Units first, affordable early plays, a few useful spells</span><ChevronDown aria-hidden="true" /></summary><div className="entry-detail"><p>Riot suggests at least 15 units, with about 5 costing 2 Energy. Fill out a range of costs, then add removal and useful combat tricks. Choose your rune mix by your Power costs, not just card colour counts. These are starting tips, not deck legality rules.</p><SourceLink href={rulesSources.prerift}>Riot’s Radiance deckbuilding tips</SourceLink></div></details>
    <h3 className="rules-subheading">Before you leave</h3><div className="prerift-packing"><span><Check aria-hidden="true" />Sleeves</span><span><Check aria-hidden="true" />Dice &amp; score tracker</span><span><Check aria-hidden="true" />Spare runes if available</span><span><Check aria-hidden="true" />Token markers</span></div><p className="rules-muted">Ask the store about rune supplies, round timing and match format. Pre-Rift is designed for learning; call the judge whenever an interaction is unclear.</p>
    <details className="reference-entry"><summary><span className="entry-heading"><strong>A note about the October playtest</strong></span><span className="entry-summary">The new going-second bonuses are optional event tests</span><ChevronDown aria-hidden="true" /></summary><div className="entry-detail"><p>Riot announced start-of-game playtests on 15 October. They are <strong>not a universal rules update</strong>. Do not automatically add a point, extra draw or Predict to going second. Use them only if your organiser announces a playtest; staff will specify the variant.</p><SourceLink href={rulesSources.playtest}>Official playtest announcement</SourceLink></div></details>
    <SourceLink href={rulesSources.prerift}>Official Radiance Pre-Rift guide</SourceLink>
  </section>;
}
