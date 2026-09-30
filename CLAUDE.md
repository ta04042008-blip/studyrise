CLAUDE.md — StudyRise Development Rules

This repository contains the NEW StudyRise.

0. Highest-priority rule

docs/StudyRise_Spec_v0.11.md is the single source of truth for GAME BEHAVIOR.

Do not import assumptions from:

• old StudyRise
• Chemical Magicarize
• previous HTML builds
• previous assets
• previous stats
• generic RPG conventions

The old project is not a compatibility target.

If this file and the formal spec appear to conflict:

• the formal spec decides game behavior;
• this file decides development process;
• if still ambiguous and gameplay would change, stop that specific decision and flag TODO_SPEC_DECISION.

Do not silently invent gameplay.

────────

1. Never change the game design for implementation convenience

Do NOT independently:

• add commands
• remove features
• change damage rules
• change reward rules
• change progression
• add currencies
• change stage structure
• change question behavior
• change skill/spell semantics
• add “standard RPG” features that are not specified

Implementation details that do not change gameplay may be decided normally.

────────

2. Technology

Use:

• React
• TypeScript
• Vite

Do not create the game as one giant HTML file.

Do not bring old StudyRise code into this repository unless explicitly instructed later.

────────

3. Required architectural boundaries

Keep at least these responsibilities separated:

• BattleEngine
• QuestionEngine
• RogueliteEngine
• ProgressionSystem
• SaveSystem

UI must not contain core game calculations.

Bad:

onClick={() => {
  // roll crit
  // calculate damage
  // mutate enemy HP
  // grant XP
}}

Good:

UI input
→ engine command
→ deterministic result/state transition
→ UI renders result

────────

4. Skill and Spell are different systems

Never use these terms interchangeably.

Skill

• character/enemy unique passive
• always-on or automatic conditional trigger
• not manually activated
• no MP cost
• not acquired as a roguelite reward

Spell

• active special move
• manually selected to begin a five-question preparation sequence
• does not use MP
• automatically resolves on that character's next action
• may be acquired/upgraded during the current stage run
• extra spells and run upgrades reset after the run

Do not use the old meaning of “skill” for active MP moves.

────────

5. Official stat names

Internal keys:

hp
attack
defense
speed

UI labels:

HP
学力
忍耐力
思考速度

Legacy MP fields may remain only at Save-compatibility boundaries while migration is in progress; they are not active gameplay stats.

Do not reintroduce old stats such as:

• 集中力
• 自信
• WPM
• 成長率

unless the formal spec is explicitly revised.

────────

6. Battle flow is a state machine

Use an explicit battle phase/state machine.

A suitable shape includes states such as:

COMMAND_SELECT
TARGET_SELECT
SUBJECT_DIFFICULTY_SELECT
QUESTION
COMMAND_ANIMATION
RESULT_APPLY
EXPLANATION
ENEMY_ACTION
ZONE_CLEAR
REWARD
BATTLE_END

Do not model core battle flow as a fragile pile of unrelated booleans.

For problem commands, preserve this order:

command
→ target
→ subject + difficulty
→ question
→ answer
→ command animation
→ battle result application
→ correctness result
→ explanation
→ next

Do not reorder this without a spec change.

────────

7. Data-driven content

Normal content additions should primarily be data changes.

Characters, enemies, skills, spells, equipment, items, stages, zones and questions should be data-driven.

Avoid long chains like:

if (character.id === "a") ...
else if (character.id === "b") ...
else if (character.id === "c") ...

Custom code is allowed only for genuinely exceptional mechanics.

If adding ordinary content requires editing BattleEngine, treat that as an architecture smell.

────────

8. Reusable Effect system

Prefer composable effects instead of one-off spell implementations.

Examples:

DAMAGE
HEAL
BUFF
DEBUFF
STATUS
MP_GAIN
MP_LOSS
SPEED_MODIFY
GUARD
ACTION_ADVANCE

Spells, skills, items and roguelite rewards should reuse shared effect primitives where practical.

────────

9. UI and game logic must be separated

React components:

• display state
• collect user input
• request game actions
• play presentation/animation

Engines/systems:

• validate actions
• calculate results
• mutate/return game state
• determine battle outcomes

Do not calculate core combat values inside view components.

────────

10. Randomness must be centralized

Do not scatter uncontrolled Math.random() calls across components and systems.

Use a central random abstraction/service so that:

• tests can seed randomness
• bugs can be reproduced
• save/load cannot reroll already-confirmed outcomes

Random systems include:

• damage variance
• critical
• guard great success
• enemy AI
• question selection
• reward rarity
• reward generation

────────

11. Constants belong in configuration

Do not scatter magic numbers such as:

damage *= 1.5;

Centralize balance settings in configuration modules, for example:

battleConfig
rewardConfig
progressionConfig

The spec explicitly identifies several values as tuning defaults. Keep them configurable.

────────

12. Save design

Separate:

• permanent account/progression state
• active stage-run state

All save data must include:

saveVersion

Design migrations for future schema changes.

Do not break existing saves just because a type changed.

Important confirmed outcomes must be persisted so app restart cannot reroll:

• submitted answer
• resolved battle action
• generated reward choices
• selected reward

────────

13. Input idempotency

Prevent double execution caused by repeated taps.

Protect at minimum:

• answer submit
• spell use
• item use
• reward selection
• reroll
• next/continue

Once a transaction starts, disable or reject duplicates until the state transition is committed.

────────

14. Validate content data

Never assume content JSON is valid.

Validate questions and content at load/build time.

Question validation should catch, at minimum:

• missing text
• invalid difficulty
• invalid type
• missing correct answer
• invalid/duplicate choices where relevant
• broken material references
• unsupported image format
• invalid material count

Bad content should be excluded or surfaced as a development error, not crash the entire game.

────────

15. Stable IDs

Use immutable IDs for saved references.

Display names may change; IDs should not.

Applies to:

• characters
• enemies
• skills
• spells
• equipment
• items
• areas
• stages
• zones
• questions

Do not use Japanese display names as persistence keys.

────────

16. Responsive design from the beginning

Support:

• smartphones
• iPad landscape

Do not build two unrelated versions of the UI.
Reuse components and adapt through responsive layout/breakpoints.

Do not postpone tablet layout until the end.

────────

17. Accessibility baseline

At minimum:

• adequate tap targets
• readable text
• keyboard-operable standard controls where applicable
• do not communicate rarity/state by color alone
• preserve text/icon indicators for special tendencies

────────

18. Developer tools

During development, provide a development-only panel or equivalent tools for testing.

Useful controls may include:

• set HP
• choose enemy
• jump to zone
• force a question result
• generate reward
• set level
• grant a spell

Do not ship development controls in production builds.

────────

19. Error isolation

A single bad content asset should not make the game unusable.

Examples:

• broken image → safe fallback
• invalid question → exclude it and report error
• missing optional art → placeholder/fallback

Avoid “one bad record = app will not start”.

────────

20. Testing priorities

Core logic tests are mandatory.

Prioritize:

1. action timeline
2. damage
3. guard
4. spell preparation/auto-resolution
5. spell validation/resolution
6. skill triggers
7. KO
8. statuses/buffs/debuffs
9. Search
10. roguelite rewards
11. question selection
12. save/load restoration

UI polish does not substitute for logic tests.

────────

21. Development workflow

MVP-1 through MVP-10 are complete.

The current project is in the post-MVP expansion and polish phase.

For each new task:

• read the latest formal spec (docs/StudyRise_Spec_v0.11.md)
• inspect the current implementation
• state the bounded target
• identify affected systems and save-schema impact
• identify files to change
• identify tests to add/update
• avoid implementing unrelated future features

The completed MVP sequence remains historical context:

1. MVP-1 — minimal 1 player vs 1 enemy battle
2. MVP-2 — all six commands
3. MVP-3 — 3-player party and multiple enemies
4. MVP-4 — roguelite rewards
5. MVP-5 — multi-zone stage and boss
6. MVP-6 — base
7. MVP-7 — permanent progression
8. MVP-8 — learning history
9. MVP-9 — save/resume
10. MVP-10 — formal content expansion

Do not regress completed MVP behavior while working on post-MVP features.

────────

22. Protect working behavior

Before a meaningful change:

• identify affected systems
• identify save-schema impact
• identify tests affected

After the change:

• run existing tests
• add tests for the new behavior
• run TypeScript checks
• run production build

Do not declare completion until these pass, or clearly report the exact failure.

────────

23. No unsolicited large refactors

Do not perform unrelated repository-wide rewrites while implementing a feature.

If a larger refactor is needed:

• explain why
• scope it separately
• preserve behavior with tests

“Cleaning up” is not permission to rewrite unrelated working code.

────────

24. Temporary data must be explicit

Mark placeholders clearly.

Use identifiers/comments such as:

PLACEHOLDER
TEMP
TODO

Do not let temporary numbers, art, questions or content silently become official data.

────────

25. Completion criteria

Do not say “implemented” merely because code was written.

A task is complete only when relevant:

• code exists
• TypeScript checks pass
• tests pass
• production build passes
• basic interaction flow has been verified
• existing behavior is not knowingly broken

────────

26. End-of-task report

Keep reports concise.

Report:

1. what changed
2. files changed
3. behavior verified
4. tests/checks run
5. remaining TODOs

Do not provide long self-commentary unless requested.

────────

27. Post-MVP boundary

MVP-1 through MVP-10 are complete and must be treated as working baseline behavior.

Post-MVP work should be scoped independently.

Do not use old MVP boundaries to remove or disable completed systems.

Current known post-MVP candidates are governed by the latest formal spec and may include:

• formal visual assets
• story display
• unique character skills
• additional question formats
• later areas/content

Do not implement these merely because they are listed here. Implement only the user-requested, explicitly scoped task.

────────

28. First action in a fresh session

Before editing code:

1. Read this CLAUDE.md.
2. Read docs/StudyRise_Spec_v0.11.md.
3. Inspect the repository.
4. State the current scoped target.
5. Provide a short plan.
6. Only then modify files, unless the user explicitly asked for planning only.

The formal specification is authoritative.