/**
 * Institution Intelligence MCP Server
 * AI agent access to research institution data via OpenAlex ROR-backed database
 */

import http from 'http';
import Apify, { Actor } from 'apify';

// Always call Actor.init() once unconditionally
await Actor.init();

// Check standby AFTER init using env var
const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';
const PORT = Actor.config.get('standbyPort') || 8080;

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE = 'https://api.openalex.org';

// Rate limit: ~10 req/sec recommended, use 110ms gap
const RATE_LIMIT_MS = 110;
let lastRequestTime = 0;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

const TOOLS = [
  {
    name: 'search_institutions',
    description: 'Search research institutions by name, country, or type. Returns institutions ranked by research output with h-index, works count, and citation metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Institution name to search for' },
        country: { type: 'string', description: 'Filter by country code (US, GB, DE, CN, etc.)' },
        institutionType: { type: 'string', description: 'Filter by type: education, government, healthcare, company, nonprofit, facility' },
        maxResults: { type: 'integer', description: 'Maximum results (default: 10, max: 50)', default: 10 },
        sortBy: { type: 'string', description: 'Sort by "works_count", "cited_by_count", or "h_index"', default: 'works_count' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_institution_details',
    description: 'Get detailed metrics for a specific institution by ROR ID or exact name match. Returns full research profile with h-index, i10-index, citation metrics, and research areas.',
    inputSchema: {
      type: 'object',
      properties: {
        institutionId: { type: 'string', description: 'ROR ID (e.g., "https://ror.org/00f54p054") or OpenAlex institution ID (e.g., "I99012011")' },
        name: { type: 'string', description: 'Institution display name (alternative to institutionId)' },
      },
      required: [],
    },
  },
  {
    name: 'compare_institutions',
    description: 'Compare 2-5 institutions side-by-side: works count, citations, h-index, i10-index, top research areas, and publication output. Useful for VC due diligence, academic benchmarking, or talent sourcing.',
    inputSchema: {
      type: 'object',
      properties: {
        institutions: { type: 'array', items: { type: 'string' }, description: 'List of institution names to compare (2-5)' },
        metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics to compare: works_count, cited_by_count, h_index, i10_index', default: ['works_count', 'cited_by_count', 'h_index'] },
      },
      required: ['institutions'],
    },
  },
  {
    name: 'get_institution_research_areas',
    description: 'Get top research areas/concepts for an institution, with publication counts and citation metrics per area. Useful for assessing institutional research focus.',
    inputSchema: {
      type: 'object',
      properties: {
        institutionId: { type: 'string', description: 'ROR ID or OpenAlex institution ID' },
        name: { type: 'string', description: 'Institution name (will be resolved to ROR)' },
        maxAreas: { type: 'integer', description: 'Maximum research areas to return (default: 15, max: 50)', default: 15 },
      },
      required: ['institutionId'],
    },
  },
  {
    name: 'analyze_research_output',
    description: 'Analyze research output by country, sector, or research area. Returns aggregated metrics: total works, citations, h-index, and institution counts for the given filter.',
    inputSchema: {
      type: 'object',
      properties: {
        country: { type: 'string', description: 'Filter by country code (US, GB, DE, CN, etc.)' },
        sector: { type: 'string', description: 'Filter by sector: education, government, healthcare, company, nonprofit' },
        researchArea: { type: 'string', description: 'Filter by research concept (e.g., "machine learning", "cancer")' },
        maxResults: { type: 'integer', description: 'Maximum results (default: 25, max: 100)', default: 25 },
      },
    },
  },
];

// =============================================================================
// TOOL PRICES (USD)
// =============================================================================

const TOOL_PRICES = {
  search_institutions: 0.03,
  get_institution_details: 0.02,
  compare_institutions: 0.05,
  get_institution_research_areas: 0.03,
  analyze_research_output: 0.05,
};

// =============================================================================
// OPENALEX API CLIENT
// =============================================================================

async function openAlexFetch(path, params = {}) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const queryParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) queryParams.set(k, String(v));
  }
  const url = `${API_BASE}${path}?${queryParams.toString()}`;
  const resp = await fetch(url, { timeout: 30000 });
  if (!resp.ok) {
    throw new Error(`OpenAlex API error: ${resp.status} ${resp.statusText} (${url})`);
  }
  return resp.json();
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

async function searchInstitutions(query, { country, institutionType, maxResults = 10, sortBy = 'works_count' } = {}) {
  const filters = [];
  if (country) filters.push(`country_code:${country}`);
  if (institutionType) filters.push(`type:${institutionType}`);

  const sortMap = {
    works_count: 'works_count:desc',
    cited_by_count: 'cited_by_count:desc',
    h_index: 'summary_stats.h_index:desc',
  };

  const params = {
    search: query,
    per_page: Math.min(maxResults, 50),
    sort: sortMap[sortBy] || 'works_count:desc',
    ...(filters.length > 0 ? { filter: filters.join(',') } : {}),
  };

  const data = await openAlexFetch('/institutions', params);
  const results = data.results || [];

  return results.map((r) => ({
    id: r.id?.replace('https://openalex.org/', ''),
    name: r.display_name,
    ror: r.ror,
    type: r.type,
    country: r.country_code,
    worksCount: r.works_count,
    citedByCount: r.cited_by_count,
    hIndex: r.summary_stats?.h_index,
    i10Index: r.summary_stats?.i10_index,
    meanCitedness: r.summary_stats?.['2yr_mean_citedness'] ? Math.round(r.summary_stats['2yr_mean_citedness'] * 100) / 100 : null,
    researchAreas: r.x_concepts?.slice(0, 5).map((c) => c.display_name) || [],
  }));
}

async function getInstitutionDetails({ institutionId, name } = {}) {
  let institution = null;

  if (institutionId) {
    // Direct lookup by ID or ROR
    const searchId = institutionId.startsWith('https://') ? institutionId : `https://openalex.org/${institutionId}`;
    const data = await openAlexFetch('/institutions', {
      filter: `id:${searchId},ror:${institutionId}`,
      per_page: 1,
    });
    institution = data.results?.[0];
  }

  if (!institution && name) {
    // Fallback to search
    const data = await openAlexFetch('/institutions', {
      search: name,
      per_page: 1,
    });
    institution = data.results?.[0];
  }

  if (!institution) {
    return { error: 'Institution not found. Provide a ROR ID or institution name.' };
  }

  const stats = institution.summary_stats || {};
  return {
    id: institution.id?.replace('https://openalex.org/', ''),
    name: institution.display_name,
    ror: institution.ror,
    type: institution.type,
    country: institution.country_code,
    worksCount: institution.works_count,
    citedByCount: institution.cited_by_count,
    hIndex: stats.h_index,
    i10Index: stats.i10_index,
    meanCitedness: stats['2yr_mean_citedness'] ? Math.round(stats['2yr_mean_citedness'] * 100) / 100 : null,
    topFields: institution.x_concepts?.slice(0, 10).map((c) => ({
      field: c.display_name,
      score: c.score,
      worksCount: c.works_count,
    })) || [],
    associatedInstitutions: institution.associated_institutions?.slice(0, 10).map((a) => a.display_name) || [],
    homepage: institution.homepage_url,
    wikipedia: institution.wikipedia_url,
  };
}

async function compareInstitutions({ institutions: names, metrics = ['works_count', 'cited_by_count', 'h_index'] } = {}) {
  if (!names || names.length < 2 || names.length > 5) {
    return { error: 'compare_institutions requires 2-5 institution names' };
  }

  const results = await Promise.all(
    names.map(async (name) => {
      const data = await openAlexFetch('/institutions', { search: name, per_page: 1 });
      return data.results?.[0];
    })
  );

  const valid = results.filter(Boolean);
  if (valid.length < 2) {
    return { error: 'Could not resolve enough institutions. Check names and try again.' };
  }

  const comparison = {};
  for (const inst of valid) {
    const stats = inst.summary_stats || {};
    comparison[inst.display_name] = {
      id: inst.id?.replace('https://openalex.org/', ''),
      ror: inst.ror,
      type: inst.type,
      country: inst.country_code,
      worksCount: inst.works_count,
      citedByCount: inst.cited_by_count,
      hIndex: stats.h_index,
      i10Index: stats.i10_index,
      meanCitedness: stats['2yr_mean_citedness'] ? Math.round(stats['2yr_mean_citedness'] * 100) / 100 : null,
      researchAreas: inst.x_concepts?.slice(0, 5).map((c) => c.display_name) || [],
    };
  }

  // Add relative rankings
  const rankedBy = {
    worksCount: [...valid].sort((a, b) => b.works_count - a.works_count),
    citedByCount: [...valid].sort((a, b) => b.cited_by_count - a.cited_by_count),
    hIndex: [...valid].sort((a, b) => (b.summary_stats?.h_index || 0) - (a.summary_stats?.h_index || 0)),
  };

  for (const instName of Object.keys(comparison)) {
    comparison[instName].rankings = {
      worksCount: rankedBy.worksCount.findIndex((r) => r.display_name === instName) + 1,
      citedByCount: rankedBy.citedByCount.findIndex((r) => r.display_name === instName) + 1,
      hIndex: rankedBy.hIndex.findIndex((r) => r.display_name === instName) + 1,
    };
  }

  return { comparison, institutionsCompared: valid.length };
}

async function getInstitutionResearchAreas({ institutionId, name, maxAreas = 15 } = {}) {
  let searchId = institutionId;
  if (name && !institutionId) {
    const data = await openAlexFetch('/institutions', { search: name, per_page: 1 });
    const inst = data.results?.[0];
    if (inst) searchId = inst.id;
  }

  if (!searchId) {
    return { error: 'Provide institutionId (ROR or OpenAlex ID) or name' };
  }

  const filterId = searchId.startsWith('https://') ? searchId : `https://openalex.org/${searchId}`;
  const data = await openAlexFetch('/institutions', {
    filter: `id:${filterId}`,
    per_page: 1,
  });

  const inst = data.results?.[0];
  if (!inst) {
    return { error: 'Institution not found' };
  }

  const concepts = inst.x_concepts || [];
  return {
    institution: inst.display_name,
    ror: inst.ror,
    totalWorks: inst.works_count,
    researchAreas: concepts.slice(0, maxAreas).map((c) => ({
      field: c.display_name,
      fieldScore: Math.round(c.score * 10) / 10,
      worksCount: c.works_count,
      percentile: c.score > 50 ? 'high' : c.score > 20 ? 'medium' : 'low',
    })),
  };
}

async function analyzeResearchOutput({ country, sector, researchArea, maxResults = 25 } = {}) {
  const filters = [];
  if (country) filters.push(`country_code:${country}`);
  if (sector) filters.push(`type:${sector}`);

  const sortMap = { works_count: 'works_count:desc', cited_by_count: 'cited_by_count:desc', h_index: 'summary_stats.h_index:desc' };
  const params = {
    per_page: Math.min(maxResults, 100),
    sort: sortMap.works_count,
    ...(filters.length > 0 ? { filter: filters.join(',') } : {}),
  };

  const data = await openAlexFetch('/institutions', params);
  const results = data.results || [];

  // If researchArea provided, filter further (OpenAlex doesn't support concept filter on institutions directly)
  let filtered = results;
  if (researchArea) {
    filtered = results.filter((r) =>
      r.x_concepts?.some((c) => c.display_name.toLowerCase().includes(researchArea.toLowerCase()))
    );
  }

  return {
    total: data.meta?.count || filtered.length,
    filters: { country, sector, researchArea },
    institutions: filtered.slice(0, maxResults).map((r) => ({
      name: r.display_name,
      ror: r.ror,
      type: r.type,
      country: r.country_code,
      worksCount: r.works_count,
      citedByCount: r.cited_by_count,
      hIndex: r.summary_stats?.h_index,
      topFields: r.x_concepts?.slice(0, 3).map((c) => c.display_name) || [],
    })),
  };
}

// =============================================================================
// TOOL ROUTER
// =============================================================================

async function handleTool(tool, params) {
  switch (tool) {
    case 'search_institutions':
      return searchInstitutions(params.query, params);
    case 'get_institution_details':
      return getInstitutionDetails(params);
    case 'compare_institutions':
      return compareInstitutions(params);
    case 'get_institution_research_areas':
      return getInstitutionResearchAreas(params);
    case 'analyze_research_output':
      return analyzeResearchOutput(params);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// =============================================================================
// MCP PROTOCOL HANDLER
// =============================================================================

function reply(res, statusCode = 200) {
  return {
    statusCode,
    body: res,
    headers: { 'Content-Type': 'application/json' },
  };
}

function replyError(code, message) {
  return reply({ error: { code, message } }, 400);
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

if (isStandby) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/health' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', actor: 'institution-intelligence-mcp' }));
      return;
    }
    if (url.pathname === '/mcp') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const jsonBody = JSON.parse(body);
          const method = jsonBody.method;

          if (method === 'initialize') {
            return res.end(JSON.stringify(reply({
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'institution-intelligence-mcp', version: '1.0.0' },
            })));
          }

          if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
            return res.end(JSON.stringify(reply({ tools: TOOLS })));
          }

          if (method === 'tools/call') {
            const toolName = jsonBody.params?.name;
            const toolArgs = jsonBody.params?.arguments || {};
            if (!toolName) return res.end(JSON.stringify(replyError(-32602, 'Missing tool name')));
            try {
              const result = await handleTool(toolName, toolArgs);
              const price = TOOL_PRICES[toolName] || 0.01;
              try { await Actor.charge({ eventName: toolName, count: 1 }); } catch (e) { console.error('PPE charge error:', e.message); }
              return res.end(JSON.stringify(reply({ content: [{ type: 'text', text: JSON.stringify(result) }] })));
            } catch (e) {
              return res.end(JSON.stringify(reply({ error: e.message, tool: toolName }, 500)));
            }
          }

          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Method not found' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, () => console.log(`Institution Intelligence MCP listening on port ${PORT}`));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
} else {
  const input = await Actor.getInput();
  if (input) {
    const { tool, params = {} } = input;
    if (tool) {
      const result = await handleTool(tool, params);
      await Actor.setValue('OUTPUT', result);
    }
  }
  await Actor.exit();
}

export default {
  handleRequest: async ({ request, log }) => {
    log.info('Institution Intelligence MCP received request');
    try {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const { tool, params = {} } = body;
      log.info(`Calling tool: ${tool}`);
      const result = await handleTool(tool, params);
      const price = TOOL_PRICES[tool] || 0.01;
      try { await Actor.charge(price); } catch (e) { log.error(`PPE charge error: ${e.message}`); }
      return { result };
    } catch (e) {
      log.error(`Tool error: ${e.message}`);
      return { error: e.message };
    }
  },
};