import os
from datetime import datetime, timezone
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="DataTripwire AI Service", version="0.1.0")

class FeatureVector(BaseModel):
    requests_per_minute: float = 0
    unique_resources: int = 0
    records_returned: int = 0
    download_volume_mb: float = 0
    authorization_failures: int = 0
    cross_domain_access_count: int = 0
    resource_switch_rate: float = 0

@app.get('/health')
def health():
    return {
        'service': 'ai-service',
        'status': 'ok',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }

@app.post('/v1/anomaly-score')
def anomaly_score(features: FeatureVector):
    # Placeholder only: replace with a validated model during implementation.
    # Do not treat this output as attacker attribution.
    signal = min(
        1.0,
        (features.requests_per_minute / 120.0)
        + (features.authorization_failures / 20.0)
        + (features.cross_domain_access_count / 10.0)
    ) / 3.0
    return {
        'anomaly_score': round(signal, 4),
        'interpretation': 'prototype anomaly signal only',
    }
