"""Decide which Pokémon pipeline statements to create or update.

The planner never deletes. Statements it owns are identified by a description
prefix so an apply step cannot touch rules that were authored in the console.
"""

from __future__ import annotations

PREFIX = "pokemon-challenge:"


class PlanError(ValueError):
    pass


def validate_wanted(statements: list[dict]) -> None:
    descriptions: list[str] = []
    for statement in statements:
        description = statement.get("description") or ""
        if not description.startswith(PREFIX):
            raise PlanError(f"description must start with {PREFIX!r}: {description!r}")
        if not statement.get("feature") or not statement.get("definition"):
            raise PlanError(f"feature and definition are required: {description}")
        parent = statement.get("parentDescription")
        descriptions.append(description)
        if parent is not None and not isinstance(parent, str):
            raise PlanError(f"parentDescription must be a string: {description}")
    if len(descriptions) != len(set(descriptions)):
        raise PlanError("descriptions must be unique")
    known = set(descriptions)
    for statement in statements:
        parent = statement.get("parentDescription")
        if parent and parent not in known:
            raise PlanError(f"unknown parent {parent!r} for {statement['description']}")


def plan(existing: list[dict], wanted: list[dict]) -> list[dict]:
    """Return create, update, and keep actions. There is no delete action."""
    validate_wanted(wanted)
    owned = {
        item.get("description"): item
        for item in existing
        if (item.get("description") or "").startswith(PREFIX)
    }
    ordered = sorted(wanted, key=lambda statement: 0 if statement.get("feature") == "when" else 1)
    actions: list[dict] = []
    for statement in ordered:
        current = owned.get(statement["description"])
        if current is None:
            actions.append({"action": "create", **statement})
            continue
        same = (
            current.get("definition") == statement["definition"]
            and current.get("feature") == statement["feature"]
            and _parent_description(current, owned) == statement.get("parentDescription")
        )
        if same:
            actions.append(
                {
                    "action": "keep",
                    "id": current.get("id"),
                    "feature": statement["feature"],
                    "description": statement["description"],
                }
            )
        else:
            actions.append({"action": "update", "id": current.get("id"), **statement})
    if any(action["action"] == "delete" for action in actions):
        raise PlanError("refusing to plan a delete")
    return actions


def _parent_description(current: dict, owned: dict[str, dict]) -> str | None:
    parent_id = current.get("parent")
    if not parent_id:
        return None
    for description, item in owned.items():
        if item.get("id") == parent_id:
            return description
    return str(parent_id)
