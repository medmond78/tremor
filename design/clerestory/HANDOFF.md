# Tremor × Clerestory handoff

Visual spec only. The sample data in Main.dc.html is a snapshot; keep the app's live Convex data.

Prompt for Claude Code (run in the tremor repo):

Restyle the app to match design/clerestory/Main.dc.html (desktop) and Mobile.dc.html (phone),
using design/clerestory/tokens.json as the design tokens. Keep all existing Convex queries,
filter state and the How modal behaviour. Don't copy the sample data.

1. Tokens as CSS variables / Tailwind theme (paper, surface, line, ink, muted, sky, sky-deep,
   sun, coral, leaf; Inter + JetBrains Mono; 4/8/16/32 spacing; 6/12/20 radii). Light only.
2. Restyle header, filter sidebar and tremor cards. Sidebar stacks above the feed on narrow screens.
3. Card: score tile coloured by intensity (coral >=7.5, sun >=5, sky >=2.5, line below),
   event title above the top market question, prev -> curr %, up/down pp change,
   "Crossed 50%" chip, 24h volume, "N markets moved".
4. New: "Hide settling markets" toggle, on by default — filters tremors whose current price
   is <=1% or >=99%, tags them "Settling" when shown.
5. Tremor report card shows "No report yet" when marketSummary.getSummary returns null.

Work one component at a time and show the diff after each.
