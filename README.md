# BondLens — Fixed-Income Relative-Value & Mispricing Intelligence Platform

**BondLens** is an institutional-grade fixed-income quantitative research workstation designed for corporate credit relative-value analysis, multi-factor spread decomposition, peer cluster evaluation, parametric walk-forward backtesting, and scenario stress testing.

---

## Analytical Architecture

- **Yield Curve & G-Spread Engine**: Multi-maturity benchmark yield curve modeling via Nelson-Siegel parametric estimation with exact day-count and cash flow projection.
- **Fair-Value Econometric Models**: Huber robust regression, Ridge regression, and Ordinary Least Squares across modified duration, liquidity metrics, rating notches, and sector cohorts.
- **Relative-Value Scoring & Parity Analysis**: Studentized residual z-scores, net realizable spread dislocation post transaction cost/friction deductions, and multi-factor composite RV ranking.
- **Interactive 3D Relative-Value Surface**: Quantitative manifold mapping Duration ($X$), Credit Spread ($Y$), and Relative-Value Score ($Z$) with Huber regression mesh surfaces.
- **Walk-Forward Historical Simulation**: Out-of-sample parametric backtesting with Ornstein-Uhlenbeck stochastic drift mechanics and bid-ask slippage deductions.
- **Data Quality & Feed Integrity Audit**: Automated checks for missing/stale quotes, inverted duration boundaries, crossed bid-ask quotes, and 3.0 IQR statistical outliers.
- **Model Validation & Provenance Trail**: Complete epistemic classification (Observed, Calculated, Model Estimate, Assumption) and mathematical audit traceability for every displayed financial metric.

---

## Directory Structure

```
fixed-income-rv-platform/
├── backend/
│   ├── analytics/        # Analytical helpers and provenance engine
│   ├── api/              # FastAPI application, routes, and services
│   ├── backtesting/      # Walk-forward simulation and model benchmark engines
│   ├── curves/           # Nelson-Siegel and benchmark yield curve models
│   ├── data/             # Canonical credit dataset and validation schemas
│   ├── fixed_income/     # Cash flow generation, YTM solver, duration & convexity
│   ├── peer_group/       # Gower similarity metric and nearest-neighbor clustering
│   ├── relative_value/   # Dislocation scoring, ranking, and analyst case study
│   ├── risk/             # Rate and credit spread stress testing
│   ├── tests/            # Pytest test suite
│   └── valuation/        # Huber, Ridge, and OLS fair value regressors
├── frontend/
│   ├── src/
│   │   ├── components/   # React research workstation views & modals
│   │   ├── services/     # Typed API clients
│   │   └── types/        # TypeScript analytical data definitions
│   └── index.html        # Main HTML entrypoint
└── README.md
```

---

## Running the Platform

### Backend Service
```bash
cd backend
PYTHONPATH=. uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Workstation
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
PYTHONPATH=backend pytest backend/tests/
```
