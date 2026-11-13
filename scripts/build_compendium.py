#!/usr/bin/env python3
"""
BondLens Compendium Generator
Generates comprehensive DOCX and PDF documents containing the complete source code,
mathematical foundations, architectural blueprints, and execution guides.
"""

import os
import sys
import subprocess
from datetime import datetime

ROOT_DIR = "/Users/chiranthansv/.gemini/antigravity-ide/scratch/fixed-income-rv-platform"
OUTPUT_DOCX = os.path.join(ROOT_DIR, "BondLens_Complete_Codebase_and_Architecture_Guide.docx")
OUTPUT_PDF = os.path.join(ROOT_DIR, "BondLens_Complete_Codebase_and_Architecture_Guide.pdf")
OUTPUT_MD = os.path.join(ROOT_DIR, "BondLens_Complete_Codebase_and_Architecture_Guide.md")

# Ordered list of core codebase files with pedagogical metadata
FILE_MANIFEST = [
    # Documentation & Config
    {
        "category": "Project Overview & Configuration",
        "path": "README.md",
        "lang": "markdown",
        "summary": "Root project documentation detailing analytical architecture, system dependencies, and deployment instructions."
    },
    {
        "category": "Project Overview & Configuration",
        "path": "frontend/package.json",
        "lang": "json",
        "summary": "Frontend Node package manifest detailing React 19, TypeScript, Vite, TailwindCSS, Plotly.js, and Lucide icons."
    },
    {
        "category": "Project Overview & Configuration",
        "path": "frontend/vite.config.ts",
        "lang": "typescript",
        "summary": "Vite bundler configuration with React plugin and development server host bindings."
    },
    {
        "category": "Project Overview & Configuration",
        "path": "frontend/index.html",
        "lang": "html",
        "summary": "Single Page Application (SPA) HTML5 entrypoint with Google Fonts (Inter & JetBrains Mono) typography."
    },
    {
        "category": "Project Overview & Configuration",
        "path": "frontend/src/index.css",
        "lang": "css",
        "summary": "Global styling rules, institutional research table styling, accent strip utility classes, and custom scrollbars."
    },

    # Core Mathematical & Financial Engineering Modules
    {
        "category": "Core Fixed-Income Pricing & Analytical Engine",
        "path": "backend/fixed_income/pricing.py",
        "lang": "python",
        "summary": "Deterministic cash flow generation, dirty/clean price conversion, high-precision Newton-Raphson & bounded secant YTM root-solver, Macaulay duration, modified duration, analytical convexity, and dollar DV01 calculation."
    },
    {
        "category": "Yield Curves & Spread Calibration",
        "path": "backend/curves/nelson_siegel.py",
        "lang": "python",
        "summary": "Parametric Nelson-Siegel 4-parameter continuous yield curve model (level, slope, curvature, decay) with Levenberg-Marquardt non-linear least squares calibration."
    },
    {
        "category": "Yield Curves & Spread Calibration",
        "path": "backend/curves/benchmark.py",
        "lang": "python",
        "summary": "US Treasury benchmark yield curve fitting, spot curve bootstrapping, and exact G-spread (vs interpolated benchmark) and Z-spread (zero-volatility spread) derivation."
    },
    {
        "category": "Peer Group Similarity & Clustering",
        "path": "backend/peer_group/engine.py",
        "lang": "python",
        "summary": "Multi-attribute peer selection using normalized Gower distance metric over rating notch differences, sector cohorts, duration proximity, and liquidity scores."
    },
    {
        "category": "Econometric Fair Value Modeling",
        "path": "backend/valuation/fair_value.py",
        "lang": "python",
        "summary": "Multi-factor econometric fair spread regression engines: Huber Robust Regression (M-estimator down-weighting fat-tail spread outliers), Ridge L2 regularization, and OLS benchmarks with studentized residual diagnostics."
    },
    {
        "category": "Relative Value Scoring & Attribution",
        "path": "backend/relative_value/scoring.py",
        "lang": "python",
        "summary": "Cross-sectional dislocation scoring, studentized z-score calculation, liquidity haircut deductions, and composite 0-100 Relative Value Score ranking."
    },
    {
        "category": "Relative Value Scoring & Attribution",
        "path": "backend/relative_value/decomposition.py",
        "lang": "python",
        "summary": "Waterfall factor attribution decomposing observed G-spread into Duration Risk, Credit Quality, Sector Premium, Liquidity Haircut, and Unexplained RV Alpha Gap."
    },
    {
        "category": "Relative Value Scoring & Attribution",
        "path": "backend/relative_value/case_study.py",
        "lang": "python",
        "summary": "Comprehensive 9-section Analyst Research Case Study engine synthesizing observed pricing, model fair values, peer concessions, carry breakevens, and thesis invalidation triggers."
    },
    {
        "category": "3D Analytical Manifold & Visualization",
        "path": "backend/relative_value/surface_3d.py",
        "lang": "python",
        "summary": "Continuous 3D regression surface manifold mapping Duration (X), Credit Spread (Y), and Relative-Value Score (Z) with parametric grid meshing."
    },
    {
        "category": "Risk & Stress Testing Engine",
        "path": "backend/risk/stress_testing.py",
        "lang": "python",
        "summary": "Multi-scenario parametric stress testing modeling parallel yield shifts (+/-50, +/-100, +/-200 bps), non-parallel curve twists (steepener, flattener), and credit spread widening/tightening."
    },
    {
        "category": "Walk-Forward Historical Backtesting",
        "path": "backend/backtesting/engine.py",
        "lang": "python",
        "summary": "Out-of-sample walk-forward parametric simulation modeling residual mean-reversion via continuous Ornstein-Uhlenbeck drift mechanics, trade friction deductions, and Sharpe/drawdown tracking."
    },
    {
        "category": "Data Quality, Validation & Provenance",
        "path": "backend/data/universe.py",
        "lang": "python",
        "summary": "Canonical institutional corporate credit universe containing 204 USD investment-grade and high-yield securities with sector, rating, coupon, maturity, and pricing parameters."
    },
    {
        "category": "Data Quality, Validation & Provenance",
        "path": "backend/data/validation.py",
        "lang": "python",
        "summary": "Automated market feed integrity auditor verifying quote freshness, duration positivity, non-negative convexity, crossed bid-ask sheets, and 3.0 IQR statistical outliers."
    },
    {
        "category": "Data Quality, Validation & Provenance",
        "path": "backend/analytics/provenance.py",
        "lang": "python",
        "summary": "Forensic mathematical provenance engine categorizing all platform statistics into epistemic classifications (Observed, Calculated, Model Estimate, Assumption) with formulaic citations."
    },

    # Application Layer & API
    {
        "category": "Backend Coordination & REST API",
        "path": "backend/api/service.py",
        "lang": "python",
        "summary": "Singleton platform coordinator managing analytical pipelines, caching calibrated curves, and coordinating valuation updates."
    },
    {
        "category": "Backend Coordination & REST API",
        "path": "backend/api/routes.py",
        "lang": "python",
        "summary": "FastAPI REST routing defining universe screens, bond dossiers, 3D surface grids, peer queries, backtests, and provenance data endpoints."
    },
    {
        "category": "Backend Coordination & REST API",
        "path": "backend/api/main.py",
        "lang": "python",
        "summary": "FastAPI application server entrypoint configuring CORS middleware, OpenAPI documentation metadata, health checks, and service discovery."
    },

    # Automated Unit & Mathematical Verification Tests
    {
        "category": "Verification & Test Suite",
        "path": "backend/tests/test_financial_engines.py",
        "lang": "python",
        "summary": "Unit tests verifying pricing at par, YTM root-solver convergence, duration/convexity sensitivities, Nelson-Siegel calibration, Huber regression, and API responses."
    },
    {
        "category": "Verification & Test Suite",
        "path": "backend/tests/test_audit_fixes.py",
        "lang": "python",
        "summary": "Regression tests proving resolution of financial audit issues including outlier down-weighting, look-ahead bias prevention, and unit consistency."
    },
    {
        "category": "Verification & Test Suite",
        "path": "backend/tests/test_provenance.py",
        "lang": "python",
        "summary": "Validation tests verifying mathematical consistency of dollar DV01, breakeven spread widening buffers, and epistemic labeling completeness."
    },

    # Frontend TypeScript Analytical Definitions & API Services
    {
        "category": "Frontend Architecture & Analytical Types",
        "path": "frontend/src/types/index.ts",
        "lang": "typescript",
        "summary": "Strict TypeScript analytical interface definitions for bonds, valuations, decomposition waterfalls, peer groups, stress tests, backtest metrics, and provenance records."
    },
    {
        "category": "Frontend Architecture & Analytical Types",
        "path": "frontend/src/services/api.ts",
        "lang": "typescript",
        "summary": "Typed asynchronous HTTP client communicating with backend FastAPI endpoints for overview, securities, 3D mesh, backtest, and data quality audits."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/App.tsx",
        "lang": "typescript",
        "summary": "Root application container managing active tabs, global selected security state synchronization, configuration modal toggles, and institutional footer."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/Navbar.tsx",
        "lang": "typescript",
        "summary": "Institutional navigation bar featuring BondLens branding, live UTC clock, tab navigation, global selected security indicator chip, and audit health badges."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/DashboardOverview.tsx",
        "lang": "typescript",
        "summary": "Main Research Overview page displaying Market Snapshot metric pills, Top Relative-Value Dislocation cards with teal accents, and searchable 204-security universe table."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/ScreenerView.tsx",
        "lang": "typescript",
        "summary": "Interactive Relative Value Screener combining 3-pane layout, Fair Value Parity Regression scatter plot with semantic teal/coral coloring, and ranking tables."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/AnalystDeepDiveView.tsx",
        "lang": "typescript",
        "summary": "Central Bond Dossier presenting security header, 6 key metrics with accent strips, hero RV GAP cell, and structured 5-step 'Why This Security?' investment research briefing."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/Surface3DView.tsx",
        "lang": "typescript",
        "summary": "Interactive 3D Relative-Value Surface rendered via WebGL Plotly.js using sequential scientific color mapping (deep blue -> teal -> amber) paired with selected security panel."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/BacktestingView.tsx",
        "lang": "typescript",
        "summary": "Walk-forward parametric simulation screen displaying out-of-sample Sharpe ratios, hit rates, max drawdowns, Ornstein-Uhlenbeck drift protocol, and execution trade logs."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/AnalystCaseStudyView.tsx",
        "lang": "typescript",
        "summary": "Publication-ready 9-section Analyst Research Case Study memo documenting market observations, econometric fair value, peer concessions, liquidity haircuts, carry breakevens, and thesis risks."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/DataQualityView.tsx",
        "lang": "typescript",
        "summary": "Automated data quality & feed integrity audit view showing data health score, critical violation counts, institutional validation rules, and diagnostic audit logs."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/ProvenanceView.tsx",
        "lang": "typescript",
        "summary": "Mathematical model validation & audit trail view enabling line-by-line inspection of inputs, formulas, sample sizes, and unit tests for every displayed financial metric."
    },
    {
        "category": "Frontend Workstation Views & UI",
        "path": "frontend/src/components/ScoringConfigModal.tsx",
        "lang": "typescript",
        "summary": "Modal dialog enabling quantitative analysts to customize scoring weights across Fair Value Z-Score, Peer Distance, Liquidity Haircut, and Carry/Rollup."
    }
]

def generate_markdown():
    print(f"[*] Assembling master Markdown compendium...")
    lines = []
    
    # Title & Metadata
    lines.append("# BondLens — Fixed-Income Relative-Value & Mispricing Intelligence Platform")
    lines.append("## Complete Codebase, Analytical Architecture, Mathematical Foundations & Implementation Compendium")
    lines.append("")
    lines.append(f"**Publication Date:** {datetime.now().strftime('%B %d, %Y')}  ")
    lines.append(f"**System Version:** Release 1.2 (Institutional Quantitative Research Workstation)  ")
    lines.append(f"**Document Classification:** Production Codebase & Mathematical Reference Manual  ")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Executive Summary
    lines.append("## 1. Executive Summary & Platform Overview")
    lines.append("")
    lines.append("**BondLens** is an institutional-grade fixed-income quantitative research workstation designed for institutional credit asset managers, relative-value hedge funds, and fixed-income research analysts. The platform systematically addresses the core challenges of corporate credit relative-value investing:")
    lines.append("")
    lines.append("1. **Credit Spread De-Noising & Fair Value Discovery:** Raw credit spreads (G-spreads) confound duration exposure, credit quality, liquidity premia, sector fundamentals, and idiosyncratic market dislocations. BondLens isolates genuine mispricing using robust econometric modeling.")
    lines.append("2. **Robust Statistical Modeling:** Standard Ordinary Least Squares (OLS) regressions are vulnerable to corporate bond spread outliers (distressed issuers, illiquid quotes). BondLens employs Huber M-estimation to down-weight extreme residuals and prevent distorted fair-value curves.")
    lines.append("3. **Multi-Attribute Peer Selection:** Traditional peer groups rely on blunt sector tags. BondLens uses normalized Gower distance clustering over rating notch differences, duration proximity, sector cohorts, and bid-ask liquidity scores.")
    lines.append("4. **Full Epistemic Traceability:** In institutional finance, 'black box' AI metrics are unacceptable. BondLens forensically documents the provenance of every single displayed number—categorizing each as Observed Data, Calculated Statistic, Model Estimate, or Simulation Assumption.")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Mathematical Foundations
    lines.append("## 2. Mathematical & Econometric Foundations")
    lines.append("")
    lines.append("### 2.1 Exact Bond Pricing & Cash Flow Conventions")
    lines.append("Given an annual coupon rate $C$, face value $M$ (typically 100 par), annual coupon frequency $f$ (e.g. $f = 2$ for semi-annual payments), and $N$ scheduled coupon payments occurring at fractions of years $t_i$ from the settlement date, the clean price $P_{\\text{clean}}$ and dirty (invoice) price $P_{\\text{dirty}}$ satisfy:")
    lines.append("")
    lines.append("$$P_{\\text{dirty}} = \\sum_{i=1}^{N} \\frac{C \\cdot M / f}{(1 + y/f)^{f \\cdot t_i}} + \\frac{M}{(1 + y/f)^{f \\cdot t_N}}$$")
    lines.append("$$P_{\\text{clean}} = P_{\\text{dirty}} - \\text{Accrued Interest}$$")
    lines.append("")
    lines.append("Where Accrued Interest is calculated on an exact 30/360 or Actual/Actual day-count convention based on the elapsed fraction of the coupon period:")
    lines.append("$$\\text{Accrued Interest} = \\frac{C \\cdot M}{f} \\times \\frac{\\text{Days Elapsed}}{\\text{Days in Period}}$$")
    lines.append("")
    lines.append("### 2.2 Yield to Maturity (YTM) Solver")
    lines.append("Given an observed market dirty price $P_{\\text{target}}$, the Yield to Maturity $y$ is the internal rate of return satisfying the non-linear equation:")
    lines.append("$$f(y) = \\sum_{i=1}^{N} \\frac{CF_i}{(1 + y/f)^{f \\cdot t_i}} - P_{\\text{target}} = 0$$")
    lines.append("BondLens employs a hybrid root-finding solver combining **Newton-Raphson iterations**:")
    lines.append("$$y_{k+1} = y_k - \\frac{f(y_k)}{f'(y_k)}$$")
    lines.append("with analytical derivative $f'(y) = -\\sum_{i=1}^N \\frac{t_i \\cdot CF_i}{(1 + y/f)^{f \\cdot t_i + 1}}$, and automatically falls back to a bounded **Secant / Bisection** method if the derivative approaches zero or oscillations occur. Convergence tolerance is set to $\\epsilon = 10^{-7}$.")
    lines.append("")
    lines.append("### 2.3 Duration, Convexity, and Dollar DV01")
    lines.append("- **Macaulay Duration ($D_{\\text{mac}}$)**: Weighted average maturity of cash flows:")
    lines.append("$$D_{\\text{mac}} = \\frac{1}{P_{\\text{dirty}}} \\sum_{i=1}^{N} \\frac{t_i \\cdot CF_i}{(1 + y/f)^{f \\cdot t_i}}$$")
    lines.append("- **Modified Duration ($D_{\\text{mod}}$)**: Percentage price sensitivity to a 100 bps shift in yield:")
    lines.append("$$D_{\\text{mod}} = \\frac{D_{\\text{mac}}}{1 + y/f} = -\\frac{1}{P_{\\text{dirty}}} \\frac{dP}{dy}$$")
    lines.append("- **Vanilla Convexity ($C_{\\text{vx}}$)**: Curvature of the price-yield relationship:")
    lines.append("$$C_{\\text{vx}} = \\frac{1}{P_{\\text{dirty}} (1 + y/f)^2} \\sum_{i=1}^{N} \\frac{t_i (t_i + 1/f) \\cdot CF_i}{(1 + y/f)^{f \\cdot t_i}}$$")
    lines.append("- **Dollar DV01 ($DV_{01}$)**: The dollar price change per $100 par for a 1 basis point (0.0001) parallel yield decrease:")
    lines.append("$$DV_{01} = D_{\\text{mod}} \\times P_{\\text{clean}} \\times 0.0001$$")
    lines.append("")
    lines.append("### 2.4 Nelson-Siegel Parametric Benchmark Curve")
    lines.append("BondLens models the risk-free US Treasury benchmark spot curve continuously using the Nelson-Siegel 4-parameter formulation:")
    lines.append("$$y(t; \\beta_0, \\beta_1, \\beta_2, \\lambda) = \\beta_0 + \\beta_1 \\left( \\frac{1 - e^{-t/\\lambda}}{t/\\lambda} \\right) + \\beta_2 \\left( \\frac{1 - e^{-t/\\lambda}}{t/\\lambda} - e^{-t/\\lambda} \\right)$$")
    lines.append("Where:")
    lines.append("- $\\beta_0$ represents the long-term asymptotic rate level.")
    lines.append("- $\\beta_1$ represents the short-term slope / spread component.")
    lines.append("- $\\beta_2$ represents the medium-term hump / curvature component.")
    lines.append("- $\\lambda$ represents the decay rate / scale parameter determining the maturity location of the curvature peak.")
    lines.append("")
    lines.append("Parameters are calibrated via non-linear least squares minimization against observed benchmark Treasury yields.")
    lines.append("")
    lines.append("### 2.5 Credit Spread Conventions: G-Spread vs. Z-Spread")
    lines.append("- **G-Spread (Government Spread)**: The direct difference between the corporate bond's YTM and the linearly interpolated Treasury benchmark yield of matched maturity:")
    lines.append("$$G = y_{\\text{bond}} - y_{\\text{benchmark}}(T)$$")
    lines.append("- **Z-Spread (Zero-Volatility Spread)**: The constant spread that, when added to each spot rate on the benchmark zero curve, equates the discounted bond cash flows to the observed dirty price:")
    lines.append("$$P_{\\text{dirty}} = \\sum_{i=1}^{N} \\frac{CF_i}{\\left(1 + \\frac{r(t_i) + Z}{f}\\right)^{f \\cdot t_i}}$$")
    lines.append("")
    lines.append("### 2.6 Multi-Attribute Peer Selection: Gower Distance Metric")
    lines.append("To find peer bonds across mixed quantitative and categorical dimensions, BondLens computes the Gower distance $S_{ij} \\in [0, 1]$ between target bond $i$ and candidate bond $j$:")
    lines.append("$$D(i, j) = \\frac{\\sum_{k=1}^{K} w_k \\cdot \\delta_{ijk} \\cdot d_k(x_{ik}, x_{jk})}{\\sum_{k=1}^{K} w_k \\cdot \\delta_{ijk}}$$")
    lines.append("Where for quantitative features (Duration, Liquidity):")
    lines.append("$$d_k(x_{ik}, x_{jk}) = \\frac{|x_{ik} - x_{jk}|}{R_k} \\quad (R_k = \\text{Feature Range})$$")
    lines.append("and for categorical features (Sector, Rating Notch):")
    lines.append("$$d_{\\text{sector}}(i, j) = 0 \\text{ if identical else } 1; \\quad d_{\\text{rating}}(i, j) = \\frac{|\\text{Notch}_i - \\text{Notch}_j|}{\\text{Max Notch Diff}}$$")
    lines.append("")
    lines.append("### 2.7 Huber Robust Fair-Value Regression")
    lines.append("To prevent bond market distress outliers from pulling the fair value curve, BondLens solves an M-estimator minimizing the Huber loss function:")
    lines.append("$$\\min_{\\boldsymbol{\\beta}} \\sum_{i=1}^{M} \\rho_\\delta \\left( y_i - \\mathbf{x}_i^T \\boldsymbol{\\beta} \\right)$$")
    lines.append("Where the Huber loss function is defined as:")
    lines.append("$$\\rho_\\delta(r) = \\begin{cases} \\frac{1}{2} r^2 & \\text{for } |r| \\le \\delta \\\\ \\delta (|r| - \\frac{1}{2} \\delta) & \\text{for } |r| > \\delta \\end{cases}$$")
    lines.append("With tuning parameter $\\delta = 1.345 \\cdot \\hat{\\sigma}$, achieving 95% asymptotic efficiency on Gaussian residuals while completely bounding the influence of fat-tail credit spread dislocations.")
    lines.append("")
    lines.append("### 2.8 Relative-Value Score & Studentized Residuals")
    lines.append("The Raw Relative Value Gap is the difference between observed spread and model fair spread:")
    lines.append("$$\\text{RV Gap}_i = G_i - \\hat{G}_i$$")
    lines.append("The Studentized Z-Score normalizes the residual by its local standard error taking into account regression leverage $h_{ii}$:")
    lines.append("$$z_i = \\frac{e_i}{\\hat{\\sigma} \\sqrt{1 - h_{ii}}}$$")
    lines.append("The composite **Relative Value Score ($0 - 100$)** synthesizes:")
    lines.append("$$\\text{RV Score}_i = w_z \\cdot \\Phi(z_i) + w_{\\text{peer}} \\cdot S_{\\text{peer}} + w_{\\text{liq}} \\cdot \\text{Liq}_i + w_{\\text{carry}} \\cdot \\text{Carry}_i$$")
    lines.append("")
    lines.append("### 2.9 Ornstein-Uhlenbeck Mean-Reverting Backtest Process")
    lines.append("In the walk-forward simulation, residual spread dislocations $x(t) = G(t) - \\hat{G}(t)$ evolve according to the continuous stochastic differential equation:")
    lines.append("$$dx(t) = \\theta (\\mu - x(t)) dt + \\sigma dW(t)$$")
    lines.append("Where $\\theta$ represents the calibrated mean-reversion speed (half-life $\\tau = \\ln(2)/\\theta \\approx 45$ days), $\\mu = 0$ is the equilibrium fair-value line, and transaction slippage deducts the full observed bid-ask spread upon entry and exit.")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Source Code Sections
    current_cat = None
    for item in FILE_MANIFEST:
        if item["category"] != current_cat:
            current_cat = item["category"]
            lines.append(f"## 3. {current_cat}")
            lines.append("")
        
        file_path = os.path.join(ROOT_DIR, item["path"])
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
            
        line_count = len(content.splitlines())
        byte_count = len(content.encode("utf-8"))
        
        lines.append(f"### File: `{item['path']}`")
        lines.append(f"**Description:** {item['summary']}  ")
        lines.append(f"**Metrics:** {line_count:,} lines | {byte_count:,} bytes | Language: `{item['lang']}`  ")
        lines.append("")
        lines.append(f"```{item['lang']}")
        lines.append(content)
        lines.append("```")
        lines.append("")
        lines.append("---")
        lines.append("")
        
    # Append Execution Guide
    lines.append("## 4. Platform Execution, Testing & Extension Manual")
    lines.append("")
    lines.append("### 4.1 Development Environment Setup")
    lines.append("```bash")
    lines.append("# 1. Clone or navigate to the project directory")
    lines.append("cd fixed-income-rv-platform")
    lines.append("")
    lines.append("# 2. Activate Python virtual environment and install backend dependencies")
    lines.append("source .venv/bin/activate")
    lines.append("pip install -r requirements.txt # (fastapi, uvicorn, scipy, scikit-learn, numpy, pandas, pytest)")
    lines.append("")
    lines.append("# 3. Install frontend Node modules")
    lines.append("cd frontend")
    lines.append("npm install")
    lines.append("cd ..")
    lines.append("```")
    lines.append("")
    lines.append("### 4.2 Starting the Platform")
    lines.append("```bash")
    lines.append("# Start Backend FastAPI Service (Runs on http://127.0.0.1:8000)")
    lines.append("PYTHONPATH=backend .venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload")
    lines.append("")
    lines.append("# In a separate terminal, start the Frontend Workstation (Runs on http://127.0.0.1:5174)")
    lines.append("cd frontend")
    lines.append("npm run dev")
    lines.append("```")
    lines.append("")
    lines.append("### 4.3 Running Automated Mathematical Tests")
    lines.append("```bash")
    lines.append("PYTHONPATH=backend .venv/bin/pytest backend/tests/ -v")
    lines.append("```")
    lines.append("")
    
    full_markdown = "\n".join(lines)
    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(full_markdown)
        
    print(f"[✓] Master Markdown written to {OUTPUT_MD} ({len(full_markdown):,} characters, {len(lines):,} lines)")
    return full_markdown

def convert_to_docx():
    print(f"[*] Converting Markdown to Microsoft Word (DOCX) via Pandoc...")
    cmd = [
        "/opt/anaconda3/bin/pandoc",
        OUTPUT_MD,
        "-f", "markdown",
        "-t", "docx",
        "--toc",
        "--toc-depth=3",
        "-o", OUTPUT_DOCX
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        size = os.path.getsize(OUTPUT_DOCX)
        print(f"[✓] DOCX generated successfully: {OUTPUT_DOCX} ({size:,} bytes)")
    else:
        print(f"[!] Pandoc error: {res.stderr}")

def generate_pdf_reportlab():
    print(f"[*] Generating PDF via ReportLab...")
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Preformatted, PageBreak, Table, TableStyle, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfgen import canvas

    class NumberedCanvas(canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            num_pages = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self.draw_page_decorations(num_pages)
                super().showPage()
            super().save()

        def draw_page_decorations(self, page_count):
            if self._pageNumber == 1:
                return  # Skip cover page
            self.saveState()
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#475569"))
            
            # Header
            self.drawString(54, 750, "BondLens — Fixed-Income Relative-Value & Mispricing Intelligence Platform")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)
            
            # Footer
            page_str = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(letter[0] - 54, 36, page_str)
            self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — INSTITUTIONAL QUANTITATIVE RESEARCH WORKSTATION")
            self.line(54, 48, letter[0] - 54, 48)
            self.restoreState()

    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F2942'),
        alignment=0,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=25
    )
    
    h1_style = ParagraphStyle(
        'H1Style',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0A192F'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )
    
    code_block_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F8FAFC'),
        borderColor=colors.HexColor('#E2E8F0'),
        borderWidth=0.5,
        borderPadding=5,
        spaceAfter=8
    )

    story = []

    # Cover Page
    story.append(Spacer(1, 40))
    story.append(Paragraph("BondLens", title_style))
    story.append(Paragraph("Fixed-Income Relative-Value & Mispricing Intelligence Platform", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Complete Codebase, Architectural Foundations & Implementation Compendium</b>", ParagraphStyle('SubSub', parent=body_style, fontSize=11, leading=14, textColor=colors.HexColor('#0F2942'))))
    story.append(Spacer(1, 15))
    
    cover_meta = [
        [Paragraph("<b>Date:</b>", body_style), Paragraph(datetime.now().strftime("%B %d, %Y"), body_style)],
        [Paragraph("<b>Version:</b>", body_style), Paragraph("Release 1.2 (Institutional Edition)", body_style)],
        [Paragraph("<b>Scope:</b>", body_style), Paragraph("Full Analytical Engine, Pricing Mathematics, Econometric Models, APIs, and UI", body_style)],
        [Paragraph("<b>Total Files:</b>", body_style), Paragraph(f"{len(FILE_MANIFEST)} Core Architecture & Implementation Modules", body_style)],
        [Paragraph("<b>Architecture:</b>", body_style), Paragraph("Python 3.12 (FastAPI / SciPy / NumPy / Scikit-Learn) + React 19 (TypeScript / Plotly.js / TailwindCSS)", body_style)]
    ]
    t = Table(cover_meta, colWidths=[90, 414])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 25))
    
    story.append(Paragraph("<b>Table of Core Implementation Modules</b>", h2_style))
    manifest_rows = [
        [Paragraph("<b>Module Path</b>", body_style), Paragraph("<b>Category</b>", body_style), Paragraph("<b>Lines</b>", body_style)]
    ]
    for item in FILE_MANIFEST:
        fp = os.path.join(ROOT_DIR, item["path"])
        if os.path.exists(fp):
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                lc = len(f.readlines())
            manifest_rows.append([
                Paragraph(f"<code>{item['path']}</code>", ParagraphStyle('CodeSm', parent=body_style, fontSize=7.5, leading=9)),
                Paragraph(item["category"], ParagraphStyle('CatSm', parent=body_style, fontSize=7.5, leading=9)),
                Paragraph(f"{lc:,}", ParagraphStyle('LCSm', parent=body_style, fontSize=7.5, leading=9, alignment=2))
            ])
            
    mt = Table(manifest_rows, colWidths=[240, 214, 50])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F2942')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(mt)
    story.append(PageBreak())

    # Code and Module Sections
    story.append(Paragraph("Analytical Architecture & Mathematical Overview", h1_style))
    story.append(Paragraph(
        "BondLens provides institutional-grade fixed-income research infrastructure. "
        "The analytical stack comprises Nelson-Siegel benchmark curve bootstrapping, G-spread and zero-volatility Z-spread calculation, "
        "high-precision Newton-Raphson cash flow discount solvers, multi-factor Huber Robust Regression fair-value estimation, "
        "Gower metric peer clustering, multi-factor attribution waterfalls, and Ornstein-Uhlenbeck walk-forward backtesting.",
        body_style
    ))
    story.append(Spacer(1, 10))

    for item in FILE_MANIFEST:
        fp = os.path.join(ROOT_DIR, item["path"])
        if not os.path.exists(fp):
            continue
        with open(fp, "r", encoding="utf-8", errors="replace") as f:
            code = f.read()
            
        lc = len(code.splitlines())
        sz = len(code.encode("utf-8"))
        
        story.append(Paragraph(f"Module: {item['path']}", h2_style))
        story.append(Paragraph(f"<b>Category:</b> {item['category']} | <b>Size:</b> {lc:,} lines ({sz:,} bytes) | <b>Syntax:</b> {item['lang']}", body_style))
        story.append(Paragraph(f"<b>Overview:</b> {item['summary']}", body_style))
        story.append(Spacer(1, 4))
        
        # Split large code files into chunks of 120 lines to avoid ReportLab table overflow
        code_lines = code.splitlines()
        chunk_size = 120
        for i in range(0, len(code_lines), chunk_size):
            chunk = "\n".join(code_lines[i:i+chunk_size])
            # Escape HTML tags for reportlab
            safe_chunk = chunk.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Preformatted(safe_chunk, code_block_style))
            
        story.append(Spacer(1, 8))

    doc.build(story, canvasmaker=NumberedCanvas)
    size = os.path.getsize(OUTPUT_PDF)
    print(f"[✓] PDF generated successfully: {OUTPUT_PDF} ({size:,} bytes)")

def main():
    print("================================================================================")
    print(" BondLens Complete Codebase Compendium Generator")
    print("================================================================================")
    generate_markdown()
    convert_to_docx()
    generate_pdf_reportlab()
    print("================================================================================")
    print(f"Generated Files:")
    print(f"  1. DOCX: {OUTPUT_DOCX}")
    print(f"  2. PDF:  {OUTPUT_PDF}")
    print(f"  3. MD:   {OUTPUT_MD}")
    print("================================================================================")

if __name__ == "__main__":
    main()
