from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


NORMAL_PAYLOAD = {
    "user_id": "EMP001",
    "session_id": "TEST-NORMAL",
    "device": {
        "is_new": False
    },
    "location": {
        "is_new": False
    },
    "time_context": {
        "is_unusual": False
    },
    "activity": {
        "requests_per_minute": 8,
        "unique_resources": 4,
        "records_accessed": 35,
        "download_volume_mb": 2,
        "authorization_failures": 0,
        "cross_domain_access": 0
    },
    "context": {
        "task_match": True,
        "responsibility_match": True,
        "sensitive_resource": False,
        "deception_interaction": False
    }
}


SUSPICIOUS_PAYLOAD = {
    "user_id": "EMP001",
    "session_id": "TEST-SUSPICIOUS",
    "device": {
        "is_new": True
    },
    "location": {
        "is_new": True
    },
    "time_context": {
        "is_unusual": True
    },
    "activity": {
        "requests_per_minute": 75,
        "unique_resources": 20,
        "records_accessed": 500,
        "download_volume_mb": 150,
        "authorization_failures": 6,
        "cross_domain_access": 4
    },
    "context": {
        "task_match": False,
        "responsibility_match": False,
        "sensitive_resource": True,
        "deception_interaction": False
    }
}


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_normal_session():
    response = client.post(
        "/api/v1/analyze",
        json=NORMAL_PAYLOAD,
    )

    assert response.status_code == 200

    body = response.json()
    analysis = body["analysis"]

    assert analysis["risk_level"] == "LOW"
    assert analysis["recommendation"] == "ALLOW"

    assert analysis["ml"]["model"] == "isolation_forest"
    assert analysis["ml"]["is_anomaly"] is False

    assert analysis["baseline_deviation"]["severity"] == "LOW"

    assert analysis["signals"] == []


def test_suspicious_session():
    response = client.post(
        "/api/v1/analyze",
        json=SUSPICIOUS_PAYLOAD,
    )

    assert response.status_code == 200

    body = response.json()
    analysis = body["analysis"]

    assert analysis["risk_level"] == "CRITICAL"
    assert analysis["recommendation"] == "QUARANTINE"

    assert analysis["ml"]["is_anomaly"] is True
    assert analysis["ml"]["model"] == "isolation_forest"

    assert analysis["baseline_deviation"]["severity"] == "CRITICAL"

    assert "new_device" in analysis["signals"]
    assert "new_location" in analysis["signals"]
    assert "high_request_volume" in analysis["signals"]
    assert "task_mismatch" in analysis["signals"]
    assert "responsibility_mismatch" in analysis["signals"]


def test_ai_does_not_enforce_action():
    """
    The AI service only returns intelligence/recommendation.
    It does not perform account blocking or quarantine itself.
    """

    response = client.post(
        "/api/v1/analyze",
        json=SUSPICIOUS_PAYLOAD,
    )

    assert response.status_code == 200

    analysis = response.json()["analysis"]

    assert analysis["recommendation"] == "QUARANTINE"

    # The response contains a recommendation, not an enforcement action.
    assert "blocked" not in analysis
    assert "account_disabled" not in analysis
    assert "enforcement_executed" not in analysis


def test_legacy_anomaly_endpoint():
    response = client.post(
        "/v1/anomaly-score",
        json={
            "requests_per_minute": 10,
            "unique_resources": 4,
            "records_returned": 30,
            "download_volume_mb": 2,
            "authorization_failures": 0,
            "cross_domain_access_count": 0,
            "resource_switch_rate": 0
        },
    )

    assert response.status_code == 200
    assert "anomaly_score" in response.json()