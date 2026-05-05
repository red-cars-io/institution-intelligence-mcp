# Institution Intelligence MCP

Research institution data for AI agents — ROR lookup, h-index, research output metrics, institutional comparisons, and sector analysis via OpenAlex.

---

## 1. Purpose Statement

Institution Intelligence MCP is an MCP (Model Context Protocol) server that gives AI agents direct access to 120,000+ research institutions across OpenAlex — universities, government research agencies, hospitals, and corporate R&D labs. AI agents performing VC due diligence, academic benchmarking, talent sourcing, or institutional research query institution profiles, h-index metrics, research areas, and comparative analysis without requiring API keys.

**Built for:** AI agents doing VC due diligence on university technology transfer, academic librarians benchmarking institutions, recruiters sourcing talent from top research universities, corporate development scouting research partnerships, and institutional researchers building comparative reports.

---

## 2. Quick Start

Add to your MCP client:

```json
{
  "mcpServers": {
    "institution-intelligence-mcp": {
      "url": "https://red-cars--institution-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

AI agents can now search 120,000+ research institutions, retrieve h-index and citation metrics, compare institutional research output, map research areas by institution, and analyze research output by country or sector.

---

## Comparison

See how Institution Intelligence MCP compares to manual research and commercial platforms: [COMPARISON.md](./COMPARISON.md)

---

## 3. When to Call This MCP

Use Institution Intelligence MCP when you need to:

- **Find top research institutions** — search by name, country, or type with h-index and publication counts
- **Get institutional profiles** — detailed metrics for a specific institution (ROR lookup, h-index, i10-index, top fields)
- **Compare institutions** — side-by-side comparison of 2-5 institutions for VC due diligence, benchmarking, or talent sourcing
- **Map research areas** — top research fields per institution with publication counts and field scores
- **Analyze research output** — aggregated metrics by country, sector, or research area

---

## 4. What Data Can You Access?

| Data Type | Source | Example |
|-----------|--------|---------|
| Institution profiles | OpenAlex | Name, ROR, type, country, h-index, i10-index |
| Research output | OpenAlex | Works count, citations, mean citedness |
| Research areas | OpenAlex | Top fields per institution with field scores |
| Institutional comparison | OpenAlex | Side-by-side metrics for 2-5 institutions |
| Sector analysis | OpenAlex | Aggregated metrics by country or type |

---

## 5. Why Use Institution Intelligence MCP?

**The problem:** Researching institutional research strength — h-index, publication counts, top research areas, and comparative metrics — requires navigating disconnected databases (OpenAlex, ROR, institutional websites, citation databases). For VC analysts, corporate development teams, academic librarians, and recruiters, this data is essential for partnership decisions, talent sourcing, and institutional benchmarking. Manual research takes days across OpenAlex, ROR, and proprietary citation databases.

**The solution:** AI agents use Institution Intelligence MCP to get instant, structured institutional intelligence — institution profiles with h-index and research output metrics, side-by-side comparisons for due diligence, research area mapping, and sector analysis. This is the institutional intelligence layer for AI agents doing VC due diligence, academic benchmarking, and research strategy.

---

## 6. Tools

### search_institutions

Search research institutions by name, country, or type. Returns institutions ranked by research output with h-index, works count, and citation metrics.

```
search_institutions(query="Stanford University", country="US", maxResults=10, sortBy="h_index")
```

### get_institution_details

Get detailed metrics for a specific institution by ROR ID or exact name match. Returns full research profile with h-index, i10-index, citation metrics, and research areas.

```
get_institution_details(institutionId="https://ror.org/00f54p054")
```

### compare_institutions

Compare 2-5 institutions side-by-side: works count, citations, h-index, i10-index, top research areas, and publication output with relative rankings.

```
compare_institutions(institutions=["Harvard University", "Stanford University", "MIT"], metrics=["works_count", "cited_by_count", "h_index"])
```

### get_institution_research_areas

Get top research areas/concepts for an institution, with publication counts and field scores per area.

```
get_institution_research_areas(institutionId="https://ror.org/00f54p054", maxAreas=15)
```

### analyze_research_output

Analyze research output by country, sector, or research area. Returns aggregated metrics for the given filter.

```
analyze_research_output(country="US", sector="education", maxResults=25)
```

---

## 7. Pricing

| Tool | Price |
|------|-------|
| search_institutions | $0.03 |
| get_institution_details | $0.02 |
| compare_institutions | $0.05 |
| get_institution_research_areas | $0.03 |
| analyze_research_output | $0.05 |

All prices in USD per tool call. No API keys required — OpenAlex is fully open.

---

## 8. Setup

```
1. Clone or download this actor
2. Run: npm install
3. Start: npm start
4. Add to your MCP client using the URL above
```

No API keys required. OpenAlex's public API is freely accessible.
