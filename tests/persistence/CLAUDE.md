# Dev 2 (Nisheeth) owned path

Before changing anything here, read `app/persistence/IMPLEMENTATION_PLAN.md` and follow its section 0 change gate.
Before committing, run `python3 tests/persistence/check_dev2.py audit --base origin/main`; it must print `Result: PASS`, and the plan's progress log (section 9) must be updated in the same commit.
Edit only the paths in plan section 1. Never hand-write DTOs, never put SQL outside `app/persistence`, never commit secrets, weights, raw data or databases.
