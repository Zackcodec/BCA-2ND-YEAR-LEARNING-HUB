const SUPABASE_URL = 'https://hbvtywptpmlohglurcht.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_izQRkjrqt2ZgUyIdwl2VIA_dc8Nk72d';
const LEGACY_PROGRESS_STORAGE_KEY = 'bca2_progress';
const LEGACY_PROGRESS_NOTICE_DISMISSED_KEY = 'bca2_legacy_progress_notice_dismissed';
const NOTICE_VERSION = '2026-10-v1';
const SITE_ROOT = new URL('.', window.location.href);
const gridElement = document.getElementById('subject-grid');
const appErrorElement = document.getElementById('app-error');
const legacyProgressNotice = document.getElementById('legacy-progress-notice');
const authScreen = document.getElementById('auth-screen');
const consentScreen = document.getElementById('consent-screen');
const authenticatedApp = document.getElementById('authenticated-app');
const authFeedback = document.getElementById('auth-feedback');
const authNotice = document.getElementById('auth-notice');
const authConfigMessage = document.getElementById('auth-config-message');
const dashboardView = document.getElementById('dashboard-view');
const dashboardHome = document.getElementById('dashboard-home');
const courseBrowser = document.getElementById('course-browser');
const courseView = document.getElementById('course-view');
const aboutView = document.getElementById('about-view');
const supportView = document.getElementById('support-view');
const leaderboardView = document.getElementById('leaderboard-view');
const privacySettingsView = document.getElementById('privacy-settings-view');
const arenaLoader = document.getElementById('arena-loader');
const arenaLoaderTitle = document.getElementById('arena-loader-title');
const arenaLoaderNetwork = document.getElementById('arena-loader-network');
const mainScroll = document.getElementById('mainScroll');
const videoWrapper = document.getElementById('video-embed-wrapper');
const playlistOptions = document.getElementById('playlist-options');
const videoSourceLink = document.getElementById('video-source-link');
const instagramPopup = document.getElementById('instagram-popup');
const instagramPopupDismissedKey = 'bca2_instagram_popup_dismissed_until';
const SUPPORT_UPI_ID = 'aashupratap@ptyes';
const DEFAULT_AVATAR_ID = 'mint-owl';
const PROFILE_AVATARS = [
    { id: 'mint-owl', label: 'Mint Owl', color: '#a7f3d0', shade: '#059669', ears: 'round', detail: 'brow' },
    { id: 'sky-cat', label: 'Sky Cat', color: '#bae6fd', shade: '#0284c7', ears: 'pointed', detail: 'whiskers' },
    { id: 'coral-fox', label: 'Coral Fox', color: '#fed7aa', shade: '#ea580c', ears: 'pointed', detail: 'mask' },
    { id: 'lilac-bunny', label: 'Lilac Bunny', color: '#e9d5ff', shade: '#9333ea', ears: 'tall', detail: 'tuft' },
    { id: 'sunny-bear', label: 'Sunny Bear', color: '#fde68a', shade: '#ca8a04', ears: 'round', detail: 'freckles' },
    { id: 'teal-frog', label: 'Teal Frog', color: '#99f6e4', shade: '#0f766e', ears: 'eyes', detail: 'spots' },
    { id: 'peach-panda', label: 'Peach Panda', color: '#fecdd3', shade: '#e11d48', ears: 'round', detail: 'patches' },
    { id: 'blue-robot', label: 'Blue Robot', color: '#c7d2fe', shade: '#4f46e5', ears: 'antenna', detail: 'panel' }
];
let selectedAvatarId = DEFAULT_AVATAR_ID;
document.querySelectorAll('[data-site-path]').forEach(link => {
    link.href = new URL(link.dataset.sitePath, SITE_ROOT).href;
});

let courses = {};
let progressData = {};
let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let activityDates = [];
let pendingUserId = null;
let pendingSessionWork = null;
let sessionOperation = 0;
let catalogLoaded = false;
let privacySettingsOperation = 0;
let pageLoaderOperation = 0;
let pageLoaderShownAt = 0;
let pageLoaderDismissTimer = null;
const dashboardTitles = {
    all: 'BCA Courses',
    catalog: 'All Courses',
    year1: 'BCA 1st Year',
    year2: 'BCA 2nd Year',
    year3: 'BCA 3rd Year'
};

function getNetworkQuality() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return { label: 'NETWORK ADAPTIVE', speed: '1.25s' };
    const type = String(connection.effectiveType || '').toUpperCase();
    const downlink = Number(connection.downlink);
    if (type === 'SLOW-2G' || type === '2G' || (downlink > 0 && downlink < 0.5)) {
        return { label: 'LOW SIGNAL · ADAPTING', speed: '2.4s' };
    }
    if (type === '3G' || (downlink > 0 && downlink < 2)) {
        return { label: 'SIGNAL STABLE · SYNCING', speed: '1.6s' };
    }
    if (type === '4G' || downlink >= 2) {
        return { label: 'HIGH SIGNAL · SYNCING', speed: '0.9s' };
    }
    return { label: 'NETWORK ADAPTIVE', speed: '1.25s' };
}

function showPageLoader(title, networkWait = false) {
    window.clearTimeout(pageLoaderDismissTimer);
    const operation = ++pageLoaderOperation;
    const quality = getNetworkQuality();
    arenaLoaderTitle.textContent = title;
    arenaLoaderNetwork.textContent = networkWait ? quality.label : 'ROUTE READY · LOADING VIEW';
    arenaLoader.style.setProperty('--arena-loader-speed', quality.speed);
    arenaLoader.setAttribute('aria-busy', 'true');
    arenaLoader.hidden = false;
    pageLoaderShownAt = performance.now();
    return operation;
}

function hidePageLoader(operation) {
    if (operation !== pageLoaderOperation) return;
    const minimumDuration = 320;
    const remaining = Math.max(0, minimumDuration - (performance.now() - pageLoaderShownAt));
    window.clearTimeout(pageLoaderDismissTimer);
    pageLoaderDismissTimer = window.setTimeout(() => {
        if (operation !== pageLoaderOperation) return;
        arenaLoader.setAttribute('aria-busy', 'false');
        arenaLoader.hidden = true;
    }, remaining);
}

function finishQuickPageTransition(operation) {
    hidePageLoader(operation);
}

function svgShape(name, attributes) {
    const shape = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => shape.setAttribute(key, String(value)));
    return shape;
}

function createAvatarArtwork(avatarId, className) {
    const avatar = PROFILE_AVATARS.find(item => item.id === avatarId) || PROFILE_AVATARS[0];
    const svg = svgShape('svg', {
        viewBox: '0 0 100 100',
        class: className,
        role: 'img',
        'aria-label': `${avatar.label} avatar`
    });
    const add = (name, attributes) => svg.append(svgShape(name, attributes));

    add('rect', { x: 2, y: 2, width: 96, height: 96, rx: 30, fill: avatar.color });
    if (avatar.ears === 'pointed') {
        add('path', { d: 'M24 43 20 13Q20 9 25 13L43 31M76 43 80 13Q80 9 75 13L57 31', fill: avatar.shade, stroke: '#fff', 'stroke-width': 3, 'stroke-linejoin': 'round' });
        add('path', { d: 'm25 29 11 9m39-9L64 38', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.8 });
    } else if (avatar.ears === 'tall') {
        add('path', { d: 'M32 39Q22 4 31 8Q43 8 45 36M68 39Q78 4 69 8Q57 8 55 36', fill: avatar.shade, stroke: '#fff', 'stroke-width': 3 });
        add('path', { d: 'M32 28Q29 15 32 15Q36 16 38 31M68 28Q71 15 68 15Q64 16 62 31', fill: '#fff', opacity: 0.72 });
    } else if (avatar.ears === 'eyes') {
        add('circle', { cx: 34, cy: 29, r: 15, fill: avatar.shade, stroke: '#fff', 'stroke-width': 3 });
        add('circle', { cx: 66, cy: 29, r: 15, fill: avatar.shade, stroke: '#fff', 'stroke-width': 3 });
        add('circle', { cx: 34, cy: 29, r: 7, fill: '#fff' });
        add('circle', { cx: 66, cy: 29, r: 7, fill: '#fff' });
        add('circle', { cx: 35, cy: 30, r: 3.5, fill: '#15352f' });
        add('circle', { cx: 67, cy: 30, r: 3.5, fill: '#15352f' });
    } else if (avatar.ears === 'antenna') {
        add('path', { d: 'M50 24V12', stroke: avatar.shade, 'stroke-width': 5, 'stroke-linecap': 'round' });
        add('circle', { cx: 50, cy: 10, r: 6, fill: '#fb7185', stroke: '#fff', 'stroke-width': 2 });
        add('rect', { x: 17, y: 35, width: 12, height: 22, rx: 5, fill: avatar.shade });
        add('rect', { x: 71, y: 35, width: 12, height: 22, rx: 5, fill: avatar.shade });
    } else {
        add('circle', { cx: 26, cy: 36, r: 13, fill: avatar.shade });
        add('circle', { cx: 74, cy: 36, r: 13, fill: avatar.shade });
        add('circle', { cx: 26, cy: 36, r: 6, fill: '#fff', opacity: 0.76 });
        add('circle', { cx: 74, cy: 36, r: 6, fill: '#fff', opacity: 0.76 });
    }

    add('ellipse', { cx: 50, cy: 57, rx: 33, ry: 31, fill: avatar.shade, stroke: '#fff', 'stroke-width': 3 });
    add('ellipse', { cx: 50, cy: 65, rx: 24, ry: 18, fill: '#fff', opacity: 0.92 });
    add('circle', { cx: 39, cy: 54, r: 3.8, fill: '#173b36' });
    add('circle', { cx: 61, cy: 54, r: 3.8, fill: '#173b36' });
    add('circle', { cx: 40, cy: 53, r: 1.2, fill: '#fff' });
    add('circle', { cx: 62, cy: 53, r: 1.2, fill: '#fff' });
    add('ellipse', { cx: 50, cy: 64, rx: 4, ry: 3, fill: '#fda4af' });
    add('path', { d: 'M50 67v3m0 0q-5 7-10 1m10-1q5 7 10 1', fill: 'none', stroke: '#173b36', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    add('circle', { cx: 29, cy: 66, r: 4, fill: '#fb7185', opacity: 0.55 });
    add('circle', { cx: 71, cy: 66, r: 4, fill: '#fb7185', opacity: 0.55 });

    if (avatar.detail === 'brow') {
        add('path', { d: 'M32 47q7-7 14 0m8 0q7-7 14 0', fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    } else if (avatar.detail === 'whiskers') {
        add('path', { d: 'M20 62 34 65m-14 3 14 1m32-4 14-3m-14 8 14-1', stroke: avatar.shade, 'stroke-width': 1.7, 'stroke-linecap': 'round' });
    } else if (avatar.detail === 'mask') {
        add('path', { d: 'M19 48q12-10 25-2l6 7 6-7q13-8 25 2l-8 13H58l-8-7-8 7H27z', fill: '#fff', opacity: 0.78 });
        add('circle', { cx: 39, cy: 54, r: 3.8, fill: '#173b36' });
        add('circle', { cx: 61, cy: 54, r: 3.8, fill: '#173b36' });
    } else if (avatar.detail === 'tuft') {
        add('path', { d: 'M44 30q-3-11 5-15 0 8 5 8 3-7 9-6-2 10-10 15', fill: '#fff', stroke: avatar.shade, 'stroke-width': 2, 'stroke-linejoin': 'round' });
    } else if (avatar.detail === 'freckles') {
        [[34, 63], [39, 68], [66, 63], [61, 68]].forEach(([cx, cy]) => add('circle', { cx, cy, r: 1.5, fill: avatar.shade }));
    } else if (avatar.detail === 'spots') {
        [[25, 49], [75, 49], [21, 57], [79, 57]].forEach(([cx, cy]) => add('circle', { cx, cy, r: 3, fill: '#fff', opacity: 0.65 }));
    } else if (avatar.detail === 'patches') {
        add('ellipse', { cx: 36, cy: 53, rx: 9, ry: 7, fill: '#173b36', opacity: 0.78 });
        add('ellipse', { cx: 64, cy: 53, rx: 9, ry: 7, fill: '#173b36', opacity: 0.78 });
        add('circle', { cx: 39, cy: 54, r: 2.5, fill: '#fff' });
        add('circle', { cx: 61, cy: 54, r: 2.5, fill: '#fff' });
    } else if (avatar.detail === 'panel') {
        add('rect', { x: 37, y: 78, width: 26, height: 5, rx: 2.5, fill: avatar.shade, opacity: 0.65 });
        add('circle', { cx: 43, cy: 80.5, r: 1.3, fill: '#fff' });
        add('circle', { cx: 50, cy: 80.5, r: 1.3, fill: '#fff' });
        add('circle', { cx: 57, cy: 80.5, r: 1.3, fill: '#fff' });
    }
    return svg;
}

function renderAvatar(target, avatarId, className) {
    target.replaceChildren(createAvatarArtwork(avatarId, className));
}

function renderAvatarPicker() {
    const grid = document.getElementById('avatar-picker-grid');
    grid.replaceChildren();
    PROFILE_AVATARS.forEach(avatar => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'avatar-choice';
        button.setAttribute('aria-pressed', String(selectedAvatarId === avatar.id));
        button.setAttribute('aria-label', avatar.label);
        button.title = avatar.label;
        renderAvatar(button, avatar.id, 'avatar-choice-art');
        const label = document.createElement('span');
        label.textContent = avatar.label;
        button.append(label);
        button.addEventListener('click', () => {
            selectedAvatarId = avatar.id;
            grid.querySelectorAll('.avatar-choice').forEach(choice => {
                choice.setAttribute('aria-pressed', String(choice === button));
            });
            renderAvatar(document.getElementById('profile-avatar'), avatar.id, 'profile-avatar-art');
        });
        grid.append(button);
    });
}

function renderGrid(filter = 'all') {
    gridElement.replaceChildren();
    const matchingCourses = Object.entries(courses)
        .filter(([, course]) => filter === 'all' || filter === 'catalog'
            || course.year === filter)
        .sort(([, first], [, second]) => first.year.localeCompare(second.year)
            || first.title.localeCompare(second.title));

    for (const [courseId, course] of matchingCourses) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.addEventListener('click', () => loadCourse(courseId));

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = dashboardTitles[course.year] || 'BCA Course';

        const iconContainer = document.createElement('span');
        iconContainer.className = 'card-icon';
        const icon = document.createElement('i');
        icon.className = course.icon;
        icon.setAttribute('aria-hidden', 'true');
        iconContainer.append(icon);

        const title = document.createElement('span');
        title.className = 'card-title';
        title.textContent = course.title;

        const description = document.createElement('span');
        description.className = 'card-description';
        description.textContent = course.desc;

        card.append(badge, iconContainer, title, description);
        gridElement.append(card);
    }

    document.getElementById('dashboard-title').textContent = dashboardTitles[filter] || dashboardTitles.all;

    document.querySelectorAll('.nav-btn').forEach(button => {
        const isSelected = filter === 'all'
            ? button.dataset.action === 'dashboard'
            : button.dataset.year === filter;
        button.classList.toggle('active', isSelected);
    });
}

function getProgressForCourses(courseEntries) {
    let totalModules = 0;
    let completedModules = 0;
    let completedCourses = 0;

    courseEntries.forEach(([courseId, course]) => {
        const modules = course.modules || [];
        if (modules.length === 0) {
            return;
        }

        let completedForCourse = 0;
        modules.forEach((module, index) => {
            totalModules++;
            if (progressData[`${courseId}_${index}`] === true) {
                completedModules++;
                completedForCourse++;
            }
        });
        if (completedForCourse === modules.length) {
            completedCourses++;
        }
    });

    return {
        totalModules,
        completedModules,
        completedCourses,
        percent: totalModules === 0 ? 0 : Math.round(completedModules / totalModules * 100)
    };
}

function updateDashboardPerformance() {
    const entries = Object.entries(courses);
    const overall = getProgressForCourses(entries);
    document.getElementById('overall-progress').textContent =
        overall.totalModules === 0 ? '—' : `${overall.percent}%`;
    document.getElementById('completed-modules-count').textContent =
        String(overall.completedModules);
    document.getElementById('total-modules-count').textContent =
        String(overall.totalModules);
    document.getElementById('courses-completed').textContent = String(overall.completedCourses);
    document.getElementById('courses-completed-caption').textContent =
        `${entries.filter(([, course]) => (course.modules || []).length > 0).length} courses with outlines`;
    renderCertificateCards(entries);

    const progressBar = document.getElementById('overall-progress-bar');
    progressBar.setAttribute('aria-valuenow', String(overall.percent));
    progressBar.querySelector('span').style.width = `${overall.percent}%`;

    for (const year of ['year1', 'year2', 'year3']) {
        const yearEntries = entries.filter(([, course]) => course.year === year);
        const yearProgress = getProgressForCourses(yearEntries);
        document.getElementById(`${year}-course-count`).textContent =
            `${yearEntries.length} courses`;
        document.getElementById(`${year}-progress-label`).textContent =
            yearProgress.totalModules === 0
                ? 'Syllabus coming soon'
                : `${yearProgress.percent}% complete`;
        document.getElementById(`${year}-progress-bar`).style.width =
            `${yearProgress.percent}%`;
    }
    const streak = getCurrentStreak(activityDates);
    const longestStreak = getLongestStreak(activityDates);
    document.getElementById('current-streak').textContent = String(streak);
    document.getElementById('current-streak-unit').textContent = streak === 1 ? 'day' : 'days';
    document.getElementById('streak-caption').textContent = streak > 0
        ? 'Keep learning today to keep it going'
        : 'Complete a module to start a streak';
    document.getElementById('profile-current-streak').textContent = String(streak);
    document.getElementById('profile-current-streak-unit').textContent = streak === 1 ? 'day' : 'days';
    document.getElementById('profile-longest-streak').textContent = String(longestStreak);
    document.getElementById('profile-longest-streak-unit').textContent =
        longestStreak === 1 ? 'day' : 'days';
    document.getElementById('profile-certificate-count').textContent =
        String(getCompletedCourses(entries).length);
}

function getCompletedCourses(courseEntries = Object.entries(courses)) {
    return courseEntries.filter(([courseId, course]) => {
        const modules = course.modules || [];
        return modules.length > 0
            && modules.every((module, index) => progressData[`${courseId}_${index}`] === true);
    });
}

async function loadLeaderboard() {
    const status = document.getElementById('leaderboard-status');
    const body = document.getElementById('leaderboard-body');
    const optInMessage = document.getElementById('leaderboard-opt-in');
    const userId = currentUser?.id;
    if (!userId || !supabaseClient) return;
    const loaderOperation = showPageLoader('Loading the leaderboard', true);

    body.replaceChildren();
    optInMessage.hidden = Boolean(currentProfile?.show_on_leaderboard);
    status.textContent = 'Loading leaderboard…';
    try {
        const { data, error } = await supabaseClient.rpc('get_student_leaderboard');
        if (error) throw error;
        if (currentUser?.id !== userId) return;

        if (!Array.isArray(data)) {
            throw new Error('The leaderboard response was not a list.');
        }
        if (data.length === 0) {
            status.textContent = currentProfile?.show_on_leaderboard
                ? 'No student scores are available yet.'
                : 'Leaderboard scores are shown for students who opt in.';
            return;
        }

        data.forEach(entry => {
            const row = document.createElement('tr');
            if (entry.is_current_user) row.className = 'leaderboard-current-user';
            const values = [
                `#${entry.leaderboard_rank}`,
                entry.display_name || 'Student',
                String(entry.points),
                `${entry.current_streak} ${Number(entry.current_streak) === 1 ? 'day' : 'days'}`,
                String(entry.completed_courses)
            ];
            values.forEach((value, index) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                if (index === 0) cell.className = 'leaderboard-rank';
                row.append(cell);
            });
            body.append(row);
        });
        status.textContent = 'Ranked by points: 10 per completed course and 1 per current streak day.';
    } catch (error) {
        if (currentUser?.id !== userId) return;
        console.error('Unable to load the student leaderboard.');
        status.textContent = 'The leaderboard could not be loaded. Run the latest supabase-schema.sql and try again.';
    } finally {
        hidePageLoader(loaderOperation);
    }
}

function renderCertificateCards(courseEntries) {
    const certificateGrid = document.getElementById('certificate-grid');
    certificateGrid.replaceChildren();
    const completedCourses = getCompletedCourses(courseEntries);
    if (completedCourses.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'certificate-empty';
        empty.textContent = 'Complete every module in a course to earn a personal completion certificate.';
        certificateGrid.append(empty);
        return;
    }

    completedCourses.forEach(([courseId, course]) => {
        const card = document.createElement('article');
        card.className = 'certificate-card';
        const icon = document.createElement('span');
        icon.className = 'certificate-card-icon';
        icon.innerHTML = '<i class="fa-solid fa-award" aria-hidden="true"></i>';
        const copy = document.createElement('span');
        copy.className = 'certificate-card-copy';
        const title = document.createElement('strong');
        title.textContent = course.title;
        const caption = document.createElement('small');
        caption.textContent = 'All course modules completed';
        copy.append(title, caption);
        const openButton = document.createElement('button');
        openButton.type = 'button';
        openButton.className = 'certificate-open-btn';
        openButton.textContent = 'View / Print';
        openButton.addEventListener('click', () => openCertificate(courseId));
        card.append(icon, copy, openButton);
        certificateGrid.append(card);
    });
}

function utcDateString(date = new Date()) {
    return new Date(date).toISOString().slice(0, 10);
}

function getCurrentStreak(dates) {
    const recordedDates = new Set(dates);
    const today = utcDateString();
    const yesterday = utcDateString(new Date(Date.now() - 86400000));
    let cursor = recordedDates.has(today) ? today : recordedDates.has(yesterday) ? yesterday : null;
    if (!cursor) return 0;

    let streak = 0;
    while (recordedDates.has(cursor)) {
        streak++;
        cursor = utcDateString(new Date(`${cursor}T00:00:00.000Z`).getTime() - 86400000);
    }
    return streak;
}

function getLongestStreak(dates) {
    const orderedDates = [...new Set(dates)].sort();
    let longest = 0;
    let current = 0;
    let previousTime = null;
    orderedDates.forEach(date => {
        const time = new Date(`${date}T00:00:00.000Z`).getTime();
        current = previousTime !== null && time - previousTime === 86400000 ? current + 1 : 1;
        longest = Math.max(longest, current);
        previousTime = time;
    });
    return longest;
}

async function recordLearningActivity(userId) {
    const activityDate = utcDateString();
    try {
        const { error } = await supabaseClient
            .from('learning_activity')
            .upsert({ user_id: userId, activity_date: activityDate }, {
                onConflict: 'user_id,activity_date',
                ignoreDuplicates: true
            });
        if (error) throw error;
        if (currentUser?.id === userId && !activityDates.includes(activityDate)) {
            activityDates = [...activityDates, activityDate];
            updateDashboardPerformance();
        }
    } catch (error) {
        if (currentUser?.id !== userId) return;
        console.error('Unable to record your learning streak.');
        showAppError('Your module was saved, but today’s streak could not be recorded. Run the latest supabase-schema.sql and try again tomorrow.');
    }
}

function openCertificate(courseId) {
    const course = courses[courseId];
    if (!course || !currentUser || !getCompletedCourses().some(([completedId]) => completedId === courseId)) {
        showAppError('Complete every module in this course to unlock its certificate.');
        return;
    }
    document.getElementById('certificate-student-name').textContent =
        currentProfile?.full_name?.trim() || currentUser?.email || 'Student';
    document.getElementById('certificate-course-name').textContent = course.title;
    const issuedAt = new Date();
    document.getElementById('certificate-date').textContent =
        issuedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    document.getElementById('certificate-id').textContent =
        `Personal record · ${currentUser.id.slice(0, 8).toUpperCase()}-${courseId.toUpperCase()}`;
    document.getElementById('certificate-print-view').hidden = false;
    window.print();
}

window.addEventListener('afterprint', () => {
    document.getElementById('certificate-print-view').hidden = true;
});

async function saveModuleProgress(courseId, moduleIndex, completed, checkbox, item) {
    if (!supabaseClient || !currentUser) {
        checkbox.checked = !completed;
        item.classList.toggle('completed', !completed);
        return;
    }

    const userId = currentUser.id;
    const previousValue = progressData[`${courseId}_${moduleIndex}`] === true;
    checkbox.disabled = true;
    try {
        const query = completed
            ? supabaseClient.from('course_progress').upsert({
                user_id: userId,
                course_id: courseId,
                module_index: moduleIndex,
                completed: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,course_id,module_index' })
            : supabaseClient.from('course_progress').delete()
                .eq('user_id', userId)
                .eq('course_id', courseId)
                .eq('module_index', moduleIndex);
        const { error } = await query;
        if (error) {
            throw error;
        }
        if (currentUser?.id !== userId) {
            return;
        }
        if (completed) {
            progressData[`${courseId}_${moduleIndex}`] = true;
        } else {
            delete progressData[`${courseId}_${moduleIndex}`];
        }
        const { error: activityUpdateError } = await supabaseClient
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', userId);
        if (currentUser?.id !== userId) return;
        if (activityUpdateError) {
            console.error('Course progress was saved, but account activity could not be updated.');
            showAppError('Your progress was saved, but your account activity date could not be updated.');
        }
        updateDashboardPerformance();
        if (completed) {
            void recordLearningActivity(userId);
        }
    } catch (error) {
        if (currentUser?.id !== userId) {
            return;
        }
        console.error('Unable to save course progress to your account.');
        checkbox.checked = previousValue;
        item.classList.toggle('completed', previousValue);
        showAppError('Your progress could not be saved. Check your connection and try again.');
    } finally {
        checkbox.disabled = false;
    }
}

function showAppError(message) {
    appErrorElement.textContent = message;
    appErrorElement.hidden = false;
}

document.getElementById('dismiss-legacy-progress').addEventListener('click', () => {
    legacyProgressNotice.hidden = true;
    try {
        localStorage.setItem(LEGACY_PROGRESS_NOTICE_DISMISSED_KEY, 'true');
    } catch {
        console.error('Unable to save the legacy progress notice preference.');
    }
});

function moduleResourceSearchUrl(baseUrl, courseTitle, moduleTitle, resourceType) {
    const resourceHost = new URL(baseUrl).hostname.replace(/^www\./, '');
    const topicTitle = moduleTitle.replace(/^Module [IVX]+:\s*/, '');
    const query = `site:${resourceHost} ${courseTitle} ${topicTitle} ${resourceType}`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function renderModules(courseId, modules) {
    const listContainer = document.getElementById('module-list-container');
    const course = courses[courseId];
    listContainer.replaceChildren();
    if (modules.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'The course outline has not been added yet.';
        listContainer.append(emptyState);
        return;
    }

    modules.forEach((module, index) => {
        const stateKey = `${courseId}_${index}`;
        const item = document.createElement('div');
        item.className = 'module-item';

        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = progressData[stateKey] === true;
        checkbox.setAttribute('aria-label', `Mark ${module.title} complete`);
        item.classList.toggle('completed', checkbox.checked);
        checkbox.addEventListener('change', () => {
            item.classList.toggle('completed', checkbox.checked);
            void saveModuleProgress(courseId, index, checkbox.checked, checkbox, item);
        });
        checkboxWrapper.append(checkbox);

        const text = document.createElement('div');
        text.className = 'module-text';
        const title = document.createElement('h4');
        title.textContent = module.title;
        const description = document.createElement('p');
        description.textContent = module.desc;
        text.append(title, description);

        const resources = document.createElement('div');
        resources.className = 'module-resources';
        const notesLink = document.createElement('a');
        notesLink.href = moduleResourceSearchUrl(course.notesLink, course.title, module.title, 'notes tutorial');
        notesLink.target = '_blank';
        notesLink.rel = 'noopener noreferrer';
        notesLink.textContent = 'Find topic notes';
        const practiceLink = document.createElement('a');
        practiceLink.href = moduleResourceSearchUrl(course.mockLink, course.title, module.title, 'practice questions quiz');
        practiceLink.target = '_blank';
        practiceLink.rel = 'noopener noreferrer';
        practiceLink.textContent = 'Find practice questions';
        resources.append(notesLink, practiceLink);
        text.append(resources);

        item.append(checkboxWrapper, text);
        listContainer.append(item);
    });
}

function switchTab(tabId, button) {
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function loadPlaylist(courseId, playlistIndex) {
    const course = courses[courseId];
    const playlist = course?.videos?.[playlistIndex];
    if (!playlist) {
        console.error('A requested course playlist is missing.');
        return;
    }

    document.querySelectorAll('.playlist-option').forEach((button, index) => {
        button.classList.toggle('active', index === playlistIndex);
        button.setAttribute('aria-pressed', String(index === playlistIndex));
    });

    document.getElementById('video-provider-name').textContent = playlist.title;
    document.getElementById('video-channel-name').textContent = `Channel: ${playlist.provider}`;
    videoSourceLink.hidden = false;
    let playlistUrl;
    try {
        playlistUrl = new URL(playlist.playlistUrl);
    } catch (error) {
        console.error('A course playlist URL is invalid.');
        videoSourceLink.hidden = true;
        videoWrapper.replaceChildren();
        return;
    }
    const isYouTubeEmbed = playlistUrl.protocol === 'https:'
        && playlistUrl.hostname === 'www.youtube.com'
        && playlistUrl.pathname.startsWith('/embed/');
    const sourceUrl = isYouTubeEmbed
        ? `https://www.youtube.com${playlistUrl.pathname.replace('/embed/videoseries', '/playlist')}${playlistUrl.search}`
        : playlistUrl.href;
    videoSourceLink.href = sourceUrl;
    videoSourceLink.textContent = isYouTubeEmbed
        ? 'Open this playlist on YouTube'
        : 'Browse matching playlists on YouTube';

    if (isYouTubeEmbed) {
        const placeholder = document.createElement('div');
        placeholder.className = 'video-consent-placeholder';
        const privacyMessage = document.createElement('p');
        privacyMessage.textContent = 'Playing this loads a YouTube video; YouTube may set cookies.';
        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.className = 'video-load-btn';
        playButton.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Play video';
        playButton.addEventListener('click', () => {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube-nocookie.com${playlistUrl.pathname}${playlistUrl.search}`;
            iframe.title = `${course.title}: ${playlist.title}`;
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', '');
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            videoWrapper.replaceChildren(iframe);
        }, { once: true });
        placeholder.append(privacyMessage, playButton);
        videoWrapper.replaceChildren(placeholder);
    } else {
        document.getElementById('video-channel-name').textContent = '';
        const searchNote = document.createElement('p');
        searchNote.className = 'empty-state';
        searchNote.textContent = 'YouTube playlist search results cannot be embedded here. Use the link below to browse matching playlists.';
        videoWrapper.replaceChildren(searchNote);
    }
}

function loadCourse(courseId) {
    const course = courses[courseId];
    if (!course) {
        console.error('A requested course does not exist in the course catalog.');
        return;
    }
    const loaderOperation = showPageLoader(course.title);
    finishQuickPageTransition(loaderOperation);

    dashboardView.style.display = 'none';
    courseView.style.display = 'block';
    aboutView.style.display = 'none';
    leaderboardView.hidden = true;
    privacySettingsView.hidden = true;
    supportView.hidden = true;
    mainScroll.scrollTo(0, 0);

    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-desc').textContent = course.desc;
    document.getElementById('book-title').textContent = course.notesName || 'Study materials not added yet';
    document.querySelector('#mock-link span').textContent =
        course.mockName || 'Take Topic Mock Test';

    renderModules(courseId, course.modules);
    playlistOptions.replaceChildren();
    (course.videos || []).forEach((playlist, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'playlist-option';
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => loadPlaylist(courseId, index));

        const title = document.createElement('span');
        title.textContent = playlist.title;
        const provider = document.createElement('span');
        provider.className = 'playlist-option-provider';
        provider.textContent = playlist.provider;
        button.append(title, provider);
        playlistOptions.append(button);
    });
    if (course.videos?.length > 0) {
        loadPlaylist(courseId, 0);
    } else {
        document.getElementById('video-provider-name').textContent = 'Course playlists';
        document.getElementById('video-channel-name').textContent = '';
        videoSourceLink.removeAttribute('href');
        videoSourceLink.hidden = true;
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Lecture playlists have not been added yet.';
        videoWrapper.replaceChildren(emptyState);
    }

    setResourceLink(document.getElementById('book-link'), course.notesLink);
    setResourceLink(document.getElementById('mock-link'), course.mockLink);
    const firstTab = document.querySelector('.tab-btn[data-tab]');
    switchTab(firstTab.dataset.tab, firstTab);
    closeSidebar();
}

function setResourceLink(link, href) {
    if (href) {
        link.href = href;
        link.removeAttribute('aria-disabled');
        link.classList.remove('is-unavailable');
    } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('is-unavailable');
    }
}

function showDashboard(filter = 'all') {
    const loaderOperation = showPageLoader(dashboardTitles[filter] || dashboardTitles.all);
    finishQuickPageTransition(loaderOperation);
    if (window.location.pathname.endsWith('/settings/privacy/')) {
        window.history.replaceState({}, '', new URL('index.html', SITE_ROOT));
    }
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    leaderboardView.hidden = true;
    privacySettingsView.hidden = true;
    supportView.hidden = true;
    document.getElementById('profile-view').hidden = true;
    dashboardView.style.display = 'block';
    dashboardHome.hidden = filter !== 'all';
    courseBrowser.hidden = filter === 'all';
    videoWrapper.replaceChildren();
    if (filter !== 'all') {
        renderGrid(filter);
    } else {
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.action === 'dashboard');
        });
    }
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

function showAbout() {
    const loaderOperation = showPageLoader('Opening about');
    finishQuickPageTransition(loaderOperation);
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    leaderboardView.hidden = true;
    privacySettingsView.hidden = true;
    supportView.hidden = true;
    document.getElementById('profile-view').hidden = true;
    aboutView.style.display = 'block';
    videoWrapper.replaceChildren();
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.action === 'about');
    });
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

function populateProfileForm() {
    const form = document.getElementById('profile-form');
    const fields = ['full_name', 'bio', 'website_url', 'linkedin_url', 'github_url', 'instagram_url'];
    fields.forEach(field => {
        form.elements.namedItem(field).value = currentProfile?.[field] || '';
    });
    selectedAvatarId = PROFILE_AVATARS.some(avatar => avatar.id === currentProfile?.avatar_id)
        ? currentProfile.avatar_id
        : DEFAULT_AVATAR_ID;
    renderAvatarPicker();
}

function renderProfileSocialLinks(profile) {
    const container = document.getElementById('profile-social-links');
    container.replaceChildren();
    const entries = [
        ['website_url', 'Website', 'fa-solid fa-globe'],
        ['linkedin_url', 'LinkedIn', 'fa-brands fa-linkedin'],
        ['github_url', 'GitHub', 'fa-brands fa-github'],
        ['instagram_url', 'Instagram', 'fa-brands fa-instagram']
    ];
    entries.forEach(([field, label, iconClass]) => {
        const value = profile?.[field]?.trim();
        if (!value) return;
        let safeHref;
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return;
            safeHref = url.href;
        } catch {
            return;
        }
        const link = document.createElement('a');
        link.className = 'profile-social-link';
        link.href = safeHref;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.textContent = label;
        link.append(icon, text);
        container.append(link);
    });
    if (container.childElementCount === 0) {
        const note = document.createElement('p');
        note.className = 'profile-form-hint';
        note.textContent = 'Add social links to show them here.';
        container.append(note);
    }
}

function updateProfileSummary(profile) {
    const name = profile?.full_name?.trim() || currentUser?.email || 'Student';
    document.getElementById('profile-summary-name').textContent = name;
    document.getElementById('profile-summary-bio').textContent =
        profile?.bio?.trim() || 'Add a short introduction to your profile.';
    renderAvatar(document.getElementById('profile-avatar'), profile?.avatar_id, 'profile-avatar-art');
    const avatar = document.querySelector('.account-avatar');
    renderAvatar(avatar, profile?.avatar_id, 'account-avatar-art');
    avatar.setAttribute('aria-hidden', 'true');
    renderProfileSocialLinks(profile);
}

function showProfile() {
    if (!currentUser) return;
    const loaderOperation = showPageLoader('Opening your profile');
    finishQuickPageTransition(loaderOperation);
    if (window.location.pathname.endsWith('/settings/privacy/')) {
        window.history.replaceState({}, '', new URL('index.html', SITE_ROOT));
    }
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    leaderboardView.hidden = true;
    privacySettingsView.hidden = true;
    supportView.hidden = true;
    document.getElementById('profile-view').hidden = false;
    populateProfileForm();
    updateProfileSummary(currentProfile);
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.action === 'profile');
    });
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

function showSupport() {
    const loaderOperation = showPageLoader('Opening support');
    finishQuickPageTransition(loaderOperation);
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    leaderboardView.hidden = true;
    privacySettingsView.hidden = true;
    document.getElementById('profile-view').hidden = true;
    supportView.hidden = false;
    document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

function showLeaderboard() {
    if (!currentUser) return;
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    document.getElementById('profile-view').hidden = true;
    supportView.hidden = true;
    privacySettingsView.hidden = true;
    leaderboardView.hidden = false;
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.action === 'leaderboard');
    });
    mainScroll.scrollTo(0, 0);
    closeSidebar();
    void loadLeaderboard();
}

function renderConsentHistory(records) {
    const container = document.getElementById('consent-history-list');
    container.replaceChildren();
    if (records.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'profile-form-hint';
        empty.textContent = 'There are no consent changes to show yet.';
        container.append(empty);
        return;
    }

    [...records].reverse().forEach(record => {
        const row = document.createElement('div');
        row.className = 'consent-history-row';
        const purpose = document.createElement('strong');
        purpose.textContent = record.purpose.replaceAll('_', ' ');
        const state = document.createElement('span');
        state.textContent = record.granted ? 'Granted' : 'Withdrawn';
        const date = document.createElement('time');
        date.dateTime = record.created_at;
        date.textContent = new Date(record.created_at).toLocaleString();
        row.append(purpose, state, date);
        container.append(row);
    });
}

async function showPrivacySettings(updateUrl = true) {
    if (!currentUser) return;
    const loaderOperation = showPageLoader('Loading privacy settings', true);
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    document.getElementById('profile-view').hidden = true;
    supportView.hidden = true;
    leaderboardView.hidden = true;
    privacySettingsView.hidden = false;
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.action === 'privacy-settings');
    });
    if (updateUrl && !window.location.pathname.endsWith('/settings/privacy/')) {
        const routeUrl = new URL('settings/privacy/', SITE_ROOT);
        window.history.pushState({ view: 'privacy-settings' }, '', routeUrl);
    }
    mainScroll.scrollTo(0, 0);
    closeSidebar();

    const operation = ++privacySettingsOperation;
    const status = document.getElementById('privacy-settings-status');
    status.textContent = 'Loading your privacy settings…';
    try {
        const { data: records, error } = await supabaseClient
            .from('consent_records')
            .select('id,purpose,granted,notice_version,created_at')
            .order('created_at', { ascending: true })
            .order('id', { ascending: true });
        if (error) throw error;
        if (currentUser === null || operation !== privacySettingsOperation) return;

        const latest = new Map();
        records.forEach(record => {
            const existing = latest.get(record.purpose);
            if (!existing
                || record.notice_version > existing.notice_version
                || (record.notice_version === existing.notice_version
                    && Date.parse(record.created_at) >= Date.parse(existing.created_at))) {
                latest.set(record.purpose, record);
            }
        });
        document.getElementById('settings-leaderboard').checked =
            Boolean(currentProfile?.show_on_leaderboard && latest.get('leaderboard')?.granted);
        document.getElementById('settings-product-updates').checked =
            Boolean(latest.get('product_updates')?.granted);
        document.getElementById('settings-analytics').checked =
            Boolean(latest.get('analytics')?.granted);
        const nicknameInput = document.getElementById('settings-nickname');
        nicknameInput.value = currentProfile?.display_name || '';
        document.getElementById('settings-nickname-field').hidden =
            !document.getElementById('settings-leaderboard').checked;
        renderConsentHistory(records);
        status.textContent = '';
    } catch (error) {
        if (currentUser && operation === privacySettingsOperation) {
            console.error('Unable to load privacy settings.');
            status.textContent = 'Your settings could not be loaded. Run the latest supabase-schema.sql and try again.';
        }
    } finally {
        hidePageLoader(loaderOperation);
    }
}

async function updateOptionalConsent(purpose, granted, displayName = '') {
    const userId = currentUser?.id;
    if (!userId || !supabaseClient) throw new Error('No signed-in student session.');
    const status = document.getElementById('privacy-settings-status');
    const { error } = await supabaseClient.rpc('set_optional_consent', {
        p_purpose: purpose,
        p_granted: granted,
        p_notice_version: NOTICE_VERSION,
        p_display_name: purpose === 'leaderboard' && granted ? displayName : null
    });
    if (error) throw error;
    if (currentUser?.id !== userId) return;

    if (purpose === 'leaderboard') {
        currentProfile.show_on_leaderboard = granted;
        currentProfile.display_name = granted ? displayName : '';
        document.getElementById('settings-nickname-field').hidden = !granted;
    }
    status.textContent = 'Your privacy setting was saved.';
    const records = await supabaseClient
        .from('consent_records')
        .select('id,purpose,granted,notice_version,created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
    if (records.error) {
        console.error('Unable to refresh consent history after saving a privacy setting.');
        status.textContent = 'Your setting was saved, but consent history could not be refreshed.';
        return;
    }
    renderConsentHistory(records.data);
}

function bindPrivacySetting(purpose, inputId) {
    const checkbox = document.getElementById(inputId);
    checkbox.addEventListener('change', async () => {
        const desired = checkbox.checked;
        const previous = !desired;
        const status = document.getElementById('privacy-settings-status');
        if (purpose === 'leaderboard' && desired) {
            const nickname = document.getElementById('settings-nickname').value.trim();
            if (!validateNickname(nickname)) {
                checkbox.checked = false;
                document.getElementById('settings-nickname-field').hidden = false;
                status.textContent = 'Choose a valid nickname before joining the leaderboard.';
                document.getElementById('settings-nickname').focus();
                return;
            }
        }
        checkbox.disabled = true;
        status.textContent = 'Saving your choice…';
        try {
            const nickname = purpose === 'leaderboard' ? document.getElementById('settings-nickname').value.trim() : '';
            await updateOptionalConsent(purpose, desired, nickname);
        } catch (error) {
            checkbox.checked = previous;
            console.error('Unable to save a privacy setting.');
            status.textContent = 'This setting could not be saved. Please try again.';
        } finally {
            checkbox.disabled = false;
        }
    });
}

async function downloadMyData() {
    if (!currentUser || !supabaseClient) return;
    const button = document.getElementById('download-my-data');
    button.disabled = true;
    document.getElementById('privacy-settings-status').textContent = 'Preparing your data export…';
    try {
        const userId = currentUser.id;
        const [profileResult, progressResult, activityResult, consentResult] = await Promise.all([
            supabaseClient.from('profiles').select('*').eq('id', userId).single(),
            supabaseClient.from('course_progress').select('*').eq('user_id', userId),
            supabaseClient.from('learning_activity').select('*').eq('user_id', userId).order('activity_date'),
            supabaseClient.from('consent_records').select('id,purpose,granted,notice_version,created_at').order('created_at').order('id')
        ]);
        for (const result of [profileResult, progressResult, activityResult, consentResult]) {
            if (result.error) throw result.error;
        }
        if (currentUser?.id !== userId) return;

        const exportData = {
            exported_at: new Date().toISOString(),
            profile: profileResult.data,
            course_progress: progressResult.data,
            learning_activity: activityResult.data,
            consent_records: consentResult.data
        };
        const file = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bca-learning-hub-data.json';
        link.click();
        URL.revokeObjectURL(url);
        document.getElementById('privacy-settings-status').textContent = 'Your data download is ready.';
    } catch (error) {
        console.error('Unable to prepare the signed-in student data export.');
        document.getElementById('privacy-settings-status').textContent =
            'Your data could not be downloaded. Please try again.';
    } finally {
        button.disabled = false;
    }
}

async function deleteMyAccount() {
    if (!currentUser || !supabaseClient) return;
    const confirmed = window.confirm('Delete your BCA Learning Hub account permanently? This cannot be undone. Your profile, course progress, learning activity, and consent history will be deleted.');
    if (!confirmed) return;

    const button = document.getElementById('delete-my-account');
    button.disabled = true;
    document.getElementById('privacy-settings-status').textContent = 'Deleting your account…';
    try {
        const { error } = await supabaseClient.functions.invoke('delete-account', { method: 'POST' });
        if (error) throw error;
        const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });
        if (signOutError) console.error('Account deleted, but local sign-out did not complete.');
        window.location.assign(new URL('account-deleted/', SITE_ROOT));
    } catch (error) {
        console.error('Unable to delete the signed-in account.');
        document.getElementById('privacy-settings-status').textContent =
            'Account deletion could not be completed. Try again or email the grievance contact.';
        button.disabled = false;
    }
}

bindPrivacySetting('leaderboard', 'settings-leaderboard');
bindPrivacySetting('product_updates', 'settings-product-updates');
bindPrivacySetting('analytics', 'settings-analytics');
document.getElementById('save-settings-nickname').addEventListener('click', async () => {
    const input = document.getElementById('settings-nickname');
    if (!validateNickname(input.value)) {
        input.setCustomValidity('Enter 3–20 letters, numbers, underscores, or spaces. Do not use your real name or email.');
        input.reportValidity();
        input.setCustomValidity('');
        return;
    }
    const button = document.getElementById('save-settings-nickname');
    button.disabled = true;
    try {
        await updateOptionalConsent('leaderboard', true, input.value.trim());
        document.getElementById('settings-leaderboard').checked = true;
    } catch (error) {
        console.error('Unable to save a leaderboard nickname.');
        document.getElementById('privacy-settings-status').textContent =
            'Your nickname could not be saved. Please try again.';
    } finally {
        button.disabled = false;
    }
});
document.getElementById('download-my-data').addEventListener('click', () => void downloadMyData());
document.getElementById('delete-my-account').addEventListener('click', () => void deleteMyAccount());
document.getElementById('correct-my-data').addEventListener('click', showProfile);

function initializeSupportOptions() {
    const upiIdElement = document.getElementById('upi-id-value');
    const payLink = document.getElementById('upi-pay-link');
    const qrContainer = document.getElementById('upi-qr-code');
    const status = document.getElementById('upi-status');
    const paymentDetails = new URLSearchParams({
        pa: SUPPORT_UPI_ID,
        tn: 'Support BCA Learning Hub',
        cu: 'INR'
    });
    const paymentUri = `upi://pay?${paymentDetails.toString()}`;

    upiIdElement.textContent = SUPPORT_UPI_ID;
    payLink.href = paymentUri;

    if (typeof window.QRCode !== 'function') {
        console.error('The QR code library could not be loaded.');
        status.textContent = 'The QR code could not load. You can still copy the UPI ID or use Pay via UPI.';
        return;
    }

    try {
        new window.QRCode(qrContainer, {
            text: paymentUri,
            width: 192,
            height: 192,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('Unable to generate the UPI QR code.');
        status.textContent = 'The QR code could not be generated. You can still copy the UPI ID or use Pay via UPI.';
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.querySelector('[data-action="toggle-sidebar"]').setAttribute('aria-expanded', 'false');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.toggle('show');
    document.querySelector('[data-action="toggle-sidebar"]').setAttribute('aria-expanded', String(isOpen));
}

document.querySelectorAll('[data-action="dashboard"]').forEach(button => {
    button.addEventListener('click', () => showDashboard());
});

document.querySelector('[data-action="about"]').addEventListener('click', showAbout);
document.querySelector('[data-action="profile"]').addEventListener('click', showProfile);
document.querySelector('[data-action="leaderboard"]').addEventListener('click', showLeaderboard);
document.querySelectorAll('[data-action="privacy-settings"]').forEach(button => {
    button.addEventListener('click', () => void showPrivacySettings());
});
document.getElementById('open-profile').addEventListener('click', showProfile);
document.getElementById('open-support').addEventListener('click', showSupport);
document.getElementById('copy-upi-id').addEventListener('click', async event => {
    const button = event.currentTarget;
    const status = document.getElementById('upi-status');
    try {
        await navigator.clipboard.writeText(SUPPORT_UPI_ID);
        status.textContent = 'UPI ID copied.';
    } catch (error) {
        console.error('Unable to copy the UPI ID.');
        status.textContent = 'Could not copy automatically. Please select and copy the UPI ID above.';
    }
    button.blur();
});

document.querySelector('.program-nav-btn').addEventListener('click', event => {
    const button = event.currentTarget;
    setProgramExpanded(button.getAttribute('aria-expanded') !== 'true');
});

document.querySelectorAll('[data-year]').forEach(button => {
    button.addEventListener('click', () => {
        showDashboard(button.dataset.year);
    });
});

document.getElementById('browse-all-courses').addEventListener('click', () => {
    showDashboard('catalog');
});

function setProgramExpanded(expanded) {
    const button = document.querySelector('.program-nav-btn');
    const group = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(expanded));
    group.setAttribute('aria-hidden', String(!expanded));
    group.inert = !expanded;

    if (expanded) {
        group.style.height = '0px';
        group.getBoundingClientRect();
        group.style.height = `${group.scrollHeight}px`;
    } else {
        group.style.height = `${group.getBoundingClientRect().height}px`;
        group.getBoundingClientRect();
        group.style.height = '0px';
    }
}

document.querySelector('.program-nav-group').addEventListener('transitionend', event => {
    const group = event.currentTarget;
    if (event.propertyName === 'height' && group.getAttribute('aria-hidden') === 'false') {
        group.style.height = 'auto';
    }
});

document.querySelector('[data-action="toggle-sidebar"]').addEventListener('click', toggleSidebar);

document.addEventListener('click', event => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar.classList.contains('show') || !(event.target instanceof Element)) {
        return;
    }

    if (sidebar.contains(event.target) || event.target.closest('[data-action="toggle-sidebar"]')) {
        return;
    }

    closeSidebar();
});

document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab, button));
});

const studentNameElement = document.getElementById('student-name');
const profileNameElement = document.getElementById('account-name');
const profileEmailElement = document.getElementById('account-email');

function setAuthFeedback(message = '') {
    authFeedback.textContent = message;
    authFeedback.hidden = !message;
}

function setAuthNotice(message = '') {
    authNotice.textContent = message;
    authNotice.hidden = !message;
}

function showAuthView(viewName, notice = '') {
    authScreen.hidden = false;
    consentScreen.hidden = true;
    authenticatedApp.hidden = true;
    authScreen.querySelectorAll('.auth-form').forEach(form => {
        form.hidden = form.id !== `${viewName}-form`;
    });
    setAuthFeedback('');
    setAuthNotice(notice);
}

function showConsentScreen() {
    const form = document.getElementById('consent-form');
    form.reset();
    document.getElementById('consent-error').hidden = true;
    document.getElementById('consent-nickname-field').hidden = true;
    document.getElementById('consent-nickname').required = false;
    authScreen.hidden = true;
    authenticatedApp.hidden = true;
    consentScreen.hidden = false;
    document.getElementById('consent-account-use').focus();
}

function validateNickname(value) {
    const nickname = value.trim();
    const privateNames = [
        currentUser?.email,
        currentUser?.email?.split('@')[0],
        currentUser?.user_metadata?.full_name
    ].filter(Boolean).map(name => name.trim().toLowerCase());
    return nickname.length >= 3
        && nickname.length <= 20
        && /^[A-Za-z0-9_ ]+$/.test(nickname)
        && !nickname.includes('@')
        && !/^https?:/i.test(nickname)
        && !privateNames.includes(nickname.toLowerCase());
}

async function signOutFromConsent(message) {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Unable to sign out from the privacy consent screen.');
        document.getElementById('consent-error').textContent =
            'Sign-out could not be completed. Close this page and contact support.';
        document.getElementById('consent-error').hidden = false;
        return;
    }
    showAuthView('login', message);
}

document.getElementById('consent-leaderboard').addEventListener('change', event => {
    const nicknameField = document.getElementById('consent-nickname-field');
    const nicknameInput = document.getElementById('consent-nickname');
    nicknameField.hidden = !event.currentTarget.checked;
    nicknameInput.required = event.currentTarget.checked;
});

document.getElementById('consent-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser || !supabaseClient) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const showOnLeaderboard = document.getElementById('consent-leaderboard').checked;
    const nickname = document.getElementById('consent-nickname').value.trim();
    const errorMessage = document.getElementById('consent-error');
    if (showOnLeaderboard && !validateNickname(nickname)) {
        errorMessage.textContent = 'Choose a nickname with 3–20 letters, numbers, underscores, or spaces. Do not use your real name or email.';
        errorMessage.hidden = false;
        return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    setButtonLoading(submitButton, true, 'Saving your choices…');
    errorMessage.hidden = true;
    try {
        const { error } = await supabaseClient.rpc('save_initial_consents', {
            p_display_name: showOnLeaderboard ? nickname : '',
            p_leaderboard: showOnLeaderboard,
            p_product_updates: document.getElementById('consent-product-updates').checked,
            p_analytics: document.getElementById('consent-analytics').checked,
            p_notice_version: NOTICE_VERSION
        });
        if (error) throw error;
        consentScreen.hidden = true;
        await enterAuthenticatedApp(currentUser);
    } catch (error) {
        console.error('Unable to save initial privacy choices.');
        errorMessage.textContent = 'Your choices could not be saved. Please try again or contact support.';
        errorMessage.hidden = false;
    } finally {
        setButtonLoading(submitButton, false);
    }
});

document.getElementById('decline-consent').addEventListener('click', () => {
    void signOutFromConsent('You were signed out because account use was not accepted.');
});

document.getElementById('underage-signout').addEventListener('click', () => {
    void signOutFromConsent('This site is for users 18 and older.');
});

function setAuthControlsDisabled(disabled) {
    authScreen.querySelectorAll('input,button[type="submit"],button[data-auth-action]').forEach(control => {
        control.disabled = disabled;
    });
}

function friendlyAuthError(error, action) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('invalid login credentials')) return 'That email and password combination was not recognized.';
    if (message.includes('email not confirmed')) return 'Please confirm your email using the link we sent before logging in.';
    if (message.includes('already registered') || message.includes('already been registered')) return 'An account with this email already exists. Try logging in instead.';
    if (message.includes('password should be at least') || message.includes('password is too weak')) return 'Choose a stronger password with at least 8 characters.';
    if (message.includes('invalid email') || (message.includes('email address') && message.includes('invalid'))) return 'Enter a valid email address and try again.';
    if (message.includes('expired') || message.includes('invalid token') || message.includes('otp_expired')) {
        return 'This password reset link is no longer valid. Request a new reset email.';
    }
    if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
        return 'We could not connect. Check your internet connection and try again.';
    }
    if (action === 'google') return 'Google sign-in could not be started. Please try again.';
    if (action === 'reset') return 'Your reset link may have expired. Request a new password reset email.';
    return 'We could not complete that request. Please check your details and try again.';
}

function setButtonLoading(button, loading, label) {
    if (!button.dataset.idleMarkup) {
        button.dataset.idleMarkup = button.innerHTML;
    }
    button.disabled = loading;
    button.textContent = loading ? label : '';
    if (!loading) {
        button.innerHTML = button.dataset.idleMarkup;
    }
}

function authRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
}

function clearPrivateUserState() {
    currentUser = null;
    currentProfile = null;
    progressData = {};
    activityDates = [];
    privacySettingsOperation++;
    pendingUserId = null;
    pendingSessionWork = null;
    consentScreen.hidden = true;
    privacySettingsView.hidden = true;
    studentNameElement.textContent = 'Student';
    profileNameElement.textContent = '';
    profileEmailElement.textContent = '';
    document.getElementById('profile-view').hidden = true;
    renderAvatar(document.querySelector('.account-avatar'), DEFAULT_AVATAR_ID, 'account-avatar-art');
    document.getElementById('profile-form').reset();
    document.getElementById('profile-summary-name').textContent = 'Student';
    document.getElementById('profile-summary-bio').textContent = 'Add a short introduction to your profile.';
    renderAvatar(document.getElementById('profile-avatar'), DEFAULT_AVATAR_ID, 'profile-avatar-art');
    document.getElementById('profile-social-links').replaceChildren();
    document.querySelectorAll('.auth-form').forEach(form => form.reset());
    appErrorElement.hidden = true;
    videoWrapper.replaceChildren();
    instagramPopup.hidden = true;
    updateDashboardPerformance();
}

function displayAuthenticatedUser(user, profile) {
    currentProfile = profile;
    const name = profile?.full_name?.trim() || user.email || 'Student';
    studentNameElement.textContent = name;
    profileNameElement.textContent = name;
    profileEmailElement.textContent = user.email || '';
    updateProfileSummary(profile);
}

async function loadUserProfile(user) {
    const accessedAt = new Date().toISOString();
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url,display_name,show_on_leaderboard,age_confirmed_at,avatar_id')
        .eq('id', user.id)
        .maybeSingle();
    if (error) {
        throw error;
    }

    if (!profile) {
        const name = user.user_metadata?.full_name?.trim() || user.email || 'Student';
        const { data: createdProfile, error: createError } = await supabaseClient
            .from('profiles')
            .insert({ id: user.id, full_name: name, email: user.email || '', last_active_at: accessedAt })
            .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url,display_name,show_on_leaderboard,age_confirmed_at,avatar_id')
            .single();
        if (createError) {
            throw createError;
        }
        return createdProfile;
    }

    const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('profiles')
        .update({ email: user.email || '', last_active_at: accessedAt })
        .eq('id', user.id)
        .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url,display_name,show_on_leaderboard,age_confirmed_at,avatar_id')
        .single();
    if (updateError) throw updateError;
    return updatedProfile;
}

async function loadUserProgress(user) {
    const { data, error } = await supabaseClient
        .from('course_progress')
        .select('course_id,module_index,completed')
        .eq('user_id', user.id);
    if (error) {
        throw error;
    }
    const loadedProgress = {};
    data.forEach(row => {
        if (row.completed === true) {
            loadedProgress[`${row.course_id}_${row.module_index}`] = true;
        }
    });
    return loadedProgress;
}

async function loadLearningActivity(user) {
    const { data, error } = await supabaseClient
        .from('learning_activity')
        .select('activity_date')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: true });
    if (error) {
        throw error;
    }
    return data.map(row => row.activity_date);
}

async function hasCurrentAccountUseConsent() {
    const { data, error } = await supabaseClient
        .from('consent_records')
        .select('id')
        .eq('purpose', 'account_use')
        .eq('granted', true)
        .eq('notice_version', NOTICE_VERSION)
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return Boolean(data);
}

async function saveProfile(event) {
    event.preventDefault();
    if (!currentUser) return;
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const profile = {
        full_name: String(formData.get('full_name')).trim(),
        bio: String(formData.get('bio')).trim(),
        avatar_id: PROFILE_AVATARS.some(avatar => avatar.id === selectedAvatarId)
            ? selectedAvatarId
            : DEFAULT_AVATAR_ID,
        website_url: String(formData.get('website_url')).trim(),
        linkedin_url: String(formData.get('linkedin_url')).trim(),
        github_url: String(formData.get('github_url')).trim(),
        instagram_url: String(formData.get('instagram_url')).trim(),
        updated_at: new Date().toISOString()
    };
    for (const field of ['website_url', 'linkedin_url', 'github_url', 'instagram_url']) {
        if (!profile[field]) continue;
        try {
            const url = new URL(profile[field]);
            if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
                throw new Error('Unsupported link protocol.');
            }
            profile[field] = url.href;
        } catch (error) {
            showAppError('Enter valid website links beginning with https://.');
            form.elements.namedItem(field).focus();
            return;
        }
    }

    const userId = currentUser.id;
    setButtonLoading(button, true, 'Saving profile…');
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .update(profile)
            .eq('id', userId)
            .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url,display_name,show_on_leaderboard,age_confirmed_at,avatar_id')
            .single();
        if (error) throw error;
        if (currentUser?.id !== userId) return;
        displayAuthenticatedUser(currentUser, data);
        populateProfileForm();
        appErrorElement.hidden = true;
    } catch (error) {
        if (currentUser?.id !== userId) return;
        console.error('Unable to update your student profile.');
        showAppError('Your profile could not be saved. Run the latest supabase-schema.sql if the new profile fields are missing, then try again.');
    } finally {
        setButtonLoading(button, false);
    }
}

async function enterAuthenticatedApp(user) {
    if (currentUser?.id === user.id && !authenticatedApp.hidden) {
        return;
    }
    if (pendingUserId === user.id && pendingSessionWork) {
        return pendingSessionWork;
    }

    pendingUserId = user.id;
    const operation = ++sessionOperation;
    currentUser = user;
    authenticatedApp.hidden = true;
    consentScreen.hidden = true;
    authScreen.hidden = false;
    authScreen.querySelectorAll('.auth-form').forEach(form => { form.hidden = true; });
    setAuthFeedback('');
    setAuthNotice('Checking your privacy choices…');

    pendingSessionWork = (async () => {
        let restoreStage = 'consent lookup';
        try {
            if (!await hasCurrentAccountUseConsent()) {
                if (operation === sessionOperation && currentUser?.id === user.id) {
                    showConsentScreen();
                }
                return;
            }

            setAuthNotice('Restoring your student account…');
            const restoreSteps = [
                ['profile', () => loadUserProfile(user)],
                ['course progress', () => loadUserProgress(user)],
                ['learning activity', () => loadLearningActivity(user)]
            ];
            const restoreResults = await Promise.allSettled(restoreSteps.map(([, load]) => load()));
            const failedStep = restoreResults.findIndex(result => result.status === 'rejected');
            if (failedStep !== -1) {
                restoreStage = restoreSteps[failedStep][0];
                throw restoreResults[failedStep].reason;
            }
            const [profile, savedProgress, savedActivity] = restoreResults.map(result => result.value);
            if (operation !== sessionOperation || currentUser?.id !== user.id) {
                return;
            }
            progressData = savedProgress;
            activityDates = savedActivity;
            if (!catalogLoaded) {
                restoreStage = 'course catalog';
                await initializeApp();
            }
            if (operation !== sessionOperation || currentUser?.id !== user.id) {
                return;
            }
            displayAuthenticatedUser(user, profile);
            updateDashboardPerformance();
            setAuthControlsDisabled(false);
            authScreen.hidden = true;
            authenticatedApp.hidden = false;
            showDashboard();
            if (new URLSearchParams(window.location.search).get('view') === 'privacy-settings') {
                showPrivacySettings(false);
            }
            initializeInstagramPopup();
            showLegacyProgressNotice();
        } catch (error) {
            if (operation !== sessionOperation || currentUser?.id !== user.id) {
                return;
            }
            const errorCode = typeof error?.code === 'string' ? error.code : '';
            const errorName = typeof error?.name === 'string' ? error.name : '';
            const errorStatus = Number.isInteger(error?.status) ? error.status : null;
            console.error('Unable to restore the signed-in student session.', {
                stage: restoreStage,
                code: errorCode || 'unknown',
                status: errorStatus ?? 'unknown',
                type: errorName || 'unknown'
            });
            clearPrivateUserState();
            showAuthView('login');
            setAuthControlsDisabled(false);
            if (error?.code === 'PGRST205' || error?.code === '42P01') {
                setAuthFeedback('The student database needs the latest setup. Run the updated supabase-schema.sql in Supabase, then refresh and log in again.');
            } else {
                if (errorName === 'TypeError' && !errorCode) {
                    setAuthFeedback(`We could not connect while checking ${restoreStage}. Check your internet connection and Supabase project URL, then try again.`);
                } else {
                    const diagnostics = [
                        errorCode ? `code ${errorCode}` : '',
                        errorStatus !== null ? `HTTP ${errorStatus}` : '',
                        !errorCode && errorStatus === null && errorName ? `type ${errorName}` : ''
                    ].filter(Boolean).join(', ');
                    const reference = diagnostics ? ` (${diagnostics})` : '';
                    setAuthFeedback(`We could not complete ${restoreStage}${reference}. Check the Supabase schema and permissions for that step, then try again.`);
                }
            }
        } finally {
            if (pendingUserId === user.id) {
                pendingUserId = null;
                pendingSessionWork = null;
            }
        }
    })();
    return pendingSessionWork;
}

function hasLegacyProgress() {
    try {
        return localStorage.getItem(LEGACY_PROGRESS_STORAGE_KEY) !== null;
    } catch {
        console.error('Unable to check for older browser-only progress.');
        return false;
    }
}

function showLegacyProgressNotice() {
    if (!hasLegacyProgress()) return;
    try {
        if (localStorage.getItem(LEGACY_PROGRESS_NOTICE_DISMISSED_KEY) !== 'true') {
            legacyProgressNotice.hidden = false;
        }
    } catch {
        console.error('Unable to check the legacy progress notice preference.');
        legacyProgressNotice.hidden = false;
    }
}

async function handleAuthState(session, eventName = '') {
    if (session?.user) {
        await enterAuthenticatedApp(session.user);
        if (eventName === 'PASSWORD_RECOVERY') {
            showAuthView('reset');
        }
        return;
    }

    sessionOperation++;
    clearPrivateUserState();
    showAuthView('login');
    setAuthControlsDisabled(false);
}

function setFormBusy(form, busy, label) {
    const button = form.querySelector('[type="submit"]');
    setButtonLoading(button, busy, label);
}

function isServiceRoleKey(key) {
    if (key.startsWith('sb_secret_')) {
        return true;
    }
    const payload = key.split('.')[1];
    if (!payload) {
        return false;
    }
    try {
        const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return claims.role === 'service_role';
    } catch {
        return false;
    }
}

function showAuthError(error, action) {
    console.error(`Authentication failed during ${action}.`);
    setAuthFeedback(friendlyAuthError(error, action));
}

function initializeAuth() {
    const secureOrigin = window.location.protocol === 'https:'
        || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    if (!secureOrigin) {
        authConfigMessage.textContent = window.location.protocol === 'file:'
            ? 'This page was opened directly from a file. Start a local web server (for example, VS Code Live Server) and open its localhost URL to sign in.'
            : 'Sign-in is available only over HTTPS, except on localhost. Open the HTTPS site or run it on localhost for development.';
        authConfigMessage.hidden = false;
        setAuthControlsDisabled(true);
        return;
    }
    const configured = SUPABASE_URL.startsWith('https://')
        && !SUPABASE_URL.includes('YOUR_PROJECT_ID')
        && SUPABASE_PUBLISHABLE_KEY.length > 20
        && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_SUPABASE_')
        && !isServiceRoleKey(SUPABASE_PUBLISHABLE_KEY);
    if (!configured) {
        authConfigMessage.textContent = 'Supabase is not configured yet. Add your project URL and publishable (anon) key in script.js to enable student accounts.';
        authConfigMessage.hidden = false;
        authScreen.querySelectorAll('input,button[type="submit"],button[data-auth-action]').forEach(control => {
            control.disabled = true;
        });
        setAuthNotice('Account access will be available after Supabase is configured.');
        return;
    }
    if (!window.supabase?.createClient) {
        authConfigMessage.textContent = 'The sign-in service could not be loaded. Check your internet connection and refresh the page.';
        authConfigMessage.hidden = false;
        setAuthControlsDisabled(true);
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    } catch (error) {
        console.error('Unable to initialize Supabase.');
        authConfigMessage.textContent = 'Supabase settings could not be initialized. Check the project URL and publishable/anon key in script.js.';
        authConfigMessage.hidden = false;
        setAuthControlsDisabled(true);
        return;
    }
    showAuthView('login', 'Checking your student account…');
    setAuthControlsDisabled(true);
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
            return;
        }
        void handleAuthState(session, event);
    });

    void (async () => {
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            const hashParams = new URLSearchParams(window.location.hash.slice(1));
            const callbackDescription = hashParams.get('error_description');
            const callbackAction = hashParams.get('type') === 'recovery' ? 'reset' : 'google';
            if (window.location.hash.includes('error_description')) {
                history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
            }
            await handleAuthState(data.session, '');
            if (callbackDescription) {
                showAuthError(new Error(callbackDescription), callbackAction);
            }
            if (hashParams.get('type') === 'recovery') {
                if (data.session) {
                    showAuthView('reset');
                } else {
                    showAuthView('login', 'That password reset link has expired or was already used. Request a new one to continue.');
                }
            }
        } catch (error) {
            showAuthView('login');
            setAuthControlsDisabled(false);
            const recoveryLink = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
            showAuthError(error, recoveryLink ? 'reset' : 'session');
        }
    })();
}

document.querySelectorAll('[data-auth-view]').forEach(button => {
    button.addEventListener('click', () => showAuthView(button.dataset.authView));
});

document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) return;
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    setAuthFeedback('');
    setFormBusy(form, true, 'Logging in…');
    try {
        const formData = new FormData(form);
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: String(formData.get('email')).trim(),
            password: String(formData.get('password'))
        });
        if (error) throw error;
        form.reset();
        await handleAuthState(data.session);
    } catch (error) {
        showAuthError(error, 'login');
    } finally {
        setButtonLoading(button, false);
    }
});

document.getElementById('signup-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) return;
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const password = String(formData.get('password'));
    if (password !== String(formData.get('confirmPassword'))) {
        setAuthFeedback('The passwords do not match. Check them and try again.');
        return;
    }
    setAuthFeedback('');
    setFormBusy(form, true, 'Creating account…');
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: String(formData.get('email')).trim(),
            password,
            options: {
                data: { full_name: String(formData.get('fullName')).trim() },
                emailRedirectTo: authRedirectUrl()
            }
        });
        if (error) throw error;
        if (data.user && !data.session && data.user.identities?.length === 0) {
            throw new Error('User already registered');
        }
        form.reset();
        if (data.session) {
            await handleAuthState(data.session);
        } else {
            showAuthView('login', 'Account created. Check your email for a confirmation link, then log in.');
        }
    } catch (error) {
        showAuthError(error, 'signup');
    } finally {
        setButtonLoading(button, false);
    }
});

document.querySelectorAll('[data-auth-action="google"]').forEach(button => {
    button.addEventListener('click', async () => {
        if (!supabaseClient) return;
        setAuthFeedback('');
        setButtonLoading(button, true, 'Connecting to Google…');
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: authRedirectUrl() }
            });
            if (error) throw error;
        } catch (error) {
            showAuthError(error, 'google');
            setButtonLoading(button, false);
        }
    });
});

document.getElementById('forgot-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) return;
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const email = String(new FormData(form).get('email')).trim();
    setAuthFeedback('');
    setFormBusy(form, true, 'Sending reset email…');
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: authRedirectUrl()
        });
        if (error) throw error;
        setAuthNotice('If an account exists for that email, a password reset link has been sent.');
    } catch (error) {
        showAuthError(error, 'forgot');
    } finally {
        setButtonLoading(button, false);
    }
});

document.getElementById('reset-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) return;
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const password = String(formData.get('password'));
    if (password !== String(formData.get('confirmPassword'))) {
        setAuthFeedback('The passwords do not match. Check them and try again.');
        return;
    }
    setAuthFeedback('');
    setFormBusy(form, true, 'Updating password…');
    try {
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) throw error;
        form.reset();
        setAuthNotice('Your password has been updated. You are now signed in.');
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        const { data, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        await handleAuthState(data.session);
    } catch (error) {
        showAuthError(error, 'reset');
    } finally {
        setButtonLoading(button, false);
    }
});

document.getElementById('edit-student-name').addEventListener('click', showProfile);
document.getElementById('profile-form').addEventListener('submit', saveProfile);
document.getElementById('cancel-profile-edit').addEventListener('click', populateProfileForm);
document.getElementById('profile-policies-link').addEventListener('click', () => {
    void showPrivacySettings();
});

window.addEventListener('popstate', () => {
    if (window.location.pathname.endsWith('/settings/privacy/')
        || new URLSearchParams(window.location.search).get('view') === 'privacy-settings') {
        void showPrivacySettings(false);
    } else {
        showDashboard();
    }
});

document.getElementById('logout-button').addEventListener('click', async event => {
    const button = event.currentTarget;
    if (!supabaseClient) return;
    setButtonLoading(button, true, 'Logging out…');
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        sessionOperation++;
        clearPrivateUserState();
        showAuthView('login');
    } catch (error) {
        console.error('Unable to log out.');
        showAppError('You could not be logged out. Please try again.');
    } finally {
        setButtonLoading(button, false);
    }
});

async function initializeApp() {
    try {
        const response = await fetch('./courses.json');
        if (!response.ok) {
            throw new Error(`Course data request failed with status ${response.status}.`);
        }

        const courseData = await response.json();
        if (!courseData || typeof courseData !== 'object' || Array.isArray(courseData)) {
            throw new Error('Course data must be a JSON object.');
        }

        courses = courseData;
        catalogLoaded = true;
        updateDashboardPerformance();
    } catch (error) {
        console.error('Unable to load course data.');
        appErrorElement.hidden = false;
        appErrorElement.textContent =
            'Course data could not be loaded. Open this page through a local web server so courses.json can be fetched.';
    }
}

initializeAuth();
initializeSupportOptions();

function initializeInstagramPopup() {
    const now = Date.now();

    try {
        const dismissedUntil = Number(localStorage.getItem(instagramPopupDismissedKey) || 0);
        if (dismissedUntil > now || sessionStorage.getItem('bca2_instagram_popup_shown') === 'true') {
            return;
        }
        sessionStorage.setItem('bca2_instagram_popup_shown', 'true');
    } catch (error) {
        console.error('Unable to read Instagram popup preferences.');
    }

    window.setTimeout(() => {
        instagramPopup.hidden = false;
    }, 4500);
}

document.getElementById('instagram-popup-close').addEventListener('click', () => {
    instagramPopup.hidden = true;
    try {
        localStorage.setItem(instagramPopupDismissedKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch (error) {
        console.error('Unable to save Instagram popup dismissal.');
    }
});
