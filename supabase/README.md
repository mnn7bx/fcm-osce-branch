# Supabase Setup

## Run the schema and seed data

1. Go to your Supabase Dashboard → SQL Editor
2. Run `schema.sql` first (creates tables + RLS policies)
3. Run `seed.sql` second (inserts demo users, 3 cases, schedule, settings)

## Tables created

| Table | Purpose |
|-------|---------|
| `fcm_users` | Student/instructor/admin roster |
| `fcm_cases` | Case library with answer keys |
| `fcm_schedule` | Case→week→group mapping |
| `fcm_submissions` | Student differential submissions |
| `fcm_notes` | Per-case student notes |
| `fcm_settings` | Admin config (feedback mode, framework, etc.) |
| `fcm_osce_responses` | OSCE practice tracking |

## Demo Users

- **Demo Student** (student, Group A)
- **Alex Rivera, Jordan Kim** (students, Group A)
- **Sam Patel, Taylor Chen** (students, Group B)
- **Dr. Sarah Mitchell** (instructor, Group A)
- **Dr. Andrew Parsons** (admin)

## Sample Cases

1. **FCM-CV-001** — Chest Pain in a Young Athlete (22M Marcus Johnson)
2. **FCM-GI-001** — Acute Abdominal Pain After Eating (42F Gloria Billings)
3. **FCM-MSK-001** — Acute Low Back Pain with Radiating Symptoms (47F Nancy Owens)
