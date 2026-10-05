# BCA 2nd Year Learning Hub

A student-built learning portal that brings BCA second-year course roadmaps and study resources together in one place. Browse subjects for Semesters III and IV, track syllabus progress, watch curated lecture playlists, and open recommended notes and practice tests.

## Features

- Browse eight subjects across Semester III and Semester IV.
- View course module outlines and mark modules complete with a syllabus checklist.
- Save checklist progress in the browser using `localStorage`.
- Watch curated YouTube playlists embedded in the course pages.
- Open recommended study notes and practice tests.
- Use the responsive interface on desktop and mobile.
- Visit the creator's profile and student community links from the About page.

## Courses

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
└── courses.json   # Course descriptions, modules, playlists, and resource links
```

## Technology

- HTML
- CSS
- Vanilla JavaScript
- JSON course catalog
- Browser `localStorage` for saved module progress

There is no backend or account system. Progress is stored only in the browser and is not synchronized across devices.

## External services

The page references Google Fonts and Font Awesome for typography and icons, and embeds course playlists from YouTube. The About page also links to and embeds external social profiles. These services require an internet connection and may apply their own privacy policies.
