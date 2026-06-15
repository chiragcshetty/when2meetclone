# Timezone Support

This document describes the timezone feature: choosing a timezone when creating an
event, and showing each viewer the reservation grid in their own local timezone.

## Goal

1. **On event creation** — the start/end times are interpreted in the creator's
   current (detected) timezone, sent to the backend as a UTC offset, and the
   timezone name is stored on the event. (A timezone dropdown is still present
   and defaults to the detected zone.)
2. **On viewing** — each participant can independently pick the timezone the
   availability grid (time-of-day rows and day columns) is rendered in, via a
   **Timezone** selector on the event page. It defaults to their detected local
   timezone. Changing it re-renders the grid into the chosen timezone, so the
   same absolute meeting slots are shown on each participant's preferred clock.

## How it works (the core idea)

Availability slots are stored as keys that are **absolute Unix timestamps** (in
seconds). Previously the backend built those timestamps by treating the entered
wall-clock time as UTC, so the same numbers meant different things to different
viewers and the displayed labels were just the literal entered strings.

Now:

- The **creator's chosen timezone** is used to convert the entered wall-clock
  time into a correct absolute instant (UTC) before storing it.
- The **frontend** formats those absolute timestamps with whatever timezone the
  viewer has selected (held in vuex as `viewerTimezone`, defaulting to their
  detected local zone), using `Intl.DateTimeFormat({ timeZone })`. Changing the
  selector updates the day labels, weekday labels, and time-of-day labels.

### Offset convention

`utc_offset` is the chosen timezone's offset from UTC, in **minutes**
(e.g. `Asia/Singapore` → `480`, `America/New_York` EDT → `-240`).

Anchoring formula (backend):

```
absolute_unix = UTC_midnight(start_date) + start_time_seconds - utc_offset * 60
```

Worked examples for a 9:00 AM start on 2026-06-15:

| Timezone           | utc_offset (min) | First slot (absolute / UTC) |
|--------------------|------------------|-----------------------------|
| UTC                | 0                | 2026-06-15T09:00Z           |
| Asia/Singapore +8  | 480              | 2026-06-15T01:00Z           |
| America/New_York   | -240             | 2026-06-15T13:00Z           |
| Asia/Tokyo +9      | 540              | 2026-06-15T00:00Z           |

A viewer in Tokyo opening the Singapore-anchored event sees the first slot at
their local 10:00 AM (01:00Z + 9h), which is correct.

## Files changed

### Backend

**`backend/Models/Event.js`**
- Added an optional `timezone` (String) field to the event schema to record the
  IANA timezone the event times were entered in.

**`backend/utils.js`**
- `generateAvailability(...)` and `create_user_time_array_hr(...)` now accept an
  extra `utc_offset = 0` argument (minutes).
- The start timestamp is shifted by `utc_offset * 60` seconds so the stored
  slot keys are correct absolute instants:
  `const start_timestamp = new Date(start_date).getTime() / 1000 - tz_shift;`
- Backward compatible: when `utc_offset` is omitted (existing callers / old
  events), it defaults to `0`, reproducing the previous UTC-anchored behavior.

**`backend/routes.js`**
- `POST /add` now reads `timezone` and `utc_offset` from the request body,
  passes `utc_offset` into `generateAvailability`, and persists `timezone` on
  the new event document.

### Frontend

**`client/src/utils.ts`** — new / updated exported helpers:
- `localTimeLabels(firstKey, count, timeZone?)` — builds `count` hourly row
  labels starting from the earliest absolute timestamp, formatted in the chosen
  timezone (via the new `formatAMPMInZone` helper).
- `getDate(unixObject, timeZone?)` and `getDay(unixObject, timeZone?)` — now
  format the day-of-month and weekday in the chosen timezone using
  `Intl.DateTimeFormat({ timeZone })` instead of the fixed local zone.
- `getTimezoneOffsetMinutes(timeZone, date)` — computes an IANA timezone's UTC
  offset (in minutes) for a given date using `Intl.DateTimeFormat`. No external
  timezone library required.
- `getTimezoneOptions()` — a curated list of common IANA timezones, always
  including the viewer's detected local timezone (added first if not present).

**`client/src/store/state.ts`**
- Added `timezone: string` to the `EventData` interface.
- Added `viewerTimezone: string` to `State`, defaulting to the viewer's detected
  local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

**`client/src/store/mutations.ts`**
- Added `setViewerTimezone` mutation to update the viewer's selected timezone.

**`client/src/store/getters.ts`**
- `getTimeLabels` now derives the row labels from the absolute timestamps via
  `localTimeLabels(..., state.viewerTimezone)`, instead of echoing the literal
  entered `start_time`/`end_time` strings. The number of slots per day stays
  timezone-independent (it is a duration), so the grid's chunking is unchanged.
- `getEventDetails` now also returns `timezone` (the event's stored timezone)
  and `viewerTimezone` (the currently selected viewing timezone) for display.

**`client/src/components/Calendar.vue`**
- Wraps `getDate`/`getDay` so the day and weekday column labels are formatted in
  the selected `viewerTimezone` (read reactively from the store).

**`client/src/views/Event.vue`**
- Added a **Timezone** `<select>` (per participant) bound through a read/write
  computed to the `setViewerTimezone` mutation, populated from
  `getTimezoneOptions()`. Changing it re-renders the grid into that timezone.

**`client/src/views/NewEvent.vue`**
- Added a **Time Zone** `<select>` to the creation form, defaulting to
  `Intl.DateTimeFormat().resolvedOptions().timeZone` and populated from
  `getTimezoneOptions()`.
- On submit, computes `utc_offset` for the chosen timezone on the start date and
  sends both `timezone` and `utc_offset` in the create payload.
- Added matching `select` styling alongside the existing `input` styles.

**`client/src/components/EventDetails.vue`**
- Added two detail rows: **Event Timezone** (the zone the event was created in,
  shown only when present) and **Times Shown In** (the currently selected
  viewing timezone), so the timezone behavior is visible to users.

## Behavior notes & trade-offs

- **Day grouping:** Columns still represent the event's days, each grouping the
  same fixed number of consecutive hourly slots. When viewed from a distant
  timezone, a column's times may cross local midnight — this matches how
  when2meet-style grids behave and keeps each event "day" intact.
- **Existing events** (created before this change, no stored `timezone`) were
  anchored as if UTC. Because the grid now formats timestamps in the viewer's
  local timezone (rather than echoing literal strings), their displayed times
  shift to the viewer's timezone. This is the intended, more correct behavior,
  but it is a visible change for pre-existing events.
- **No new dependencies:** all timezone math uses the built-in `Intl` API.
- The timezone dropdown uses a curated common-timezone list (plus the detected
  local zone). It can be swapped for the full
  `Intl.supportedValuesOf("timeZone")` list if an exhaustive picker is desired.

## Suggested manual test

1. Create an event picking a timezone different from your machine's (e.g. set
   start 9:00 AM in `Asia/Tokyo` while your machine is on US time).
2. Open the event — the grid renders in your detected local timezone, and
   **EventDetails** lists both the event timezone and "Times Shown In".
3. Change the **Timezone** selector on the event page (e.g. to `Asia/Tokyo`) and
   confirm the day, weekday, and time-of-day labels all shift to that timezone
   while representing the same absolute slots. "Times Shown In" updates too.
4. Each participant can set this independently; it does not change the stored
   data, only how that participant views it.
