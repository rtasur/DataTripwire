# Security QA Scenarios

Use only synthetic/local demo data and authorized test systems.

## Scenario 01 — Normal employee workflow

Login → open assigned task → access expected resource → no alert.

## Scenario 02 — Enumeration

Generate a controlled series of resource lookups and verify telemetry is captured.

## Scenario 03 — Responsibility mismatch

Employee assigned to Vendor Reconciliation attempts to access an unrelated sensitive domain.

## Scenario 04 — Decoy interaction

Suspicious reconnaissance reaches an approved synthetic decoy and produces a security event.

## Scenario 05 — False-positive path

Legitimate new device/network context triggers verification rather than immediate quarantine.

## Scenario 06 — High-impact operation

Attempt a sensitive export and verify additional transaction authorization is required.
