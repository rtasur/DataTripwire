from app.services import behaviour_analysis_service


def test_normal_behaviour_is_not_anomalous():
    result = behaviour_analysis_service.analyze_ml(
        {
            "requests_per_minute": 8,
            "unique_resources": 4,
            "records_accessed": 35,
            "download_volume_mb": 2,
            "authorization_failures": 0,
            "cross_domain_access": 0,
        }
    )

    assert result["ml"]["is_anomaly"] is False
    assert result["ml"]["model"] == "isolation_forest"
    assert result["baseline_deviation"]["severity"] == "LOW"


def test_extreme_behaviour_is_anomalous():
    result = behaviour_analysis_service.analyze_ml(
        {
            "requests_per_minute": 100,
            "unique_resources": 30,
            "records_accessed": 1000,
            "download_volume_mb": 500,
            "authorization_failures": 10,
            "cross_domain_access": 10,
        }
    )

    assert result["ml"]["is_anomaly"] is True
    assert result["baseline_deviation"]["severity"] in [
        "HIGH",
        "CRITICAL",
    ]


def test_ml_output_is_bounded():
    result = behaviour_analysis_service.analyze_ml(
        {
            "requests_per_minute": 50,
            "unique_resources": 15,
            "records_accessed": 250,
            "download_volume_mb": 50,
            "authorization_failures": 4,
            "cross_domain_access": 3,
        }
    )

    ml_score = result["ml"]["anomaly_score"]
    baseline_score = result["baseline_deviation"]["score"]

    assert 0.0 <= ml_score <= 1.0
    assert 0.0 <= baseline_score <= 1.0
