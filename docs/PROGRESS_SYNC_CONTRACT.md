# Cross-platform progress sync contract

Status: design contract only. This document does not claim that cloud sync is implemented.

## Goals

- Preserve offline-first use on the React web app and native Kotlin Android app.
- Allow a future signed-in user to move progress between both apps without losing local progress.
- Keep topic/place identity stable across app versions.
- Never upload quiz answer text, personal notes, or device identifiers unless a later feature explicitly requires them.

## Canonical identity

A progress item is keyed by `topicId|placeName`, matching the current web and native mastery key. `topicId` and `placeName` are case-sensitive canonical values from the shared topic dataset. Do not key by array index, translated title, or coordinates.

## Version 1 payload

```json
{
  "schemaVersion": 1,
  "datasetVersion": "topics-v1",
  "updatedAt": "2026-11-06T00:00:00.000Z",
  "mastery": {
    "coal_fields|Jharia": 3
  },
  "topicStats": {
    "coal_fields": {
      "answered": 20,
      "correct": 14,
      "best": 90
    }
  },
  "srs": {
    "coal_fields|Jharia": {
      "topicId": "coal_fields",
      "placeName": "Jharia",
      "mastery": 3,
      "intervalDays": 7,
      "lastReviewedAt": 1793923200000,
      "nextReviewAt": 1794528000000,
      "reps": 5,
      "lapses": 1
    }
  },
  "rewards": {
    "xp": 250,
    "streakDays": 2,
    "lastActiveDate": "2026-11-06",
    "badges": {}
  }
}
```

## Field rules

- `schemaVersion` is mandatory. Unknown major versions must be rejected without overwriting local data.
- `datasetVersion` identifies the topic dataset revision; it is not an app version.
- Mastery values are integers clamped to 0..5.
- Topic statistics are non-negative integers; `correct <= answered`; `best` is 0..100.
- SRS timestamps are Unix milliseconds. Validate `nextReviewAt >= 0`, `lastReviewedAt >= 0`, interval/reps/lapses as non-negative integers.
- XP and streak values are non-negative integers. Badge identifiers are stable IDs, not display labels.
- Unknown fields should be ignored for forward compatibility; malformed required fields should fail validation.

## Merge policy

1. Keep local progress usable when signed out or offline.
2. Sync only after authentication and explicit account association.
3. Merge mastery per key using the greater mastery value; a future explicit reset event must be represented separately rather than inferred from a missing key.
4. Merge SRS by the most recent `lastReviewedAt`; if timestamps tie, prefer the record with more repetitions, then more lapses.
5. Merge topic stats additively only when they are represented as event-derived deltas. Until an event log exists, use the record with the later `updatedAt` to avoid double-counting snapshots.
6. Merge XP additively only from unique quiz/session event IDs. Snapshot-only XP must use last-writer-wins until event IDs are implemented.
7. Badge unlocks are monotonic: once unlocked, retain the unlock and earliest valid `unlockedAt`.
8. A cloud response must never silently erase local progress. Keep a pre-merge local backup and expose a recoverable conflict state.

## Security and privacy requirements

- Do not store service-role keys or privileged backend secrets in either client.
- Enforce row-level access so an authenticated user can read/write only their own progress.
- Validate payload shape and numeric bounds on the server as well as the clients.
- Do not treat a client-supplied XP value as authoritative for a public leaderboard or rewards with monetary value.
- Provide account deletion and progress export/delete behavior before public cloud sync launch.

## Implementation sequence

1. Add a shared versioned progress model and validation tests to both clients.
2. Add import/export backup so users can protect progress before cloud sync exists.
3. Add authenticated cloud storage with row-level security and migration support.
4. Add retryable background sync, conflict visibility, and cross-device integration tests.
5. Only then enable cross-platform sync in the UI.

## Current implementation gap

The React app currently stores mastery, topic stats, SRS and rewards in separate localStorage keys. The Kotlin app stores related values in SharedPreferences. They are not yet synchronized, and their SRS/reward algorithms are not identical. This contract is a target for a future migration, not a description of current behavior.
