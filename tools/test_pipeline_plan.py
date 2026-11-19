import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline_plan import PlanError, plan


WANTED = [
    {
        "description": "pokemon-challenge: production source only",
        "feature": "filter",
        "definition": '@source=="Pokemon - pokemondb.net"',
    },
    {
        "description": "pokemon-challenge: query mentions fire lizard",
        "feature": "when",
        "definition": 'when $query contains "fire lizard"',
    },
    {
        "description": "pokemon-challenge: feature Charizard for fire lizard",
        "feature": "top",
        "definition": 'featured result `@uri=="https://pokemondb.net/pokedex/charizard"`',
        "parentDescription": "pokemon-challenge: query mentions fire lizard",
    },
]


class PlanTests(unittest.TestCase):
    def test_creates_missing_statements_and_orders_conditions_first(self):
        actions = plan([], WANTED)
        self.assertEqual([action["action"] for action in actions], ["create", "create", "create"])
        self.assertEqual(actions[0]["feature"], "when")
        self.assertNotIn("delete", {action["action"] for action in actions})

    def test_keeps_an_identical_statement(self):
        existing = [
            {
                "id": "rule-1",
                "description": "pokemon-challenge: production source only",
                "feature": "filter",
                "definition": '@source=="Pokemon - pokemondb.net"',
            }
        ]
        actions = plan(existing, WANTED)
        source = next(action for action in actions if action["description"].endswith("source only"))
        self.assertEqual(source["action"], "keep")
        self.assertEqual(source["id"], "rule-1")

    def test_updates_when_the_definition_changes_and_ignores_unrelated_rules(self):
        existing = [
            {
                "id": "rule-1",
                "description": "pokemon-challenge: production source only",
                "feature": "filter",
                "definition": "@source==old",
            },
            {
                "id": "hand-made",
                "description": "console rule",
                "feature": "stop",
                "definition": "stop the",
            },
        ]
        actions = plan(existing, WANTED)
        source = next(action for action in actions if action["description"].endswith("source only"))
        self.assertEqual(source["action"], "update")
        self.assertEqual(source["id"], "rule-1")
        self.assertTrue(all(action["description"].startswith("pokemon-challenge:") for action in actions))

    def test_rejects_a_statement_outside_the_owned_prefix(self):
        with self.assertRaises(PlanError):
            plan([], [{"description": "drop everything", "feature": "filter", "definition": "@uri"}])


if __name__ == "__main__":
    unittest.main()
