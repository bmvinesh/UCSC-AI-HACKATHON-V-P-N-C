"""Cross-field rules from docs/CONTRACTS.md that JSON Schema cannot express, checked on examples.json.

These pin the examples only; they are not the runtime semantic validators. C-numbers refer to
docs/proposals/2026-10-10-boundary-redesign.md.
"""
import json
from pathlib import Path

import pytest

EXAMPLES = json.loads(
    (Path(__file__).resolve().parents[2] / "contracts" / "examples.json").read_text(encoding="utf-8"))
MANIFESTS = {"empirical": EXAMPLES["EmpiricalManifest"], "mechanistic": EXAMPLES["MechanisticManifest"]}
CASES = {EXAMPLES["CaseRecord"]["id"]: EXAMPLES["CaseRecord"]}


def expected_labels(manifest):
    """The DTO-assembly table in CONTRACTS.md "Engine artifacts" (non-cached rows)."""
    if manifest["engine"] == "empirical":
        source = "trained_model" if manifest["trained_on"] == "real" else "synthetic"
        return source, "forecast", "none"
    source = "mechanistic" if manifest["parameter_basis"] == "assumption" else "conditional_calibration"
    return source, "illustrative", "sensitivity"


def curve_errors(request, curves, baseline_cm3, tolerance_cm3):
    errors = []
    if len(curves) != 1:
        errors.append(f"C31: {len(curves)} curves")
    for curve in curves:
        days = [p["day"] for p in curve["points"]]
        if days != list(range(request["horizon_days"] + 1)):
            errors.append(f"C25: days {days} != 0..{request['horizon_days']}")
        for p in curve["points"]:
            lo, hi = p["lower_cm3"], p["upper_cm3"]
            if (lo is None) != (hi is None):
                errors.append(f"unpaired band at day {p['day']}")
            elif lo is not None and not lo <= p["volume_cm3"] <= hi:
                errors.append(f"band out of order at day {p['day']}")
        if curve["points"] and abs(curve["points"][0]["volume_cm3"] - baseline_cm3) > tolerance_cm3:
            errors.append(f"C30: day 0 {curve['points'][0]['volume_cm3']} != baseline {baseline_cm3}")
    return errors


def labelled_curve_errors(manifest, curves):
    _, evidence, band_kind = expected_labels(manifest)
    return [f"curve labels {c['evidence']}/{c['band_kind']} != {evidence}/{band_kind}"
            for c in curves if (c["evidence"], c["band_kind"]) != (evidence, band_kind)]


def test_request_version_matches_its_engine_manifest():
    req = EXAMPLES["ScenarioRequest"]
    assert req["model_version"] == MANIFESTS[req["engine"]]["model_version"]


def test_scenario_result_follows_contract():
    result = EXAMPLES["ScenarioResult"]
    req = result["request"]
    manifest = MANIFESTS[req["engine"]]
    case = CASES[req["case_id"]]
    errors = curve_errors(req, result["curves"], case["baseline_volume_cm3"], manifest["parity_tolerance"])
    errors += labelled_curve_errors(manifest, result["curves"])
    if result["source"] != "cached" and result["source"] != expected_labels(manifest)[0]:
        errors.append(f"source {result['source']} != {expected_labels(manifest)[0]}")
    if (result["source"] == "cached") != (result["origin_source"] is not None):
        errors.append("origin_source must be set exactly when source is cached")
    if not result["model_version"] == req["model_version"] == manifest["model_version"]:
        errors.append("model_version mismatch between result, request and manifest")
    assert errors == []


def test_parity_fixture_follows_contract():
    fixture = EXAMPLES["ParityFixture"]
    manifest = MANIFESTS[fixture["engine"]]
    assert fixture["model_version"] == manifest["model_version"]
    for case in fixture["cases"]:
        req = case["request"]
        errors = curve_errors(req, case["expected_curves"], case["baseline_volume_cm3"], fixture["tolerance_cm3"])
        errors += labelled_curve_errors(manifest, case["expected_curves"])
        if (req["engine"], req["model_version"]) != (fixture["engine"], fixture["model_version"]):
            errors.append("request engine/version differs from the fixture's")
        assert errors == [], case["label"]


def test_ids_link_up():
    result_id = EXAMPLES["ScenarioResult"]["id"]
    assert EXAMPLES["ExplanationResult"]["result_id"] == result_id
    job = EXAMPLES["JobRecord"]
    if job["kind"] == "scenario" and job["state"] == "succeeded":
        assert job["result_id"] == result_id


@pytest.mark.parametrize("engine", ["empirical", "mechanistic"])
def test_release_index_points_at_the_example_manifest_dir(engine):
    entry = EXAMPLES["ReleaseIndex"][f"{engine}_manifest"]
    if entry is None:
        pytest.skip(f"example release has no {engine} engine")
    manifest_dir = entry["path"].rsplit("/", 1)[0]
    assert MANIFESTS[engine]["onnx_path"].startswith(manifest_dir + "/")


def test_a_template_covers_the_example_result():
    source = EXAMPLES["ScenarioResult"]["source"]
    assert any(source in t["when_source"] for t in EXAMPLES["ExplanationTemplates"]["templates"])
