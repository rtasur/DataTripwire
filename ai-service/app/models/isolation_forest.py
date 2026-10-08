from __future__ import annotations

from typing import List

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class BehaviourAnomalyDetector:
    """
    Isolation Forest behavioural anomaly detector.

    Produces an ML intelligence signal only.
    It does not enforce authentication, authorization,
    quarantine, restriction, or other security policies.
    """

    FEATURE_NAMES = [
        "requests_per_minute",
        "unique_resources",
        "records_accessed",
        "download_volume_mb",
        "authorization_failures",
        "cross_domain_access",
    ]

    def __init__(
        self,
        contamination: float = 0.05,
        random_state: int = 42,
    ):
        self.model = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "isolation_forest",
                    IsolationForest(
                        n_estimators=300,
                        contamination=contamination,
                        random_state=random_state,
                    ),
                ),
            ]
        )

        self.is_fitted = False
        self.normal_mean = None
        self.normal_std = None

    def _to_vector(self, features: dict) -> List[float]:
        return [
            float(features.get("requests_per_minute", 0)),
            float(features.get("unique_resources", 0)),
            float(features.get("records_accessed", 0)),
            float(features.get("download_volume_mb", 0)),
            float(features.get("authorization_failures", 0)),
            float(features.get("cross_domain_access", 0)),
        ]

    def fit(self, normal_samples: List[dict]) -> None:
        if not normal_samples:
            raise ValueError(
                "At least one normal sample is required."
            )

        matrix = np.array(
            [
                self._to_vector(sample)
                for sample in normal_samples
            ],
            dtype=float,
        )

        self.model.fit(matrix)

        # Learn the distribution of Isolation Forest scores
        # produced by known-normal behaviour.
        normal_scores = self.model.decision_function(matrix)

        self.normal_mean = float(np.mean(normal_scores))
        self.normal_std = float(np.std(normal_scores))

        # Prevent division by zero if the training distribution
        # happens to have almost no variance.
        if self.normal_std < 1e-6:
            self.normal_std = 1e-6

        self.is_fitted = True

    def predict(self, features: dict) -> dict:
        if not self.is_fitted:
            raise RuntimeError(
                "Anomaly detector must be fitted before prediction."
            )

        vector = np.array(
            [self._to_vector(features)],
            dtype=float,
        )

        raw_score = float(
            self.model.decision_function(vector)[0]
        )

        prediction = int(
            self.model.predict(vector)[0]
        )

        # Isolation Forest gives lower decision_function values
        # to more anomalous observations.
        #
        # Calculate how many standard deviations the current
        # observation is below the normal score distribution.
        deviation = (
            self.normal_mean - raw_score
        ) / self.normal_std

        # Convert the deviation into a smooth 0-1 score.
        # A normal observation stays near the lower part of the
        # range, while increasingly unusual observations approach 1.
        anomaly_score = 1.0 - np.exp(
            -max(0.0, deviation) / 2.0
        )

        anomaly_score = float(
            np.clip(anomaly_score, 0.0, 1.0)
        )

        if anomaly_score >= 0.85:
            severity = "CRITICAL"
        elif anomaly_score >= 0.65:
            severity = "HIGH"
        elif anomaly_score >= 0.40:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        return {
            "anomaly_score": round(
                anomaly_score,
                4,
            ),
            "is_anomaly": prediction == -1,
            "severity": severity,
            "model": "isolation_forest",
        }