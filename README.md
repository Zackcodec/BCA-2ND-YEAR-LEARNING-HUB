# BCA Department Learning Hub

A student-built learning portal for a BCA department. Browse courses by year and semester, track syllabus progress, watch curated lecture playlists, and open recommended notes and practice tests.

## Supabase setup

Authentication and cross-device progress use Supabase. Before using the login, registration, Google sign-in, or password-reset flows:

1. Create a Supabase project and run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor.
   If the project was already set up, run the updated SQL again to add profile fields and the learning-activity table used by profiles, streaks, and certificates.
2. The current project URL and publishable key are configured in `script.js`. If you switch projects, update `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` there using the project URL and its publishable (or legacy anon) key. Never use a service-role key in this website.
3. In Supabase Authentication settings, enable email/password sign-in and configure the site's URL and allowed redirect URLs for local development and the deployed site.
4. To enable Google sign-in, configure the Google provider in Supabase with the OAuth client details and callback URL shown in the Supabase dashboard.
5. Serve the folder over HTTP(S), then open `index.html`.

The browser loads the Supabase JavaScript client from jsDelivr. Keep the project URL and publishable/anon key in frontend configuration; these are designed for browser use when the database's Row Level Security policies are enabled. The SQL schema restricts profile and progress records to `auth.uid()`.

## Features

- Browse subjects across three years and six semesters.
- Expand a year in the sidebar to select a year or one of its semesters.
- View an at-a-glance dashboard with syllabus progress and quick year access.
- Customize your private student profile with a display name, bio, and social links.
- Track current and longest learning streaks from completed course modules.
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

## Course catalog

**Semester III**

- Computer Networks
- Software Engineering
- Computer Graphics
- Optimization Technique

**Semester IV**

- Python Programming
- DBMS Using PL/SQL
- Design & Analysis of Algorithms
- Artificial Intelligence

**Semester I, II, V, and VI prototype subjects**

- Semester I: Programming in C, Computer Fundamentals, Mathematics for Computing I, Communication Skills
- Semester II: Data Structures, Object-Oriented Programming with C++, Digital Logic and Computer Organization, Financial Accounting
- Semester V: Java Programming, Web Technologies, Computer Architecture, Software Testing and Quality Assurance
- Semester VI: Cloud Computing, Cyber Security, Data Mining, Major Project

The Semester I, II, V, and VI course names and roadmaps are generic prototype suggestions, not a verified university syllabus. The Semester I and III-year prototypes include four-module roadmaps, embedded YouTube playlists or videos, and linked study/practice resources. Each module offers topic-specific searches scoped to the course's recommended notes or practice source. Some recommended resources are learning exercises or open-course problem sets rather than formal mock examinations. BCA subject names and semester placement vary by university; confirm the course list and module sequence against the department's official syllabus before relying on it for exams.

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
└── supabase-schema.sql # Profile, progress, and learning-activity tables with RLS
```

## Technology

- HTML
- CSS
- Vanilla JavaScript
- JSON course catalog
- Existing browser-only demo progress is preserved but is not read into authenticated accounts or deleted.
- Supabase Auth and PostgreSQL with Row Level Security for account profiles and course progress

Supabase Auth manages passwords and sessions. Profiles, module progress, and learning activity are stored in Supabase and scoped to the authenticated user. Student profiles and social links are private to each account; certificates are personal learning records, not accredited credentials. Older demo values under the `bca2_progress` localStorage key are preserved on the current browser but are not automatically imported into an account because they were not associated with a specific student.

## Policies

The dashboard includes expandable privacy, terms, and refund-policy summaries, also reachable from My Profile. They describe the current app and its third-party services; update them when data practices or payment features change. These summaries are not legal advice or a substitute for review by a lawyer familiar with the operator's location and applicable privacy and consumer-protection laws.

## External services

The page references Google Fonts, Font Awesome, and a QR display library, embeds course playlists from YouTube, and uses Supabase for account features. The About page also links to and embeds external social profiles. These services require an internet connection and may apply their own privacy policies. UPI payment initiation opens the visitor's chosen UPI app; the site does not collect or process payment credentials.
