"""Every example validates against its schema; each resolved shape contradiction has a negative case.

C-numbers refer to docs/proposals/2026-10-10-boundary-redesign.md.
"""
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts"
SCHEMA_FILES = ["domain.schema.json", "release-index.schema.json",
                "explanation-templates.schema.json", "parity-fixture.schema.json"]
# Examples that are whole artifact files rather than domain $defs.
ARTIFACT_EXAMPLES = {"ReleaseIndex": "release-index.schema.json",
                     "ExplanationTemplates": "explanation-templates.schema.json",
                     "ParityFixture": "parity-fixture.schema.json"}

SCHEMAS = {name: json.loads((CONTRACTS / name).read_text(encoding="utf-8")) for name in SCHEMA_FILES}
REGISTRY = Registry().with_resources(
    [(s["$id"], Resource.from_contents(s)) for s in SCHEMAS.values()])
EXAMPLES = json.loads((CONTRACTS / "examples.json").read_text(encoding="utf-8"))
DOMAIN_ID = SCHEMAS["domain.schema.json"]["$id"]


def validator_for(example_key):
    if example_key in ARTIFACT_EXAMPLES:
        schema = SCHEMAS[ARTIFACT_EXAMPLES[example_key]]
    else:
        schema = {"$schema": "https://json-schema.org/draft/2020-12/schema",
                  "$ref": f"{DOMAIN_ID}#/$defs/{example_key}"}
    return Draft202012Validator(schema, registry=REGISTRY,
                                format_checker=Draft202012Validator.FORMAT_CHECKER)


def messages(key, instance):
    return [e.message for e in validator_for(key).iter_errors(instance)]


@pytest.mark.parametrize("key", [k for k in EXAMPLES if not k.startswith("_")])
def test_example_is_valid(key):
    assert messages(key, EXAMPLES[key]) == []


def test_every_domain_def_has_an_example():
    defs = set(SCHEMAS["domain.schema.json"]["$defs"])
    # Leaf types are covered through the examples that embed them.
    embedded = {"Problem", "Provenance", "Observation", "CurvePoint", "Curve"}
    assert defs - embedded <= set(EXAMPLES)


NEGATIVE = {
    "C1 packed features input": ("EmpiricalManifest", lambda e: {
        **e, "inputs": [{"name": "features", "shape": ["batch", 2]}]}),
    "C3 empirical band": ("EmpiricalManifest", lambda e: {**e, "band_kind": "sensitivity"}),
    "C6 single model_version": ("Capabilities", lambda e: {**e, "model_version": "v1"}),
    "C7 observed curve": ("ScenarioResult", lambda e: {
        **e, "curves": [{**e["curves"][0], "evidence": "observed"}]}),
    "C25 fractional horizon": ("ScenarioRequest", lambda e: {**e, "horizon_days": 21.5}),
}


@pytest.mark.parametrize("name", NEGATIVE)
def test_resolved_contradiction_is_rejected(name):
    key, mutate = NEGATIVE[name]
    assert messages(key, mutate(EXAMPLES[key])), f"{name} was accepted"
