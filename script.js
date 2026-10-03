const SUPABASE_URL = 'https://hbvtywptpmlohglurcht.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_izQRkjrqt2ZgUyIdwl2VIA_dc8Nk72d';
const LEGACY_PROGRESS_STORAGE_KEY = 'bca2_progress';
const gridElement = document.getElementById('subject-grid');
const appErrorElement = document.getElementById('app-error');
const authScreen = document.getElementById('auth-screen');
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
const mainScroll = document.getElementById('mainScroll');
const videoWrapper = document.getElementById('video-embed-wrapper');
const playlistOptions = document.getElementById('playlist-options');
const videoSourceLink = document.getElementById('video-source-link');
const instagramPopup = document.getElementById('instagram-popup');
const instagramPopupDismissedKey = 'bca2_instagram_popup_dismissed_until';
const SUPPORT_UPI_ID = 'aashupratap@ptyes';

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
const semesterYear = {
    sem1: 'year1',
    sem2: 'year1',
    sem3: 'year2',
    sem4: 'year2',
    sem5: 'year3',
    sem6: 'year3'
};
const dashboardTitles = {
    all: 'BCA Courses',
    catalog: 'All Courses',
    year1: 'BCA 1st Year',
    year2: 'BCA 2nd Year',
    year3: 'BCA 3rd Year',
    sem1: 'Semester I',
    sem2: 'Semester II',
    sem3: 'Semester III',
    sem4: 'Semester IV',
    sem5: 'Semester V',
    sem6: 'Semester VI'
};

function renderGrid(filter = 'all') {
    gridElement.replaceChildren();
    const matchingCourses = Object.entries(courses)
        .filter(([, course]) => filter === 'all' || filter === 'catalog'
            || (filter.startsWith('year')
                ? semesterYear[course.sem] === filter
                : course.sem === filter))
        .sort(([, first], [, second]) => first.sem.localeCompare(second.sem)
            || first.title.localeCompare(second.title));

    for (const [courseId, course] of matchingCourses) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.addEventListener('click', () => loadCourse(courseId));

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = course.prototype
            ? `Prototype - ${course.semLabel}`
            : course.semLabel;

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
            : button.dataset.semester === filter || button.dataset.year === filter;
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
        const yearEntries = entries.filter(([, course]) => semesterYear[course.sem] === year);
        const yearProgress = getProgressForCourses(yearEntries);
        document.getElementById(`${year}-course-count`).textContent =
            `${yearEntries.length} courses · Semesters ${year === 'year1' ? 'I & II' : year === 'year2' ? 'III & IV' : 'V & VI'}`;
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
        console.error('Unable to record your learning streak.', error);
        showAppError('Your module was saved, but today’s streak could not be recorded. Run the latest supabase-schema.sql and try again tomorrow.');
    }
}

function openCertificate(courseId) {
    const course = courses[courseId];
    if (!course || !getCompletedCourses().some(([completedId]) => completedId === courseId)) {
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
        updateDashboardPerformance();
        if (completed) {
            void recordLearningActivity(userId);
        }
    } catch (error) {
        if (currentUser?.id !== userId) {
            return;
        }
        console.error('Unable to save course progress to your account.', error);
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
        console.error(`Playlist ${playlistIndex} for course "${courseId}" is missing.`);
        return;
    }

    document.querySelectorAll('.playlist-option').forEach((button, index) => {
        button.classList.toggle('active', index === playlistIndex);
        button.setAttribute('aria-pressed', String(index === playlistIndex));
    });

    document.getElementById('video-provider-name').textContent = playlist.title;
    videoSourceLink.hidden = false;
    const isYouTubeEmbed = playlist.playlistUrl.startsWith('https://www.youtube.com/embed/');
    videoSourceLink.href = isYouTubeEmbed
        ? playlist.playlistUrl.replace('/embed/videoseries?', '/playlist?')
        : playlist.playlistUrl;
    videoSourceLink.textContent = isYouTubeEmbed
        ? 'Open this playlist on YouTube'
        : 'Browse matching playlists on YouTube';

    if (isYouTubeEmbed) {
        const iframe = document.createElement('iframe');
        iframe.src = playlist.playlistUrl;
        iframe.title = `${course.title}: ${playlist.title}`;
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        videoWrapper.replaceChildren(iframe);
    } else {
        const searchNote = document.createElement('p');
        searchNote.className = 'empty-state';
        searchNote.textContent = 'YouTube playlist search results cannot be embedded here. Use the link below to browse matching playlists.';
        videoWrapper.replaceChildren(searchNote);
    }
}

function loadCourse(courseId) {
    const course = courses[courseId];
    if (!course) {
        console.error(`Course "${courseId}" does not exist in courses.json.`);
        return;
    }

    dashboardView.style.display = 'none';
    courseView.style.display = 'block';
    aboutView.style.display = 'none';
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
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    supportView.hidden = true;
    document.getElementById('profile-view').hidden = true;
    dashboardView.style.display = 'block';
    dashboardHome.hidden = filter !== 'all';
    courseBrowser.hidden = filter === 'all';
    videoWrapper.replaceChildren();
    if (filter !== 'all') {
        renderGrid(filter);
    }
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

function showAbout() {
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
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
        const link = document.createElement('a');
        link.className = 'profile-social-link';
        link.href = value;
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
    const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    document.getElementById('profile-avatar').textContent = initials || 'ST';
    const avatar = document.querySelector('.account-avatar');
    avatar.replaceChildren();
    avatar.textContent = initials || 'ST';
    avatar.setAttribute('aria-hidden', 'true');
    renderProfileSocialLinks(profile);
}

function showProfile() {
    if (!currentUser) return;
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
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
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    document.getElementById('profile-view').hidden = true;
    supportView.hidden = false;
    document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

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
        console.error('Unable to generate the UPI QR code.', error);
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
document.getElementById('open-profile').addEventListener('click', showProfile);
document.getElementById('open-support').addEventListener('click', showSupport);
document.getElementById('copy-upi-id').addEventListener('click', async event => {
    const button = event.currentTarget;
    const status = document.getElementById('upi-status');
    try {
        await navigator.clipboard.writeText(SUPPORT_UPI_ID);
        status.textContent = 'UPI ID copied.';
    } catch (error) {
        console.error('Unable to copy the UPI ID.', error);
        status.textContent = 'Could not copy automatically. Please select and copy the UPI ID above.';
    }
    button.blur();
});

document.querySelectorAll('[data-semester]').forEach(button => {
    button.addEventListener('click', () => {
        showDashboard(button.dataset.semester);
        setYearExpanded(semesterYear[button.dataset.semester], true);
    });
});

document.querySelectorAll('[data-year]').forEach(button => {
    button.addEventListener('click', () => {
        const year = button.dataset.year;
        if (button.hasAttribute('aria-controls')) {
            const group = document.getElementById(button.getAttribute('aria-controls'));
            setYearExpanded(year, group.hidden);
        } else {
            setYearExpanded(year, true);
        }
        showDashboard(year);
    });
});

document.getElementById('browse-all-courses').addEventListener('click', () => {
    showDashboard('catalog');
});

function setYearExpanded(year, expanded) {
    const button = document.querySelector(`[data-year="${year}"]`);
    const group = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(expanded));
    group.hidden = !expanded;
}

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
    authenticatedApp.hidden = true;
    authScreen.querySelectorAll('.auth-form').forEach(form => {
        form.hidden = form.id !== `${viewName}-form`;
    });
    setAuthFeedback('');
    setAuthNotice(notice);
}

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
    pendingUserId = null;
    pendingSessionWork = null;
    studentNameElement.textContent = 'Student';
    profileNameElement.textContent = '';
    profileEmailElement.textContent = '';
    document.getElementById('profile-view').hidden = true;
    document.querySelector('.account-avatar').innerHTML = '<i class="fa-regular fa-user"></i>';
    document.getElementById('profile-form').reset();
    document.getElementById('profile-summary-name').textContent = 'Student';
    document.getElementById('profile-summary-bio').textContent = 'Add a short introduction to your profile.';
    document.getElementById('profile-avatar').textContent = 'ST';
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
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url')
        .eq('id', user.id)
        .maybeSingle();
    if (error) {
        throw error;
    }

    if (!profile) {
        const name = user.user_metadata?.full_name?.trim() || user.email || 'Student';
        const { data: createdProfile, error: createError } = await supabaseClient
            .from('profiles')
            .insert({ id: user.id, full_name: name, email: user.email || '' })
            .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url')
            .single();
        if (createError) {
            throw createError;
        }
        return createdProfile;
    }

    if (profile.email !== (user.email || '')) {
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ email: user.email || '', updated_at: new Date().toISOString() })
            .eq('id', user.id);
        if (updateError) {
            throw updateError;
        }
    }
    return profile;
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

function accountRestoreMessage(error) {
    const code = error?.code;
    const message = String(error?.message || '').toLowerCase();
    if (code === 'PGRST205' || code === '42P01' || message.includes('schema cache')) {
        return 'The student database needs the latest setup. Run the updated supabase-schema.sql in the Supabase SQL Editor, then refresh and log in again.';
    }
    if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
        return 'Supabase is blocking access to your student data. Re-run the updated supabase-schema.sql to enable the required access policies.';
    }
    if (message.includes('fetch') || message.includes('network')) {
        return 'We could not connect to your student data. Check your internet connection and try again.';
    }
    return 'We could not load your profile or progress. Check the Supabase tables and connection, then try again.';
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
            if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported link protocol.');
        } catch (error) {
            console.error(`Invalid profile link for ${field}.`, error);
            showAppError('Enter valid website links beginning with https:// or http://.');
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
            .select('full_name,email,bio,website_url,instagram_url,linkedin_url,github_url')
            .single();
        if (error) throw error;
        if (currentUser?.id !== userId) return;
        displayAuthenticatedUser(currentUser, data);
        populateProfileForm();
        appErrorElement.hidden = true;
    } catch (error) {
        if (currentUser?.id !== userId) return;
        console.error('Unable to update your student profile.', error);
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
    authScreen.hidden = false;
    authScreen.querySelectorAll('.auth-form').forEach(form => { form.hidden = true; });
    setAuthFeedback('');
    setAuthNotice('Restoring your student account…');

    pendingSessionWork = (async () => {
        try {
            const [profile, savedProgress, savedActivity] = await Promise.all([
                loadUserProfile(user),
                loadUserProgress(user),
                loadLearningActivity(user)
            ]);
            if (operation !== sessionOperation || currentUser?.id !== user.id) {
                return;
            }
            progressData = savedProgress;
            activityDates = savedActivity;
            if (!catalogLoaded) {
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
            initializeInstagramPopup();
            if (hasLegacyProgress()) {
                showAppError('Your previous browser-only progress is still stored on this device and was not imported. Your account now uses private cloud progress.');
            }
        } catch (error) {
            if (operation !== sessionOperation || currentUser?.id !== user.id) {
                return;
            }
            console.error('Unable to restore your student account.', error);
            clearPrivateUserState();
            showAuthView('login');
            setAuthControlsDisabled(false);
            setAuthFeedback(accountRestoreMessage(error));
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
    } catch (error) {
        console.error('Unable to check for older browser-only progress.', error);
        return false;
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
    console.error(`Authentication failed during ${action}.`, error);
    setAuthFeedback(friendlyAuthError(error, action));
}

function initializeAuth() {
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
        console.error('Unable to initialize Supabase.', error);
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
    showDashboard();
    window.requestAnimationFrame(() => {
        document.getElementById('legal-policies').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
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
        console.error('Unable to log out.', error);
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
        console.error('Unable to load course data.', error);
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
        console.error('Unable to read Instagram popup preferences.', error);
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
        console.error('Unable to save Instagram popup dismissal.', error);
    }
});
