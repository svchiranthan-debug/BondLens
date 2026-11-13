"""
FastAPI Server Entrypoint.
Sets up CORS, error handling, startup initialization, and routing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router

app = FastAPI(
    title="BondLens — Fixed-Income Relative-Value & Mispricing Intelligence Platform API",
    description="Production-grade institutional fixed income relative value analytics, peer selection, curve fitting, and risk stress-testing engine.",
    version="1.0.0"
)

# Allow CORS for local Vite dev server and institutional web portals
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "service": "BondLens API",
        "status": "ok",
        "version": "1.2"
    }


@app.get("/health")
def health():
    return {"status": "HEALTHY", "service": "BondLens"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
