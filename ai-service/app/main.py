from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.services import behaviour_analysis_service


app = FastAPI(
    title="DataTripwire AI Service",
    description=(
        "Behavioural analytics and security intelligence service "
        "for the DataTripwire Zero Trust Engine."
    ),
    version="0.2.0",
)


# ============================================================
# INPUT SCHEMAS
# ============================================================

class DeviceContext(BaseModel):
    is_new: bool = False


class LocationContext(BaseModel):
    is_new: bool = False


class TimeContext(BaseModel):
    is_unusual: bool = False


class ActivityContext(BaseModel):
    requests_per_minute: float = Field(default=0, ge=0)
    unique_resources: int = Field(default=0, ge=0)
    records_accessed: int = Field(default=0, ge=0)
    download_volume_mb: float = Field(default=0, ge=0)
    authorization_failures: int = Field(default=0, ge=0)
    cross_domain_access: int = Field(default=0, ge=0)


class SecurityContext(BaseModel):
    task_match: bool = True
    responsibility_match: bool = True
    sensitive_resource: bool = False
    deception_interaction: bool = False


class AnalyzeRequest(BaseModel):
    user_id: str
    session_id: str

    device: DeviceContext = DeviceContext()
    location: LocationContext = LocationContext()
    time_context: TimeContext = TimeContext()

    activity: ActivityContext = ActivityContext()
    context: SecurityContext = SecurityContext()


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "service": "ai-service",
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# BEHAVIOURAL ANALYSIS
# ============================================================
def analyze_behaviour(data: AnalyzeRequest):
    signals = []
    score_components = []

    # --------------------------------------------------------
    # Behavioural deviations
    # --------------------------------------------------------

    if data.device.is_new:
        signals.append("new_device")
        score_components.append(0.10)

    if data.location.is_new:
        signals.append("new_location")
        score_components.append(0.08)

    if data.time_context.is_unusual:
        signals.append("unusual_time")
        score_components.append(0.08)

    # --------------------------------------------------------
    # Activity anomalies
    # --------------------------------------------------------

    if data.activity.requests_per_minute >= 60:
        signals.append("high_request_volume")
        score_components.append(0.18)
    elif data.activity.requests_per_minute >= 30:
        signals.append("elevated_request_volume")
        score_components.append(0.10)

    if data.activity.authorization_failures >= 5:
        signals.append("authorization_failures")
        score_components.append(0.15)
    elif data.activity.authorization_failures >= 2:
        signals.append("elevated_authorization_failures")
        score_components.append(0.08)

    if data.activity.cross_domain_access >= 3:
        signals.append("cross_domain_access")
        score_components.append(0.15)

    if data.activity.unique_resources >= 15:
        signals.append("resource_enumeration")
        score_components.append(0.15)

    if data.activity.download_volume_mb >= 100:
        signals.append("high_download_volume")
        score_components.append(0.12)

    # --------------------------------------------------------
    # Responsibility / task context
    # --------------------------------------------------------

    if not data.context.task_match:
        signals.append("task_mismatch")
        score_components.append(0.12)

    if not data.context.responsibility_match:
        signals.append("responsibility_mismatch")
        score_components.append(0.15)

    if data.context.sensitive_resource:
        signals.append("sensitive_resource_access")
        score_components.append(0.10)

    # --------------------------------------------------------
    # Deception signal
    # --------------------------------------------------------

    if data.context.deception_interaction:
        signals.append("deception_interaction")
        score_components.append(0.25)

    # --------------------------------------------------------
    # ML FEATURE EXTRACTION
    # --------------------------------------------------------

    ml_features = {
        "requests_per_minute": data.activity.requests_per_minute,
        "unique_resources": data.activity.unique_resources,
        "records_accessed": data.activity.records_accessed,
        "download_volume_mb": data.activity.download_volume_mb,
        "authorization_failures": data.activity.authorization_failures,
        "cross_domain_access": data.activity.cross_domain_access,
    }

    # --------------------------------------------------------
    # ML ANALYSIS
    # --------------------------------------------------------

    ml_analysis = behaviour_analysis_service.analyze_ml(
        ml_features
    )

    # --------------------------------------------------------
    # Aggregate rule-based anomaly score
    # --------------------------------------------------------

    anomaly_score = min(
        1.0,
        sum(score_components),
    )

    # --------------------------------------------------------
    # Risk classification
    # --------------------------------------------------------

    if anomaly_score >= 0.85:
        risk_level = "CRITICAL"
        recommendation = "QUARANTINE"

    elif anomaly_score >= 0.70:
        risk_level = "HIGH"
        recommendation = "RESTRICT"

    elif anomaly_score >= 0.50:
        risk_level = "MEDIUM"
        recommendation = "VERIFY"

    elif anomaly_score >= 0.30:
        risk_level = "LOW-MEDIUM"
        recommendation = "MONITOR"

    else:
        risk_level = "LOW"
        recommendation = "ALLOW"

    # --------------------------------------------------------
    # Explainability
    # --------------------------------------------------------

    if not signals:
        explanation = (
            "Current activity is consistent with the expected "
            "behavioural pattern."
        )
    else:
        explanation = (
            "The session shows behavioural deviations involving: "
            + ", ".join(signals)
            + "."
        )

    # Confidence is intentionally simple for the MVP.
    confidence = min(
        0.99,
        0.70 + (len(signals) * 0.04),
    )

    return {
        "risk_level": risk_level,
        "anomaly_score": round(anomaly_score, 4),
        "confidence": round(confidence, 2),

        "ml": ml_analysis["ml"],

        "baseline_deviation": (
            ml_analysis["baseline_deviation"]
        ),

        "signals": signals,
        "explanation": explanation,
        "recommendation": recommendation,
    }

# ============================================================
# MAIN AI ANALYSIS ENDPOINT
# ============================================================

@app.post("/api/v1/analyze")
def analyze(data: AnalyzeRequest):
    result = analyze_behaviour(data)

    return {
        "user_id": data.user_id,
        "session_id": data.session_id,
        "analysis": result,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# LEGACY / PROTOTYPE ENDPOINT
# ============================================================

class FeatureVector(BaseModel):
    requests_per_minute: float = 0
    unique_resources: int = 0
    records_returned: int = 0
    download_volume_mb: float = 0
    authorization_failures: int = 0
    cross_domain_access_count: int = 0
    resource_switch_rate: float = 0


@app.post("/v1/anomaly-score")
def anomaly_score(features: FeatureVector):
    """
    Legacy prototype endpoint.

    This endpoint is retained temporarily for compatibility.
    It is not authoritative and must not be treated as
    attacker attribution.
    """

    signal = min(
        1.0,
        (
            (features.requests_per_minute / 120.0)
            + (features.authorization_failures / 20.0)
            + (features.cross_domain_access_count / 10.0)
        ) / 3.0,
    )

    return {
        "anomaly_score": round(signal, 4),
        "interpretation": "prototype anomaly signal only",
    }