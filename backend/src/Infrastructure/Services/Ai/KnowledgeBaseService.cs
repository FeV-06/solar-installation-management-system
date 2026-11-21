using System.Text.RegularExpressions;
using Application.Interfaces.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Ai;

public class KnowledgeBaseService : IKnowledgeBaseService
{
    private readonly IHostEnvironment _env;
    private readonly ILogger<KnowledgeBaseService> _logger;
    private readonly List<KnowledgeChunk> _chunks = [];
    private bool _initialized;

    public KnowledgeBaseService(IHostEnvironment env, ILogger<KnowledgeBaseService> logger)
    {
        _env = env;
        _logger = logger;
        InitializeBuiltInKnowledge();
    }

    public Task<IReadOnlyList<KnowledgeChunk>> SearchAsync(string query, string role, int maxResults = 5, CancellationToken ct = default)
    {
        EnsureDocumentationLoaded();

        if (string.IsNullOrWhiteSpace(query))
            return Task.FromResult<IReadOnlyList<KnowledgeChunk>>([]);

        var words = Regex.Split(query.ToLowerInvariant(), @"\W+")
            .Where(w => w.Length > 2)
            .ToHashSet();

        if (words.Count == 0)
            return Task.FromResult<IReadOnlyList<KnowledgeChunk>>(_chunks.Take(maxResults).ToList());

        var scored = _chunks
            .Select(chunk =>
            {
                var text = (chunk.Title + " " + chunk.Content + " " + chunk.Category).ToLowerInvariant();
                int matches = words.Count(w => text.Contains(w));
                double score = matches > 0 ? (double)matches / words.Count : 0.0;

                // Boost role-appropriate categories
                if (role.Equals("Customer", StringComparison.OrdinalIgnoreCase) && chunk.Category is "Subsidies" or "SolarPackages" or "GeneralFAQ")
                    score *= 1.4;
                else if (role.Equals("Technician", StringComparison.OrdinalIgnoreCase) && chunk.Category is "Engineering" or "SiteSurvey")
                    score *= 1.4;
                else if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase) || role.Equals("Sales", StringComparison.OrdinalIgnoreCase))
                    score *= 1.2;

                return chunk with { RelevanceScore = score };
            })
            .Where(c => c.RelevanceScore > 0.1)
            .OrderByDescending(c => c.RelevanceScore)
            .Take(maxResults)
            .ToList();

        return Task.FromResult<IReadOnlyList<KnowledgeChunk>>(scored);
    }

    private void EnsureDocumentationLoaded()
    {
        if (_initialized) return;
        _initialized = true;

        try
        {
            var contentRoot = _env.ContentRootPath;
            var repoRoot = Directory.GetParent(contentRoot)?.Parent?.FullName ?? contentRoot;
            var docsDir = Path.Combine(repoRoot, "docs");

            if (Directory.Exists(docsDir))
            {
                foreach (var file in Directory.GetFiles(docsDir, "*.md"))
                {
                    var text = File.ReadAllText(file);
                    var fileName = Path.GetFileName(file);
                    var sections = text.Split(new[] { "\n## ", "\r\n## " }, StringSplitOptions.RemoveEmptyEntries);

                    foreach (var section in sections)
                    {
                        var lines = section.Trim().Split('\n');
                        var title = lines[0].Trim('#', ' ', '\r');
                        var body = string.Join("\n", lines.Skip(1)).Trim();
                        if (body.Length > 20)
                        {
                            _chunks.Add(new KnowledgeChunk(
                                Title: $"{fileName}: {title}",
                                Category: "Documentation",
                                Content: body.Length > 1500 ? body[..1500] + "..." : body,
                                SourceFile: fileName
                            ));
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load markdown docs from disk into knowledge base.");
        }
    }

    private void InitializeBuiltInKnowledge()
    {
        _chunks.Add(new KnowledgeChunk(
            Title: "PM Surya Ghar: Muft Bijli Yojana Subsidy Guidelines",
            Category: "Subsidies",
            Content: "Under the Government of India's PM Surya Ghar Muft Bijli Yojana, residential consumers receive direct central financial assistance: " +
                     "1 kW system: ₹30,000 subsidy; 2 kW system: ₹60,000 subsidy; 3 kW and above systems: ₹78,000 flat maximum subsidy. " +
                     "Off-grid systems are ineligible for central grid subsidy. Net customer payable is Base Price minus the applicable subsidy. " +
                     "Subsidy is credited directly by the central portal following technical DISCOM inspection and net-meter commissioning.",
            SourceFile: "regulatory/pm_surya_ghar.md"
        ));

        _chunks.Add(new KnowledgeChunk(
            Title: "Residential Solar System Packages & Sizing Formulas",
            Category: "SolarPackages",
            Content: "Sol provides engineered solar rooftop packages from 1 kW to 5 kW: " +
                     "• 1 kW: For monthly bills < ₹1,500. Uses 2x 550W Mono-PERC panels, 1.5 kVA inverter, requires ~8 sq m shadow-free roof area. " +
                     "• 2 kW: For monthly bills ₹1,500–₹2,500. Uses 4x 550W panels, 2.5 kVA inverter, requires ~16 sq m roof area. " +
                     "• 3 kW (Standard Benchmark): For monthly bills ₹2,500–₹4,000. Uses 6x 550W panels, 3.3 kVA inverter, requires ~24 sq m roof area. " +
                     "• 4 kW: For monthly bills ₹4,000–₹5,500. Uses 8x 550W panels, 4.5 kVA inverter. " +
                     "• 5 kW: For monthly bills > ₹5,500. Uses 10x 550W panels, 5.5 kVA inverter, requires ~40 sq m roof area.",
            SourceFile: "engineering/packages.md"
        ));

        _chunks.Add(new KnowledgeChunk(
            Title: "Site Survey Engineering Invariants & Technical Rules",
            Category: "SiteSurvey",
            Content: "Site surveys record structural and electrical feasibility: " +
                     "1. Usable shadow-free roof area in square metres (minimum 8 sq m required per kilowatt). " +
                     "2. Roof tilt angle: Optimal tilt is between 15° and 25° for Indian latitudes facing True South (azimuth 180°). " +
                     "3. Cable route distance: Measured from roof panels to the main electrical distribution board. Total cable kit is calculated as max(25m, (2 * distance) + 10m). " +
                     "4. Grid suitability: Verification that local DISCOM transformer and grid phases support bi-directional net-metering. " +
                     "Strict business gate: A customer quotation CANNOT be generated or sent until the assigned survey is explicitly Approved by an Admin.",
            SourceFile: "engineering/site_survey_rules.md"
        ));

        _chunks.Add(new KnowledgeChunk(
            Title: "Warehouse Packing, Material Fulfillment & Serialization",
            Category: "Warehouse",
            Content: "When a customer accepts a proposal and pays the 20% advance or full amount, a Warehouse Packing Order is automatically created with items from the Bill of Materials. " +
                     "Mandatory serial scanning: Inverters, Batteries, and Charge Controllers REQUIRE unique serial number recording before the packing order can be marked Dispatched. " +
                     "Hardware modules (panels, mounting structures, cabling, distribution boxes) are checked off during packing.",
            SourceFile: "operations/packing_rules.md"
        ));

        _chunks.Add(new KnowledgeChunk(
            Title: "Electrical Safety, Earthing & Lightning Standards",
            Category: "Engineering",
            Content: "Every rooftop installation includes complete electrical protection: " +
                     "• DC Combiner Box (AJB/DCDB): 1000V DC Type 2 Surge Protection Device (SPD) and DC MCBs. " +
                     "• AC Distribution Box (ACDB): Class II AC SPD, residual current circuit breaker (RCCB), and isolation switch. " +
                     "• Earthing & Lightning: Dual maintenance-free chemical earthing pits with copper-bonded electrodes (<5 ohms earth resistance) and a Class A lightning arrester on the highest roof point.",
            SourceFile: "engineering/electrical_safety.md"
        ));
    }
}
