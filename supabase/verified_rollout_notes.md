# Verified practice and beta activity rollout

## Current contract

The shared native screens use server-issued, current-content-bound sessions for
MCQ, cases, flashcards, daily challenges, Rapid Fire and Barrage. Timed answers
are accepted one at a time against a server deadline. Results, history, streaks,
XP and one immutable receipt commit together before the results screen appears.
Timed MCQ/cases retain their existing 10% multiplier. Rapid Fire retains its
12-second limit and server-computed combo/speed bonus capped at 25. Barrage
retains one payout per user/day/slot. Its window discovery remains the existing
client-side policy; this rollout does not claim server-verified window eligibility
or closed-book/human-attention enforcement.

The existing public serving views remain authoritative. Issuance, opening timed
items, answering timed items and completion all reject unavailable/currently
quarantined content or a changed snapshot. Auth settings/triggers are unchanged.

## Installation / upgrades

`verified_sessions.sql` is the consolidated baseline, not a migration to rerun.
For the pre-timed installation, the incremental schema/function sources are
`verified_daily_challenge.sql`, `verified_timed_sessions.sql`, and
`verified_rapid_sessions.sql`, in that order. The changed snapshot, base issuance
and completion functions in the consolidated baseline must also be replaced as
part of the same upgrade. These changes are already applied to the live project.
Do not rerun the incremental ALTER statements blindly on an upgraded database.

`beta_activity_tracking.sql` adds private assignment/session tables and bounded
RPCs. Private roster records are loaded separately; do not put tester addresses
in application source, public JSON or a repository. `admin_beta_activity` requires
the existing server-side admin check. Ordinary users cannot read these tables.

## Timing interpretation

Activity uses server receipt timestamps, not client-entered times. Only heartbeat
gaps of up to 90 seconds contribute observed foreground seconds. Superseded device
sessions stop counting. An absent end event stays interrupted/unknown; no invented
end time or historical backfill is presented as an observation. Foreground time
does not prove active attention, Play enrollment or entitlement to payment.
The supervisor approves completion/payment separately after checking feedback.

## Compatibility and remaining cutover

The beta activity collector and verified screen wiring require new native builds
on both platforms. A successful Expo bundle export is not an uploaded/installed
TestFlight or Play build. The web download/admin changes require web deployment.
Existing releases and older web practice clients still use legacy reward APIs;
those APIs have not been revoked in this additive rollout. Full removal must wait
until compatible clients are distributed and real-device smoke tests pass.

## Regression evidence

The rollback-only regression scripts cover ordinary verified sessions, current
quarantine/expiry, daily challenges, timed answers, admin activity/roster access,
Rapid Fire and Barrage replay. All fixture changes must roll back. Run native and
web type checks, protocol unit tests and both platform exports before release.
