const progressStorageKey = 'bca2_progress';
const gridElement = document.getElementById('subject-grid');
const appErrorElement = document.getElementById('app-error');
const dashboardView = document.getElementById('dashboard-view');
const courseView = document.getElementById('course-view');
const aboutView = document.getElementById('about-view');
const mainScroll = document.getElementById('mainScroll');
const videoWrapper = document.getElementById('video-embed-wrapper');
const playlistOptions = document.getElementById('playlist-options');
const videoSourceLink = document.getElementById('video-source-link');
const instagramPopup = document.getElementById('instagram-popup');
const instagramPopupDismissedKey = 'bca2_instagram_popup_dismissed_until';

let courses = {};
let progressData = {};

try {
    progressData = JSON.parse(localStorage.getItem(progressStorageKey) || '{}');
    if (!progressData || typeof progressData !== 'object' || Array.isArray(progressData)) {
        progressData = {};
    }
} catch (error) {
    console.error('Unable to read saved course progress.', error);
}

function renderGrid(filterSemester = 'all') {
    gridElement.replaceChildren();
    const matchingCourses = Object.entries(courses).filter(([, course]) =>
        filterSemester === 'all' || course.sem === filterSemester
    );

    for (const [courseId, course] of matchingCourses) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.addEventListener('click', () => loadCourse(courseId));

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = course.semLabel;

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

    document.getElementById('dashboard-title').textContent =
        filterSemester === 'all'
            ? 'All Subjects'
            : filterSemester === 'sem3' ? 'Semester III' : 'Semester IV';

    document.querySelectorAll('.nav-btn').forEach(button => {
        const isSelected = filterSemester === 'all'
            ? button.dataset.action === 'dashboard'
            : button.dataset.semester === filterSemester;
        button.classList.toggle('active', isSelected);
    });
}

function saveProgress() {
    try {
        localStorage.setItem(progressStorageKey, JSON.stringify(progressData));
    } catch (error) {
        console.error('Unable to save course progress.', error);
        appErrorElement.hidden = false;
        appErrorElement.textContent = 'Your progress could not be saved in this browser.';
    }
}

function renderModules(courseId, modules) {
    const listContainer = document.getElementById('module-list-container');
    listContainer.replaceChildren();

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
            progressData[stateKey] = checkbox.checked;
            item.classList.toggle('completed', checkbox.checked);
            saveProgress();
        });
        checkboxWrapper.append(checkbox);

        const text = document.createElement('div');
        text.className = 'module-text';
        const title = document.createElement('h4');
        title.textContent = module.title;
        const description = document.createElement('p');
        description.textContent = module.desc;
        text.append(title, description);

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
    videoSourceLink.href = playlist.playlistUrl.replace('/embed/videoseries?', '/playlist?');

    const iframe = document.createElement('iframe');
    iframe.src = playlist.playlistUrl;
    iframe.title = `${course.title}: ${playlist.title}`;
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    videoWrapper.replaceChildren(iframe);
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
    mainScroll.scrollTo(0, 0);

    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-desc').textContent = course.desc;
    document.getElementById('book-title').textContent = course.notesName;

    renderModules(courseId, course.modules);
    playlistOptions.replaceChildren();
    course.videos.forEach((playlist, index) => {
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
    if (course.videos.length > 0) {
        loadPlaylist(courseId, 0);
    } else {
        document.getElementById('video-provider-name').textContent = 'No course playlists available yet';
        videoSourceLink.removeAttribute('href');
        videoWrapper.replaceChildren();
    }

    document.getElementById('book-link').href = course.notesLink;
    document.getElementById('mock-link').href = course.mockLink;
    const firstTab = document.querySelector('.tab-btn[data-tab]');
    switchTab(firstTab.dataset.tab, firstTab);
    closeSidebar();
}

function showDashboard(filterSemester = 'all') {
    courseView.style.display = 'none';
    aboutView.style.display = 'none';
    dashboardView.style.display = 'block';
    videoWrapper.replaceChildren();
    renderGrid(filterSemester);
    mainScroll.scrollTo(0, 0);
    closeSidebar();
}

function showAbout() {
    dashboardView.style.display = 'none';
    courseView.style.display = 'none';
    aboutView.style.display = 'block';
    videoWrapper.replaceChildren();
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.action === 'about');
    });
    mainScroll.scrollTo(0, 0);
    closeSidebar();
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

document.querySelectorAll('[data-semester]').forEach(button => {
    button.addEventListener('click', () => {
        showDashboard(button.dataset.semester);
        if (window.innerWidth <= 900) {
            closeSidebar();
        }
    });
});

document.querySelector('[data-action="toggle-sidebar"]').addEventListener('click', toggleSidebar);

document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab, button));
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
        renderGrid();
    } catch (error) {
        console.error('Unable to load course data.', error);
        appErrorElement.hidden = false;
        appErrorElement.textContent =
            'Course data could not be loaded. Open this page through a local web server so courses.json can be fetched.';
    }
}

initializeApp();

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

initializeInstagramPopup();
