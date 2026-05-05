# Institution Intelligence MCP vs Manual Research + ROR + OpenAlex

*Comparison page for GitHub SEO — Institution Intelligence MCP*

## Overview

| Aspect | Institution Intelligence MCP | Manual Research | OpenAlex Direct | ROR Direct |
|--------|----------------------------|-----------------|----------------|------------|
| **Price** | $0.02–0.05/call | Free (hours) | Free (complex) | Free |
| **Data sources** | OpenAlex (120K+ institutions) | Manual browsing | Single source | Single source |
| **H-index metrics** | ✅ | ❌ | Partial | ❌ |
| **Institutional comparison** | ✅ 2-5 side-by-side | ❌ | ❌ | ❌ |
| **Research area mapping** | ✅ with field scores | ❌ | Partial | ❌ |
| **Sector analysis** | ✅ country + type + field | ❌ | ❌ | ❌ |
| **AI agent native** | ✅ MCP tool calls | ❌ | ❌ | ❌ |
| **No API key needed** | ✅ | ✅ | ✅ | ✅ |

## What You Get

Institution Intelligence MCP wraps OpenAlex's institution database and returns structured intelligence:

- **Institution profiles** — h-index, i10-index, 2-year mean citedness, works count, citations
- **Side-by-side comparisons** — 2-5 institutions with relative rankings
- **Research area mapping** — top fields per institution with field scores
- **Sector analysis** — top institutions by country, type, or research focus

## Use Cases

### VC due diligence on university research strength
`compare_institutions(institutions=["Harvard University", "Stanford University", "MIT", "Carnegie Mellon"], metrics=["h_index", "works_count", "cited_by_count"])` → ranked comparison with research output

### Academic partnership scouting
`search_institutions(query="neuroscience", country="US", institutionType="education", sortBy="h_index", maxResults=20)` → top US neuroscience universities

### Talent sourcing from top research institutions
`get_institution_research_areas(institutionId="https://ror.org/00f54p054", maxAreas=10)` → Stanford's top research areas for recruiter targeting

### Government research landscape analysis
`analyze_research_output(country="US", sector="government", maxResults=25)` → top US government research institutions by output

## When to Choose Institution Intelligence MCP

**Choose this when:**
- You're an AI agent doing VC or corporate development research
- You need institutional comparisons for due diligence or benchmarking
- You're mapping research areas for partnership or talent decisions
- You want sector-level analysis of research output by country or type

**Choose OpenAlex directly when:**
- You only need basic institution search
- You prefer custom API queries with your own filtering

**Choose manual research when:**
- You have unlimited time and enjoy navigating OpenAlex's interface
