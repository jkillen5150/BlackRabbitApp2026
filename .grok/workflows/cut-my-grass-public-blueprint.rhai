let meta = #{
    name: "cut-my-grass-public-blueprint",
    description: "Research domain, brand link to blackrabbitlawn.com, Yelm print shops, and produce a go-public blueprint for Cut My Grass",
    when_to_use: "When planning Cut My Grass public launch, domain strategy, or local yard-sign marketing in Yelm WA",
    phases: [
        #{ title: "Domain & identity", detail: "cutmygrass.* availability, conflicts, blackrabbitlawn link options" },
        #{ title: "Market & product", detail: "competitors, MVP public slice, brand architecture" },
        #{ title: "Local GTM & print", detail: "Yelm print shops, yard signs, local channels" },
        #{ title: "Blueprint", detail: "synthesize launch plan with costs and timeline" },
        #{ title: "Verify", detail: "adversarial check of high-stakes claims" },
        #{ title: "Deliver", detail: "write final blueprint report" },
    ],
};

// --- Schemas ---
let domain_schema = #{
    "type": "object",
    "required": ["claims"],
    "properties": #{
        "claims": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["claim", "evidence", "confidence"],
                "properties": #{
                    "claim": #{ "type": "string" },
                    "evidence": #{ "type": "string" },
                    "confidence": #{ "type": "string" },
                    "url": #{ "type": "string" },
                },
            },
        },
        "recommended_domains": #{
            "type": "array",
            "maxItems": 8,
            "items": #{ "type": "string" },
        },
        "summary": #{ "type": "string" },
    },
};

let research_schema = #{
    "type": "object",
    "required": ["findings"],
    "properties": #{
        "findings": #{
            "type": "array",
            "maxItems": 10,
            "items": #{
                "type": "object",
                "required": ["topic", "detail", "evidence"],
                "properties": #{
                    "topic": #{ "type": "string" },
                    "detail": #{ "type": "string" },
                    "evidence": #{ "type": "string" },
                    "url": #{ "type": "string" },
                },
            },
        },
        "summary": #{ "type": "string" },
    },
};

let print_schema = #{
    "type": "object",
    "required": ["shops"],
    "properties": #{
        "shops": #{
            "type": "array",
            "maxItems": 10,
            "items": #{
                "type": "object",
                "required": ["name", "location", "notes", "evidence"],
                "properties": #{
                    "name": #{ "type": "string" },
                    "location": #{ "type": "string" },
                    "notes": #{ "type": "string" },
                    "evidence": #{ "type": "string" },
                    "phone": #{ "type": "string" },
                    "url": #{ "type": "string" },
                    "yard_signs": #{ "type": "string" },
                },
            },
        },
        "sign_plan": #{ "type": "string" },
        "summary": #{ "type": "string" },
    },
};

let blueprint_schema = #{
    "type": "object",
    "required": ["title", "markdown"],
    "properties": #{
        "title": #{ "type": "string" },
        "markdown": #{ "type": "string" },
        "domain_recommendation": #{ "type": "string" },
        "brand_link_recommendation": #{ "type": "string" },
        "mvp_scope": #{ "type": "string" },
        "print_next_steps": #{ "type": "string" },
        "timeline_30_60_90": #{ "type": "string" },
        "risks": #{
            "type": "array",
            "maxItems": 12,
            "items": #{ "type": "string" },
        },
        "estimated_cash_costs_usd": #{ "type": "string" },
    },
};

let verdict_schema = #{
    "type": "object",
    "required": ["claim", "real", "reason", "evidence"],
    "properties": #{
        "claim": #{ "type": "string" },
        "real": #{ "type": "boolean" },
        "reason": #{ "type": "string" },
        "evidence": #{ "type": "string" },
        "corrected_fact": #{ "type": "string" },
    },
};

// --- Args (safe defaults for this project) ---
let brand = "Cut My Grass";
let existing_site = "blackrabbitlawn.com";
let region = "Yelm, WA";
let print_focus = "yard signs / coroplast with QR to booking";
let known_shop = "Nisqually Print Shop";
let cmg_path = "https://www.blackrabbitlawn.com/cut-my-grass";

if args != () {
    if args.brand != () { brand = args.brand; }
    if args.existing_site != () { existing_site = args.existing_site; }
    if args.region != () { region = args.region; }
    if args.print_focus != () { print_focus = args.print_focus; }
    if args.known_shop != () { known_shop = args.known_shop; }
    if args.cmg_path != () { cmg_path = args.cmg_path; }
}

log("Brand=" + brand + " | site=" + existing_site + " | region=" + region);

// =============================================================================
// Phase 1 — Domain & identity (parallel)
// =============================================================================
phase("Domain & identity");

let d1 = "";
d1 += "You are a domain and brand researcher. Use web_search and open_page/browse tools — do not answer from memory. ";
d1 += "Brand: " + brand + ". Existing live site: " + existing_site + " (GoDaddy registrar historically; app already live at " + cmg_path + "). ";
d1 += "Tasks: (1) Does cutmygrass.com resolve / who appears to use it / any parking or active business? ";
d1 += "(2) Check related names if possible: cut-my-grass.com, cutmygrass.app, getcutmygrass.com, cutmygrass.services, mycutgrass.com. ";
d1 += "(3) Note trademark / business name collisions for lawn care 'Cut My Grass' if search surfaces them. ";
d1 += "(4) List practical domain options ranked for a local WA lawn brand that already owns " + existing_site + ". ";
d1 += "Return claims[] with claim, evidence, confidence (high/medium/low), and url when available. ";
d1 += "recommended_domains[] as strings. summary in 3-5 sentences. Empty claims only if tools truly failed.";

let d2 = "";
d2 += "You research how to link a product brand to an existing domain without losing SEO. Use web tools for current best practice, not memory. ";
d2 += "Context: " + brand + " is a booking product already at " + cmg_path + " on " + existing_site + ". ";
d2 += "Owner may keep GoDaddy, add a new cutmygrass.* domain, and/or migrate DNS to Vercel (site already on Vercel). ";
d2 += "Evaluate options: (A) path only blackrabbitlawn.com/cut-my-grass, (B) subdomain cut.blackrabbitlawn.com or app., ";
d2 += "(C) new apex cutmygrass.TLD that redirects or reverse-proxies to the product, (D) full brand split. ";
d2 += "For each option give SEO, ops, cost-feel, and migration risk notes with evidence/urls where possible. ";
d2 += "findings[] with topic, detail, evidence, optional url. summary of recommended architecture.";

let d3 = "";
d3 += "Research registrar/migrate costs and practical steps for a small business. Use web_search. ";
d3 += "Owner has " + existing_site + " (GoDaddy login exists — DO NOT ask for passwords; never request credentials). ";
d3 += "Cover: typical .com register/renew prices, transfer-in fees, pointing DNS to Vercel, keeping email if any, ";
d3 += "risks of registrar lock, and when NOT to migrate. findings[] with topic, detail, evidence, url. summary.";

let domain_jobs = [
    #{ prompt: d1, label: "domain-status", capability_mode: "read-only", output_schema: domain_schema },
    #{ prompt: d2, label: "brand-link", capability_mode: "read-only", output_schema: research_schema },
    #{ prompt: d3, label: "registrar-migrate", capability_mode: "read-only", output_schema: research_schema },
];
let domain_results = parallel(domain_jobs);

let domain_claims_text = "";
let brand_link_text = "";
let registrar_text = "";
let recommended_domains_text = "";

if domain_results[0] != () && domain_results[0].success && domain_results[0].output != () {
    let o = domain_results[0].output;
    if o.summary != () { domain_claims_text += "SUMMARY: " + o.summary + "\n"; }
    if o.recommended_domains != () {
        for dd in o.recommended_domains {
            recommended_domains_text += "- " + dd + "\n";
            domain_claims_text += "DOMAIN_OPTION: " + dd + "\n";
        }
    }
    if o.claims != () {
        for c in o.claims {
            domain_claims_text += "CLAIM: " + c.claim + " | conf=" + c.confidence + " | ev=" + c.evidence;
            if c.url != () { domain_claims_text += " | url=" + c.url; }
            domain_claims_text += "\n";
        }
    }
} else {
    domain_claims_text = "DOMAIN RESEARCH FAILED OR EMPTY — treat all domain facts as unverified.\n";
    log("domain-status agent failed or empty");
}

if domain_results[1] != () && domain_results[1].success && domain_results[1].output != () {
    let o = domain_results[1].output;
    if o.summary != () { brand_link_text += "SUMMARY: " + o.summary + "\n"; }
    if o.findings != () {
        for f in o.findings {
            brand_link_text += "- " + f.topic + ": " + f.detail + " [" + f.evidence + "]";
            if f.url != () { brand_link_text += " " + f.url; }
            brand_link_text += "\n";
        }
    }
} else {
    brand_link_text = "BRAND-LINK RESEARCH FAILED — fallback to path-only architecture.\n";
    log("brand-link agent failed or empty");
}

if domain_results[2] != () && domain_results[2].success && domain_results[2].output != () {
    let o = domain_results[2].output;
    if o.summary != () { registrar_text += "SUMMARY: " + o.summary + "\n"; }
    if o.findings != () {
        for f in o.findings {
            registrar_text += "- " + f.topic + ": " + f.detail + " [" + f.evidence + "]";
            if f.url != () { registrar_text += " " + f.url; }
            registrar_text += "\n";
        }
    }
} else {
    registrar_text = "REGISTRAR RESEARCH FAILED — use general industry norms only as low-confidence.\n";
    log("registrar-migrate agent failed or empty");
}

// =============================================================================
// Phase 2 — Market & product (parallel)
// =============================================================================
phase("Market & product");

let m1 = "";
m1 += "Competitive scan for local lawn-care booking / 'cut my grass' style apps and services. Use web_search. ";
m1 += "Focus: Pacific Northwest / national apps that a " + region + " homeowner might use (LawnStarter, GreenPal, TaskRabbit, local FB groups, etc.). ";
m1 += "For each relevant competitor note: model (marketplace vs single operator), pricing if public, booking UX, and what " + brand + " (single-operator Black Rabbit) should NOT try to copy yet. ";
m1 += "findings[] topic/detail/evidence/url. summary: 3 differentiators for a local operator app.";

let m2 = "";
m2 += "Product MVP scope for public launch of " + brand + " as a product of Black Rabbit Lawn. ";
m2 += "Known live stack (trust this product truth; use web only for market norms): static/site + /cut-my-grass booking, lead API, optional $25 Stripe deposit, track page, Ask AI chat, Vercel, " + existing_site + ". ";
m2 += "Marketplace multi-crew is TABLED. Propose public-ready MVP: must-have vs later, messaging, QR destination URL (" + cmg_path + "), conversion funnel. ";
m2 += "findings[] with concrete product decisions. summary: one-paragraph MVP definition.";

let m3 = "";
m3 += "Brand architecture: how to present " + brand + " publicly while " + existing_site + " is the company domain. ";
m3 += "Search for examples of product-sub-brands in home services (optional web tools). ";
m3 += "Recommend: logo lockup language, social handle strategy, Google Business profile link target, yard-sign URL text (short). ";
m3 += "findings[] + summary with a single recommended public URL to print on signs.";

let market_jobs = [
    #{ prompt: m1, label: "competitors", capability_mode: "read-only", output_schema: research_schema },
    #{ prompt: m2, label: "mvp-scope", capability_mode: "read-only", output_schema: research_schema },
    #{ prompt: m3, label: "brand-arch", capability_mode: "read-only", output_schema: research_schema },
];
let market_results = parallel(market_jobs);

let market_text = "";
let i = 0;
for r in market_results {
    let labels = ["competitors", "mvp-scope", "brand-arch"];
    let lab = labels[i];
    market_text += "### " + lab + "\n";
    if r != () && r.success && r.output != () {
        if r.output.summary != () { market_text += "SUMMARY: " + r.output.summary + "\n"; }
        if r.output.findings != () {
            for f in r.output.findings {
                market_text += "- " + f.topic + ": " + f.detail + " [" + f.evidence + "]";
                if f.url != () { market_text += " " + f.url; }
                market_text += "\n";
            }
        }
    } else {
        market_text += "(agent failed or empty)\n";
        log(lab + " agent failed or empty");
    }
    i += 1;
}

// =============================================================================
// Phase 3 — Local GTM & print (parallel)
// =============================================================================
phase("Local GTM & print");

let p1 = "";
p1 += "Find print shops serving " + region + " (Yelm, Rainier, Olympia, Lacey, Thurston County WA) that can produce " + print_focus + ". ";
p1 += "START with and specifically research: " + known_shop + " — address/phone/hours/services if public, whether they do yard/coroplast signs. ";
p1 += "Also find 3-6 alternatives (UPS Store, FedEx Office, local shops). Use web_search and open pages. ";
p1 += "Return shops[] with name, location, notes, evidence, optional phone/url/yard_signs. sign_plan: recommended first order (qty, size 18x24, single vs double, H-stakes, QR to " + cmg_path + "). summary.";

let p2 = "";
p2 += "Local go-to-market channels for a lawn care operator in " + region + ". Use web tools where helpful. ";
p2 += "Cover: Nextdoor, Facebook groups, Google Business Profile, truck magnets, door hangers, yard signs after jobs, Reels. ";
p2 += "Prioritize FREE and under-$200 tactics first. findings[] + summary ranked 30-day plan.";

let p3 = "";
p3 += "Rough unit economics for local print + first public push for " + brand + " in " + region + ". ";
p3 += "Use web_search for typical coroplast 18x24 yard sign price ranges (local and online packs). ";
p3 += "Budget scenarios: $50 / $150 / $400 first-month marketing including signs. findings[] + summary.";

let print_jobs = [
    #{ prompt: p1, label: "print-shops", capability_mode: "read-only", output_schema: print_schema },
    #{ prompt: p2, label: "local-gtm", capability_mode: "read-only", output_schema: research_schema },
    #{ prompt: p3, label: "print-budget", capability_mode: "read-only", output_schema: research_schema },
];
let print_results = parallel(print_jobs);

let print_text = "";
if print_results[0] != () && print_results[0].success && print_results[0].output != () {
    let o = print_results[0].output;
    if o.summary != () { print_text += "PRINT SUMMARY: " + o.summary + "\n"; }
    if o.sign_plan != () { print_text += "SIGN PLAN: " + o.sign_plan + "\n"; }
    if o.shops != () {
        for s in o.shops {
            print_text += "SHOP: " + s.name + " @ " + s.location + " — " + s.notes;
            if s.phone != () { print_text += " | phone=" + s.phone; }
            if s.url != () { print_text += " | " + s.url; }
            if s.yard_signs != () { print_text += " | signs=" + s.yard_signs; }
            print_text += " | ev=" + s.evidence + "\n";
        }
    }
} else {
    print_text += "PRINT SHOPS RESEARCH FAILED — mark print contacts as unverified.\n";
    log("print-shops agent failed or empty");
}

if print_results[1] != () && print_results[1].success && print_results[1].output != () {
    let o = print_results[1].output;
    print_text += "\n### local-gtm\n";
    if o.summary != () { print_text += "SUMMARY: " + o.summary + "\n"; }
    if o.findings != () {
        for f in o.findings {
            print_text += "- " + f.topic + ": " + f.detail + " [" + f.evidence + "]\n";
        }
    }
} else {
    print_text += "\nlocal-gtm failed\n";
}

if print_results[2] != () && print_results[2].success && print_results[2].output != () {
    let o = print_results[2].output;
    print_text += "\n### print-budget\n";
    if o.summary != () { print_text += "SUMMARY: " + o.summary + "\n"; }
    if o.findings != () {
        for f in o.findings {
            print_text += "- " + f.topic + ": " + f.detail + " [" + f.evidence + "]\n";
        }
    }
} else {
    print_text += "\nprint-budget failed\n";
}

// =============================================================================
// Phase 4 — Blueprint synthesis
// =============================================================================
phase("Blueprint");

let research_pack = "";
research_pack += "# DOMAIN\n" + domain_claims_text + "\n";
research_pack += "# RECOMMENDED DOMAINS\n" + recommended_domains_text + "\n";
research_pack += "# BRAND LINK\n" + brand_link_text + "\n";
research_pack += "# REGISTRAR\n" + registrar_text + "\n";
research_pack += "# MARKET\n" + market_text + "\n";
research_pack += "# PRINT & GTM\n" + print_text + "\n";

// Cap pack size for prompt safety (hand-roll truncate)
let pack_for_prompt = research_pack;
if pack_for_prompt.len() > 28000 {
    pack_for_prompt = pack_for_prompt.sub_string(0, 28000);
    pack_for_prompt += "\n\n[TRUNCATED FOR LENGTH]\n";
    log("research pack truncated for blueprint agent");
}

let bp_prompt = "";
bp_prompt += "You are a product + go-to-market lead writing a GO-PUBLIC BLUEPRINT for " + brand + ". ";
bp_prompt += "Existing company site: " + existing_site + ". Live booking path: " + cmg_path + ". Region: " + region + ". ";
bp_prompt += "Use ONLY the research pack below plus clearly labeled inference. Do not invent phone numbers or shop hours not in the pack. ";
bp_prompt += "If evidence is weak, say UNVERIFIED. Never request or invent login credentials.\n\n";
bp_prompt += "RESEARCH PACK:\n" + pack_for_prompt + "\n\n";
bp_prompt += "Write markdown covering ALL sections:\n";
bp_prompt += "1. Executive summary\n";
bp_prompt += "2. Domain status (cutmygrass.com and alternatives) + recommendation\n";
bp_prompt += "3. Brand architecture: how " + brand + " links to " + existing_site + " (path/subdomain/new domain) + migrate/upgrade decision tree (stay GoDaddy DNS vs move)\n";
bp_prompt += "4. Competitive snapshot + differentiation\n";
bp_prompt += "5. Public MVP scope (what ships now vs later)\n";
bp_prompt += "6. Yelm print plan: shops (esp " + known_shop + "), first yard-sign order, QR target URL\n";
bp_prompt += "7. 30 / 60 / 90 day public launch checklist\n";
bp_prompt += "8. Cash cost ranges (domains, hosting already on Vercel, print, optional ads) — not AI agent costs\n";
bp_prompt += "9. Risks & open questions (mark verified vs unverified)\n";
bp_prompt += "Also fill schema fields: title, markdown (full doc), domain_recommendation, brand_link_recommendation, ";
bp_prompt += "mvp_scope, print_next_steps, timeline_30_60_90, risks[], estimated_cash_costs_usd.";

let bp = agent(bp_prompt, #{
    label: "blueprint-synth",
    capability_mode: "read-only",
    output_schema: blueprint_schema,
});

let blueprint_md = "";
let domain_rec = "";
let brand_rec = "";
let mvp_rec = "";
let print_next = "";
let timeline = "";
let costs = "";
let risk_list = [];

if bp.success && bp.output != () {
    if bp.output.markdown != () { blueprint_md = bp.output.markdown; }
    if bp.output.domain_recommendation != () { domain_rec = bp.output.domain_recommendation; }
    if bp.output.brand_link_recommendation != () { brand_rec = bp.output.brand_link_recommendation; }
    if bp.output.mvp_scope != () { mvp_rec = bp.output.mvp_scope; }
    if bp.output.print_next_steps != () { print_next = bp.output.print_next_steps; }
    if bp.output.timeline_30_60_90 != () { timeline = bp.output.timeline_30_60_90; }
    if bp.output.estimated_cash_costs_usd != () { costs = bp.output.estimated_cash_costs_usd; }
    if bp.output.risks != () { risk_list = bp.output.risks; }
    if blueprint_md == () && bp.output.title != () {
        blueprint_md = "# " + bp.output.title + "\n\n(markdown field empty — fields only)\n";
    }
} else {
    log("blueprint-synth failed — building fallback skeleton");
    blueprint_md = "# Cut My Grass — Public Blueprint (FALLBACK)\n\nBlueprint synthesizer failed. Raw research follows.\n\n";
    blueprint_md += research_pack;
}

// =============================================================================
// Phase 5 — Adversarial verify (high-stakes claims)
// =============================================================================
phase("Verify");

// Fixed claim set derived deterministically from blueprint highlights + always-critical checks
let claims_to_verify = [];
claims_to_verify.push("cutmygrass.com domain status as stated in the blueprint is accurate today");
claims_to_verify.push(known_shop + " exists and serves " + region + " / nearby for print or yard signs");
claims_to_verify.push("Recommended public booking URL for yard signs should be " + cmg_path + " or the blueprint's printed URL");
claims_to_verify.push("Keeping " + existing_site + " as company domain with " + brand + " as product path is a sound default");

if domain_rec != () {
    let dr = domain_rec;
    if dr.len() > 280 { dr = dr.sub_string(0, 280); }
    claims_to_verify.push("Domain recommendation is justified: " + dr);
}
if print_next != () {
    let pn = print_next;
    if pn.len() > 280 { pn = pn.sub_string(0, 280); }
    claims_to_verify.push("Print next steps are actionable and shops/pricing not fabricated: " + pn);
}

// Cap verifiers
let max_v = 6;
let vjobs = [];
let vi = 0;
for c in claims_to_verify {
    if vi >= max_v { break; }
    let vp = "";
    vp += "Adversarially verify this claim about " + brand + " / " + existing_site + " / " + region + ". ";
    vp += "Use web_search and open_page — do not trust the claim. Set real=true ONLY with concrete evidence you inspected. ";
    vp += "Otherwise real=false and explain. Provide corrected_fact if wrong.\n\nCLAIM: " + c;
    vjobs.push(#{
        prompt: vp,
        label: "verify-" + vi.to_string(),
        capability_mode: "read-only",
        output_schema: verdict_schema,
    });
    vi += 1;
}

let verdicts = parallel(vjobs);
let verify_md = "\n\n---\n\n# Verification appendix\n\n";
let confirmed = 0;
let checked = 0;
let vj = 0;
for v in verdicts {
    checked += 1;
    if v != () && v.success && v.output != () {
        let real = v.output.real;
        let mark = "UNVERIFIED/FALSE";
        if real == true {
            if v.output.evidence != () && v.output.evidence != "" {
                mark = "CONFIRMED";
                confirmed += 1;
            }
        }
        verify_md += "## Claim " + vj.to_string() + " — " + mark + "\n";
        if v.output.claim != () { verify_md += "**Claim:** " + v.output.claim + "\n\n"; }
        verify_md += "**Reason:** " + v.output.reason + "\n\n";
        verify_md += "**Evidence:** " + v.output.evidence + "\n\n";
        if v.output.corrected_fact != () && v.output.corrected_fact != "" {
            verify_md += "**Correction:** " + v.output.corrected_fact + "\n\n";
        }
    } else {
        verify_md += "## Claim " + vj.to_string() + " — NO_VERDICT (agent failed)\n\n";
        log("verifier " + vj.to_string() + " failed");
    }
    vj += 1;
}
log(confirmed.to_string() + "/" + checked.to_string() + " claims confirmed with evidence");

// =============================================================================
// Phase 6 — Deliver
// =============================================================================
phase("Deliver");

let final_md = "";
final_md += "# Cut My Grass — Go-Public Blueprint\n\n";
final_md += "_Generated by workflow `cut-my-grass-public-blueprint`._  \n";
final_md += "**Brand:** " + brand + " · **Company site:** " + existing_site + " · **Region:** " + region + "  \n";
final_md += "**Live booking:** " + cmg_path + "  \n";
final_md += "**Verification:** " + confirmed.to_string() + "/" + checked.to_string() + " high-stakes claims confirmed with evidence.\n\n";
final_md += "---\n\n";
final_md += blueprint_md;
final_md += "\n\n---\n\n## Structured recommendations\n\n";
if domain_rec != () { final_md += "### Domain\n" + domain_rec + "\n\n"; }
if brand_rec != () { final_md += "### Brand link\n" + brand_rec + "\n\n"; }
if mvp_rec != () { final_md += "### MVP\n" + mvp_rec + "\n\n"; }
if print_next != () { final_md += "### Print next steps\n" + print_next + "\n\n"; }
if timeline != () { final_md += "### 30/60/90\n" + timeline + "\n\n"; }
if costs != () { final_md += "### Cash costs (non-AI)\n" + costs + "\n\n"; }
if risk_list.len() > 0 {
    final_md += "### Risks\n";
    for rk in risk_list { final_md += "- " + rk + "\n"; }
    final_md += "\n";
}
final_md += verify_md;
final_md += "\n---\n\n## Appendix — research excerpts\n\n";
final_md += "### Domain claims\n" + domain_claims_text + "\n";
final_md += "### Print & GTM\n" + print_text + "\n";

let path = write_scratch_file("cut-my-grass-public-blueprint.md", final_md);
log("Wrote blueprint to " + path);

complete(#{
    path: path,
    summary: "Cut My Grass go-public blueprint: " + confirmed.to_string() + "/" + checked.to_string() + " claims verified",
    domain_recommendation: domain_rec,
    brand_link_recommendation: brand_rec,
    print_next_steps: print_next,
    verified_claims: confirmed,
    checked_claims: checked,
    live_booking: cmg_path,
});
