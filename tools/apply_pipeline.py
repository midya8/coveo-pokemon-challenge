"""Apply coveo-config/pipeline.json to the Pokemon Search query pipeline.

Idempotent and non-destructive: it creates or updates statements whose
description starts with "pokemon-challenge:" and never deletes anything.
Dry-run is the default. Pass --apply to write, after each change has been
validated by the Platform API.

  python tools/apply_pipeline.py
  COVEO_ADMIN_API_KEY=... python tools/apply_pipeline.py --apply

The admin key is read from the environment and is never printed.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline_plan import plan  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PIPELINE_FILE = ROOT / "coveo-config" / "pipeline.json"
PLATFORM = "https://platform.cloud.coveo.com"
ORG_ID = os.environ.get("COVEO_ORG_ID", "voljzmfhemcvoorg")
PIPELINE_NAME = "Pokemon Search"


def ssl_context() -> ssl.SSLContext:
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, detail: str):
        super().__init__(f"{method} {path} -> HTTP {status}\n{detail[:800]}")
        self.status = status


def api(method: str, path: str, body: object | None = None) -> object:
    key = os.environ.get("COVEO_ADMIN_API_KEY")
    if not key:
        raise ApiError(method, path, 0, "COVEO_ADMIN_API_KEY is not set")
    data = json.dumps(body).encode() if body is not None else None
    separator = "&" if "?" in path else "?"
    url = f"{PLATFORM}{path}{separator}organizationId={ORG_ID}" if "organizationId=" not in path else f"{PLATFORM}{path}"
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "pokemon-challenge-setup/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ssl_context()) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise ApiError(method, path, error.code, detail) from None


def as_list(payload: object, keys: tuple[str, ...]) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in keys:
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def find_pipeline_id() -> str:
    errors: list[str] = []
    for path in (
        "/rest/search/v2/admin/pipelines?perPage=100",
        f"/rest/organizations/{ORG_ID}/pipelines",
    ):
        try:
            payload = api("GET", path)
        except ApiError as error:
            errors.append(str(error).split("\n", 1)[0])
            continue
        for pipeline in as_list(payload, ("pipelines", "items", "results")):
            if pipeline.get("name") == PIPELINE_NAME and pipeline.get("id"):
                return str(pipeline["id"])
    raise SystemExit("could not find pipeline 'Pokemon Search'. " + "; ".join(errors))


def list_statements(pipeline_id: str) -> list[dict]:
    statements: list[dict] = []
    page = 0
    while True:
        payload = api(
            "GET",
            f"/rest/search/v2/admin/pipelines/{pipeline_id}/statements?page={page}&perPage=100",
        )
        batch = as_list(payload, ("statements", "items", "results"))
        statements.extend(batch)
        total_pages = payload.get("totalPages", 1) if isinstance(payload, dict) else 1
        page += 1
        if page >= total_pages or not batch:
            return statements


def model_for(action: dict, ids_by_description: dict[str, str]) -> dict:
    model = {
        "description": action["description"],
        "feature": action["feature"],
        "definition": action["definition"],
    }
    parent = action.get("parentDescription")
    if parent:
        parent_id = ids_by_description.get(parent)
        if not parent_id:
            raise SystemExit(f"missing parent id for {action['description']}")
        model["parent"] = parent_id
    return model


def validate(pipeline_id: str, operation: str, model: dict, resource_id: str | None = None) -> None:
    body = {"operation": {"operationType": operation, "model": model}}
    if resource_id:
        body["operation"]["resourceId"] = resource_id
    result = api("POST", f"/rest/search/v2/admin/pipelines/{pipeline_id}/statements/validate", body)
    if not isinstance(result, dict) or result.get("operationValid") is False:
        raise SystemExit(f"validation failed for {model['description']}: {json.dumps(result)[:800]}")


def apply_actions(pipeline_id: str, actions: list[dict], write: bool) -> int:
    ids = {action["description"]: action["id"] for action in actions if action.get("id")}
    for action in actions:
        verb = action["action"]
        print(f"{verb:6} {action['feature']:10} {action['description']}")
        if verb == "keep" or not write:
            if action.get("id"):
                ids[action["description"]] = action["id"]
            continue
        model = model_for(action, ids)
        if verb == "create":
            validate(pipeline_id, "CREATE", model)
            created = api("POST", f"/rest/search/v2/admin/pipelines/{pipeline_id}/statements", model)
            new_id = created.get("id") if isinstance(created, dict) else None
            if not new_id:
                raise SystemExit(f"create returned no id for {action['description']}")
            ids[action["description"]] = str(new_id)
            print(f"       created {new_id}")
        elif verb == "update":
            validate(pipeline_id, "UPDATE", model, action["id"])
            api("PUT", f"/rest/search/v2/admin/pipelines/{pipeline_id}/statements/{action['id']}", model)
            print(f"       updated {action['id']}")
        else:
            raise SystemExit(f"unexpected action {verb}")
    return 0


def main() -> int:
    write = "--apply" in sys.argv
    wanted = json.loads(PIPELINE_FILE.read_text(encoding="utf-8"))
    if not os.environ.get("COVEO_ADMIN_API_KEY"):
        if write:
            print("COVEO_ADMIN_API_KEY is not set. Nothing was changed.", file=sys.stderr)
            return 1
        actions = plan([], wanted)
        print(f"Dry run without an admin key. {len(actions)} statement(s) in {PIPELINE_FILE.name}:")
        for action in actions:
            print(f"  {action['feature']:10} {action['definition']}")
        print("Re-run with COVEO_ADMIN_API_KEY and --apply to validate and write. No statements are deleted.")
        return 0

    pipeline_id = find_pipeline_id()
    actions = plan(list_statements(pipeline_id), wanted)
    print(f"Pipeline {PIPELINE_NAME} ({pipeline_id}), {'apply' if write else 'dry run'}")
    return apply_actions(pipeline_id, actions, write)


if __name__ == "__main__":
    sys.exit(main())
