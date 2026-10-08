import random


def generate_normal_behaviour_samples(
    count: int = 500,
    seed: int = 42,
):
    """
    Generate synthetic behavioural telemetry representing
    expected employee activity.

    This is demo/training data for the MVP.
    It must eventually be replaced or supplemented with
    real backend telemetry.
    """

    random.seed(seed)

    samples = []

    for _ in range(count):
        requests_per_minute = max(
            1,
            random.gauss(8, 2),
        )

        unique_resources = max(
            1,
            int(random.gauss(4, 1.2)),
        )

        records_accessed = max(
            1,
            int(random.gauss(35, 10)),
        )

        download_volume_mb = max(
            0,
            random.gauss(2.5, 1),
        )

        authorization_failures = random.choices(
            [0, 1],
            weights=[0.95, 0.05],
        )[0]

        cross_domain_access = 0

        samples.append(
            {
                "requests_per_minute": requests_per_minute,
                "unique_resources": unique_resources,
                "records_accessed": records_accessed,
                "download_volume_mb": download_volume_mb,
                "authorization_failures": authorization_failures,
                "cross_domain_access": cross_domain_access,
            }
        )

    return samples


NORMAL_BEHAVIOUR_SAMPLES = generate_normal_behaviour_samples()