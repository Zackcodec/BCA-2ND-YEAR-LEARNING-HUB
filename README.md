# BCA Department Learning Hub

A student-built learning portal for a BCA department. Browse courses by BCA year, track syllabus progress, watch curated lecture playlists, and open recommended notes and practice tests.

## Supabase setup

Authentication, consent records, and cross-device progress use Supabase. Before using the login, registration, Google sign-in, privacy settings, or deletion flows:

1. Create a Supabase project and run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor. Re-run it after schema or course-catalog updates.
2. The current project URL and publishable key are configured in `script.js`. If you switch projects, update `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` there using the project URL and its publishable (or legacy anon) key. Never use a service-role key in this website.
3. In Supabase Authentication settings, enable email/password sign-in and configure the site's URL and allowed redirect URLs for local development and the deployed site.
4. To enable Google sign-in, configure the Google provider in Supabase with the OAuth client details and callback URL shown in the Supabase dashboard.
5. Deploy the `delete-account` and `delete-inactive-accounts` Edge Functions. Keep `SUPABASE_SERVICE_ROLE_KEY` in Edge Function secrets only. Configure `SITE_ORIGIN` to the exact production HTTPS origin for `delete-account`, and set a random `RETENTION_JOB_SECRET` for the inactive-account job.
6. Schedule `delete-inactive-accounts` to run monthly, sending `Authorization: Bearer <RETENTION_JOB_SECRET>`. This function deletes accounts with no sign-in or recorded learning activity for 12 calendar months; auth-user deletion cascades to profiles, progress, activity, and consent records.
7. Serve the folder over HTTPS in production, then open `index.html`. Local development may use localhost over HTTP.

The browser loads the Supabase JavaScript client from jsDelivr. Keep the project URL and publishable/anon key in frontend configuration; these are designed for browser use when the database's Row Level Security policies are enabled. The privacy migration adds account-scoped consent history without changing the existing RLS policies. Consent rows are created by authenticated database functions and cannot be edited or deleted by the client. The leaderboard RPC returns only opted-in nicknames, rank, points, current streak, and completed-course count to signed-in students; it never returns names, email addresses, or profile links.

The consent gate and SQL RPCs use `NOTICE_VERSION = "2026-10-v1"`. When the Privacy Notice changes, update the version in `script.js`, `supabase-schema.sql`, and `privacy/index.html`, then re-run the SQL migration so new sessions are asked to review the current notice.

Enable the strongest available password policy and Supabase Auth rate limits (including email/OTP limits) in the Supabase dashboard. Prefer Google sign-in where appropriate. Never log or send user names, emails, or raw auth errors to client logs or external error trackers. Do not add analytics scripts unless there is a provider and a consent-gated loader; this project currently has no analytics provider and no advertising or marketing trackers.

## Features

- Expand the BCA Program in the sidebar to browse BCA 1st, 2nd, and 3rd Year.
- View an at-a-glance dashboard with syllabus progress and quick year access.
- Customize your student profile with a display name, bio, and social links.
- Track current and longest learning streaks from completed course modules.
- Compete on the student leaderboard, ranked by completed courses and current streak.
- Review required and optional consent after sign-in, including OAuth; optional purposes are separate and can be withdrawn in Privacy Settings.
- Review append-only consent history, export personal data, correct profile details, and request account deletion in Privacy Settings.
- Earn personal, printable completion certificates by completing every available module in a course.
- Review concise privacy, terms, and refund-policy disclosures at the dashboard footer or from My Profile.
- Support the learning hub through Buy Me a Coffee.
- Open a support page with Buy Me a Coffee and direct UPI options, including the Buy Me a Coffee QR, a locally generated UPI QR, a copyable UPI ID, and a UPI-app payment link.
- View course module outlines and mark modules complete with a syllabus checklist.
- Save checklist progress to the signed-in student's Supabase account.
- Sign in with email/password or Google, register, reset passwords, and log out.
- Watch curated YouTube playlists embedded in the course pages.
- Open recommended study notes and practice resources, including topic-specific searches from each module.
- Use the responsive interface on desktop and mobile.
- Visit the creator's profile and student community links from the About page.
- Read the Privacy Notice and Terms of Use or report content through the site footer.

## Course catalog

The course browser groups subjects into these BCA years:

- **BCA 1st Year:** Programming in C, Computer Fundamentals, Mathematics for Computing I, Communication Skills, Data Structures, Object-Oriented Programming with C++, Digital Logic and Computer Organization, Financial Accounting
- **BCA 2nd Year:** Computer Networks, Software Engineering, Computer Graphics, Optimization Technique, Python Programming, DBMS Using PL/SQL, Design & Analysis of Algorithms, Artificial Intelligence
- **BCA 3rd Year:** Java Programming, Web Technologies, Computer Architecture, Software Testing and Quality Assurance, Cloud Computing, Cyber Security, Data Mining, Major Project

Course names and roadmaps can vary by university; confirm the course list and module sequence against the department's official syllabus before relying on it for exams. Each module offers topic-specific searches scoped to the course's recommended notes or practice source. Some recommended resources are learning exercises or open-course problem sets rather than formal mock examinations.

## Getting started

The app loads its course catalog from `courses.json` using `fetch`, so it must be opened through a local web server rather than directly as a `file://` page.

1. Download or clone this repository.
2. Open the project folder in Visual Studio Code.
3. Start a local server for the folder, for example with the **Live Server** extension.
4. Open the served `index.html` page in your browser.

No build step or package installation is required.

## Project structure

```text
.
├── index.html     # Page structure and course/about views
├── style.css      # Layout, theme, and responsive styles
├── script.js      # Navigation, course rendering, and progress tracking
├── courses.json   # Course descriptions, modules, playlists, and resource links
├── privacy/       # Privacy Notice
├── terms/         # Terms of Use
├── copyright-report/ # Content and takedown contact instructions
├── settings/privacy/ # Static-host route into the authenticated privacy settings view
├── account-deleted/ # Account deletion confirmation
├── supabase/functions/ # Server-side account deletion and inactive-account retention
└── supabase-schema.sql # Profile, consent, progress, activity, and leaderboard schema
```

## Technology

- HTML
- CSS
- Vanilla JavaScript
- JSON course catalog
- Existing browser-only demo progress is preserved but is not read into authenticated accounts or deleted.
- Supabase Auth and PostgreSQL with Row Level Security for account profiles and course progress
- Eight original built-in profile toons; only the selected avatar ID is stored in the profile row

Supabase Auth manages passwords and sessions. Profiles, module progress, daily activity, and append-only consent records are stored in Supabase and scoped to the authenticated user. The leaderboard shares only opted-in nicknames and learning statistics with signed-in students; account names, email, bio, and social links remain private. Certificates are personal learning records, not accredited credentials. Older demo values under the `bca2_progress` localStorage key are preserved on the current browser but are not automatically imported into an account because they were not associated with a specific student. If course module totals in `courses.json` change, update the matching `leaderboard_course_catalog` seed values in `supabase-schema.sql` and run that SQL again.

## Policies

The current Privacy Notice is at [`privacy/`](./privacy/) and the Terms of Use are at [`terms/`](./terms/). The site is intended for users 18 and older. The privacy notice describes current service providers and the configured Supabase region; confirm that region in the project dashboard. This site is an independent project and the notice is not legal advice or a substitute for advice from a lawyer familiar with the operator's location and obligations.

## Security incident response

If a suspected breach occurs, the site maintainer is the incident lead: preserve relevant access/security logs, contain the incident (including rotating exposed credentials and restricting affected services), and contact Supabase/hosting providers through their security channels. Assess what personal data and people are affected, document the timeline and mitigation, and notify the Data Protection Board of India and affected people within 72 hours as required by the project response target. Submit the CERT-In report within 6 hours of noticing a reportable incident. Keep the grievance contact available for questions and record follow-up actions. This runbook is operational guidance, not legal advice; follow any stricter applicable reporting deadlines.

## External services

The page references Google Fonts, Font Awesome, and a QR display library, embeds course playlists from YouTube, and uses Supabase for account features. The About page also links to and embeds external social profiles. These services require an internet connection and may apply their own privacy policies. UPI payment initiation opens the visitor's chosen UPI app; the site does not collect or process payment credentials.
