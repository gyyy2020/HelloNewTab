document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const timeElem = document.getElementById('time');
    const dateElem = document.getElementById('date');
    const engineBtn = document.getElementById('engine-btn');
    const engineSelector = document.getElementById('engine-selector');
    const engineIcon = document.getElementById('engine-icon');
    const engineOptions = document.querySelectorAll('.engine-option');
    const addEngineBtn = document.getElementById('add-engine-btn');

    // Create modal for adding search engine
    const modal = document.createElement('div');
    modal.id = 'add-engine-modal';
    modal.className = 'hidden';
    modal.innerHTML = `
        <div class="modal-content">
            <label for="engine-name">Search Engine Name</label>
            <input type="text" id="engine-name" placeholder="e.g. Brave">
            <label for="engine-url">Search URL (use {q} for query)</label>
            <input type="text" id="engine-url" placeholder="https://search.brave.com/search?q={q}">
            <label for="engine-icon-url">Icon URL (optional)</label>
            <input type="text" id="engine-icon-url" placeholder="https://search.brave.com/favicon.ico">
            <div class="modal-actions">
                <button id="engine-save-btn">Add</button>
                <button id="engine-cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // --- Timezone selector logic ---
    const timezoneSelector = document.getElementById('timezone-selector');
    // Populate from localStorage if set
    let selectedTimezone = localStorage.getItem('selectedTimezone') || 'local';
    if (timezoneSelector) {
        timezoneSelector.value = selectedTimezone;
        timezoneSelector.onchange = function() {
            selectedTimezone = this.value;
            localStorage.setItem('selectedTimezone', selectedTimezone);
            updateDateTime();
        };
    }
    function updateDateTime() {
        const now = new Date();
        let timeString, dateString;
        if (selectedTimezone && selectedTimezone !== 'local') {
            try {
                timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: selectedTimezone });
                dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: selectedTimezone });
            } catch (e) {
                // fallback to local
                timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
        } else {
            timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (timeElem) timeElem.textContent = timeString;
        if (dateElem) dateElem.textContent = dateString;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Engine selector popup logic
    engineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        engineSelector.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!engineSelector.classList.contains('hidden')) {
            engineSelector.classList.add('hidden');
        }
    });
    engineSelector.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    // Remove static event listeners for .engine-option
    function handleEngineOptionClick(btn) {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const icon = this.getAttribute('data-icon');
            searchForm.action = action;
            if (icon) {
                engineIcon.src = icon;
            }
            engineSelector.classList.add('hidden');
            searchInput.focus();
        });
    }
    // Attach to initial options
    document.querySelectorAll('.engine-option').forEach(handleEngineOptionClick);

    addEngineBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        modal.classList.remove('hidden');
        document.getElementById('engine-name').value = '';
        document.getElementById('engine-url').value = '';
        document.getElementById('engine-icon-url').value = '';
    });

    document.getElementById('engine-cancel-btn').onclick = function() {
        modal.classList.add('hidden');
    };
    document.getElementById('engine-save-btn').onclick = function() {
        const name = document.getElementById('engine-name').value.trim();
        const url = document.getElementById('engine-url').value.trim();
        let icon = document.getElementById('engine-icon-url').value.trim();
        if (!name || !url) {
            alert('Name and URL are required.');
            return;
        }
        if (!url.includes('{q}')) {
            alert('URL must include {q} as a placeholder for the search term.');
            return;
        }
        const action = url.replace('{q}', '');
        // --- Fix: auto-generate icon if blank ---
        if (!icon) {
            let domain = '';
            try {
                domain = new URL(action).hostname;
            } catch (e) {
                domain = action.replace(/^https?:\/\//, '').split('/')[0];
            }
            if (domain) {
                icon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
            } else {
                icon = 'https://www.google.com/s2/favicons?sz=32&domain=www.google.com';
            }
        }
        const editingEngine = modal.getAttribute('data-editing-engine');
        if (editingEngine) {
            // Edit existing
            const btn = Array.from(document.querySelectorAll('.engine-option')).find(b => b.getAttribute('data-engine') === editingEngine);
            if (btn) {
                btn.setAttribute('data-engine', name.toLowerCase());
                btn.setAttribute('data-action', action);
                btn.setAttribute('data-icon', icon || '');
                btn.innerHTML = (icon ? `<img src="${icon}" alt="${name}" width="24" height="24"> ` : '') + name;
                persistSearchEngines();
            }
            modal.removeAttribute('data-editing-engine');
            this.textContent = 'Add';
            attachEngineContextMenu();
            modal.classList.add('hidden');
            persistSearchEngines();
            return;
        }
        // Otherwise, add new
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'engine-option';
        btn.setAttribute('data-engine', name.toLowerCase());
        btn.setAttribute('data-action', action);
        btn.setAttribute('data-icon', icon || '');
        btn.innerHTML = (icon ? `<img src="${icon}" alt="${name}" width="24" height="24"> ` : '') + name;
        handleEngineOptionClick(btn);
        engineSelector.insertBefore(btn, addEngineBtn);
        persistSearchEngines();
        modal.classList.add('hidden');
        attachEngineContextMenu();
    };

    searchForm.addEventListener('submit', (e) => {
        if (!searchInput.value.trim()) {
            e.preventDefault();
        } else {
            setTimeout(() => { searchInput.value = ''; }, 100);
        }
    });

    // Sidebar: Add category
    const sidebarCategories = document.getElementById('sidebar-categories');
    const addCategoryBtn = document.getElementById('add-category-btn');
    addCategoryBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const name = prompt('Enter new category name:');
        if (name && name.trim()) {
            const cleanName = name.trim();
            const div = document.createElement('div');
            div.className = 'sidebar-category';
            div.textContent = cleanName;
            if (addCategoryBtn.parentNode === sidebarCategories) {
                sidebarCategories.insertBefore(div, addCategoryBtn);
            } else {
                sidebarCategories.appendChild(div);
            }
            // Add shortcuts-list for new category
            const shortcutsArea = document.getElementById('shortcuts-area');
            const newList = document.createElement('div');
            newList.className = 'shortcuts-list';
            newList.setAttribute('data-category', cleanName);
            newList.style.display = 'none';
            // Attach dblclick only to this new list
            newList.addEventListener('dblclick', function() {
                const url = prompt('Enter website URL (e.g. https://example.com):');
                if (url && url.trim()) {
                    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
                    const shortcutName = prompt('Enter shortcut name:', domain);
                    if (shortcutName && shortcutName.trim()) {
                        const a = document.createElement('a');
                        a.className = 'shortcut';
                        a.href = url;
                        a.target = '_blank';
                        a.innerHTML = `<img class="shortcut-icon" src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt="${shortcutName}">${shortcutName}`;
                        newList.appendChild(a);
                    }
                }
            });
            shortcutsArea.appendChild(newList);
            attachCategoryClicks();
            persistCategoriesAndShortcuts();
        }
    });

    // Sidebar: Settings menu (remove old floating menu logic)
    const sidebarGearBtn = document.getElementById('sidebar-gear-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    sidebarGearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        settingsModal.classList.remove('hidden');
    });
    settingsCloseBtn.addEventListener('click', function() {
        settingsModal.classList.add('hidden');
    });
    // Prevent modal from closing when clicking inside modal-content
    const modalContent = settingsModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    // Close modal on outside click (anywhere outside modal-content, robust)
    function closeSettingsOnOutsideClick(e) {
        if (!settingsModal.classList.contains('hidden')) {
            const modalContent = settingsModal.querySelector('.settings-modal-content, .modal-content');
            if (modalContent && !modalContent.contains(e.target)) {
                settingsModal.classList.add('hidden');
            }
        }
    }
    // Remove any previous listeners to avoid duplicates
    document.removeEventListener('mousedown', closeSettingsOnOutsideClick);
    document.removeEventListener('click', closeSettingsOnOutsideClick, true);
    // Add only one listener (mousedown is more robust for overlays)
    document.addEventListener('mousedown', closeSettingsOnOutsideClick);

    // Settings controls: stubs for now
    const openSearchNewTabCheckbox = document.getElementById('open-search-newtab');
    openSearchNewTabCheckbox.onchange = function(e) {
        localStorage.setItem('openSearchNewTab', this.checked);
        searchForm.target = this.checked ? '_blank' : '';
    };
    // On load, apply setting
    if (localStorage.getItem('openSearchNewTab') === 'true') {
        openSearchNewTabCheckbox.checked = true;
        searchForm.target = '_blank';
    } else {
        searchForm.target = '';
    }
    document.getElementById('open-shortcut-newtab').onchange = function(e) {
        localStorage.setItem('openShortcutNewTab', this.checked);
    };
    const searchHeightSlider = document.getElementById('search-height-slider');
    const searchHeightValue = document.getElementById('search-height-value');
    searchHeightSlider.oninput = function() {
        searchHeightValue.textContent = this.value;
        document.getElementById('search-input').style.height = this.value + 'px';
    };
    const iconSizeSlider = document.getElementById('shortcut-icon-size-slider');
    const iconSizeValue = document.getElementById('shortcut-icon-size-value');
    iconSizeSlider.oninput = function() {
        iconSizeValue.textContent = this.value;
        document.querySelectorAll('.shortcut-icon').forEach(img => {
            img.style.width = this.value + 'px';
            img.style.height = this.value + 'px';
        });
    };
    // On load, apply icon size to all shortcut icons
    (function applyInitialIconSize() {
        const size = iconSizeSlider.value;
        document.querySelectorAll('.shortcut-icon').forEach(img => {
            img.style.width = size + 'px';
            img.style.height = size + 'px';
        });
    })();
    const dtFontSizeSlider = document.getElementById('datetime-font-size-slider');
    const dtFontSizeValue = document.getElementById('datetime-font-size-value');
    dtFontSizeSlider.oninput = function() {
        dtFontSizeValue.textContent = this.value;
        document.getElementById('time').style.fontSize = this.value + 'px';
        document.getElementById('date').style.fontSize = (this.value/2) + 'px';
    };
    document.getElementById('set-wallpaper-input').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            document.body.classList.add('custom-wallpaper');
            document.body.style.backgroundImage = `url('${evt.target.result}')`;
            localStorage.setItem('customWallpaper', evt.target.result);
        };
        reader.readAsDataURL(file);
    };
    // On load, apply wallpaper if set
    const savedWallpaper = localStorage.getItem('customWallpaper');
    if (savedWallpaper) {
        document.body.classList.add('custom-wallpaper');
        document.body.style.backgroundImage = `url('${savedWallpaper}')`;
    }
    // Simple mode toggle logic
    const simpleModeToggle = document.getElementById('simple-mode-toggle');
    // On change, update body class and persist
    simpleModeToggle.onchange = function() {
        if (this.checked) {
            document.body.classList.add('simple-mode');
            localStorage.setItem('simpleMode', 'true');
        } else {
            document.body.classList.remove('simple-mode');
            localStorage.setItem('simpleMode', 'false');
        }
    };
    // On load, apply simple mode if set
    if (localStorage.getItem('simpleMode') === 'true') {
        document.body.classList.add('simple-mode');
        simpleModeToggle.checked = true;
    }
    document.getElementById('export-data-btn').onclick = function() {
        // Gather all localStorage data
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        // Create a blob and trigger download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ff-new-tab-backup.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };
    document.getElementById('reset-settings-btn').onclick = function() {
        if (confirm('Reset all settings?')) {
            localStorage.clear();
            location.reload();
        }
    };

    // Add import input to settings modal if not present
    let importInput = document.getElementById('import-data-input');
    if (!importInput) {
        importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.id = 'import-data-input';
        importInput.accept = 'application/json';
        importInput.style.display = 'none';
        document.body.appendChild(importInput);
    }
    document.getElementById('import-data-btn').onclick = function() {
        importInput.click();
    };
    importInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                if (typeof data === 'object' && data !== null) {
                    for (const key in data) {
                        localStorage.setItem(key, data[key]);
                    }
                    alert('Data imported! Reloading...');
                    location.reload();
                } else {
                    alert('Invalid backup file.');
                }
            } catch (err) {
                alert('Failed to import: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    // --- Export/Import categories and shortcuts ---
    function getCategoriesAndShortcuts() {
        // Gather all categories and their shortcuts
        const categories = [];
        document.querySelectorAll('.sidebar-category').forEach(cat => {
            const name = cat.textContent;
            const shortcuts = [];
            document.querySelectorAll('.shortcuts-list').forEach(list => {
                if (list.getAttribute('data-category') === name) {
                    list.querySelectorAll('.shortcut').forEach(a => {
                        shortcuts.push({
                            name: a.textContent,
                            url: a.href
                        });
                    });
                }
            });
            categories.push({ name, shortcuts });
        });
        return categories;
    }
    function setCategoriesAndShortcuts(categories) {
        // Remove all current categories and shortcut lists
        document.querySelectorAll('.sidebar-category').forEach(cat => {
            if (cat.id !== 'add-category-btn') cat.remove();
        });
        document.querySelectorAll('.shortcuts-list').forEach(list => list.remove());
        // Add from data
        const sidebarCategories = document.getElementById('sidebar-categories');
        const addCategoryBtn = document.getElementById('add-category-btn');
        const shortcutsArea = document.getElementById('shortcuts-area');
        categories.forEach(cat => {
            // Add category
            const div = document.createElement('div');
            div.className = 'sidebar-category';
            div.textContent = cat.name;
            // Only insertBefore if addCategoryBtn is still a child of sidebarCategories
            if (addCategoryBtn.parentNode === sidebarCategories) {
                sidebarCategories.insertBefore(div, addCategoryBtn);
            } else {
                sidebarCategories.appendChild(div);
            }
            // Add shortcuts-list
            const newList = document.createElement('div');
            newList.className = 'shortcuts-list';
            newList.setAttribute('data-category', cat.name);
            newList.style.display = 'none';
            cat.shortcuts.forEach(s => {
                const a = document.createElement('a');
                a.className = 'shortcut';
                a.href = s.url;
                a.target = '_blank';
                // If s.name is not the domain, use s.name for label, but always use the domain for the favicon
                let domain = '';
                try {
                    domain = new URL(s.url).hostname;
                } catch (e) {
                    domain = s.url.replace(/^https?:\/\//, '').split('/')[0];
                }
                a.innerHTML = `<img class="shortcut-icon" src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt="${s.name}">${s.name}`;
                newList.appendChild(a);
            });
            shortcutsArea.appendChild(newList);
        });
        attachCategoryClicks();
        attachCategoryContextMenu();
        attachShortcutContextMenu();
        showShortcutsForCategory(categories[0] ? categories[0].name : 'Common');
        // Save to localStorage for persistence
        localStorage.setItem('categoriesAndShortcuts', JSON.stringify(categories));
        persistCategoriesAndShortcuts();
    }
    // On page load, restore categories/shortcuts from localStorage if present
    const savedCats = localStorage.getItem('categoriesAndShortcuts');
    if (savedCats) {
        try {
            const cats = JSON.parse(savedCats);
            if (Array.isArray(cats)) {
                setCategoriesAndShortcuts(cats);
            }
        } catch (e) {}
    }
    // Patch export to include categories/shortcuts
    document.getElementById('export-data-btn').onclick = function() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        data._categoriesAndShortcuts = getCategoriesAndShortcuts();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ff-new-tab-backup.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };
    // Patch import to restore categories/shortcuts
    importInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                if (typeof data === 'object' && data !== null) {
                    for (const key in data) {
                        if (key !== '_categoriesAndShortcuts') {
                            localStorage.setItem(key, data[key]);
                        }
                    }
                    if (Array.isArray(data._categoriesAndShortcuts)) {
                        setCategoriesAndShortcuts(data._categoriesAndShortcuts);
                        // Also persist to localStorage for reload
                        localStorage.setItem('categoriesAndShortcuts', JSON.stringify(data._categoriesAndShortcuts));
                    }
                    alert('Data imported! Reloading...');
                    location.reload();
                } else {
                    alert('Invalid backup file.');
                }
            } catch (err) {
                alert('Failed to import: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    // Sidebar: Switch shortcuts area on category click
    function showShortcutsForCategory(category) {
        document.querySelectorAll('.shortcuts-list').forEach(list => {
            if (list.getAttribute('data-category') === category) {
                list.style.display = '';
            } else {
                list.style.display = 'none';
            }
        });
    }
    // Initial: show Common
    showShortcutsForCategory('Common');
    // Attach click to all sidebar categories
    function attachCategoryClicks() {
        document.querySelectorAll('.sidebar-category').forEach(cat => {
            cat.onclick = function() {
                showShortcutsForCategory(this.textContent);
            };
        });
    }
    attachCategoryClicks();

    // Optional: Add ability to add shortcuts to a category
    // Only allow dblclick to add shortcut if the target is NOT a shortcut or inside a shortcut
    document.querySelectorAll('.shortcuts-list').forEach(list => {
        list.addEventListener('dblclick', function(e) {
            // Prevent if double-click is on a shortcut or its child (icon/text)
            if (e.target.closest('.shortcut')) return;
            const url = prompt('Enter website URL (e.g. https://example.com):');
            if (url && url.trim()) {
                const domain = url.replace(/^https?:\/\//, '').split('/')[0];
                const name = prompt('Enter shortcut name:', domain);
                const a = document.createElement('a');
                a.className = 'shortcut';
                a.href = url;
                a.target = '_blank';
                a.innerHTML = `<img class="shortcut-icon" src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt="${name}">${name}`;
                list.appendChild(a);
                persistCategoriesAndShortcuts();
            }
        });
    });

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Add simple mode gear button to body (top right)
    let simpleModeGearBtn = document.getElementById('simple-mode-gear-btn');
    if (!simpleModeGearBtn) {
        simpleModeGearBtn = document.createElement('button');
        simpleModeGearBtn.id = 'simple-mode-gear-btn';
        simpleModeGearBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 5 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c0 .66.39 1.25 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.66 0 1.25.39 1.51 1H21a2 2 0 0 1 0 4h-.09c-.26 0-.51.1-.7.29-.19.19-.29.44-.29.7z"/></svg>`;
        simpleModeGearBtn.title = 'Settings';
        simpleModeGearBtn.style.display = 'none';
        document.body.appendChild(simpleModeGearBtn);
    }
    // Show/hide gear in simple mode
    function updateSimpleModeGear() {
        // Always hide gear in simple mode
        simpleModeGearBtn.style.display = 'none';
    }
    updateSimpleModeGear();
    // Also update on toggle
    simpleModeToggle.addEventListener('change', updateSimpleModeGear);
    // Clicking the gear opens the settings modal
    simpleModeGearBtn.onclick = function(e) {
        e.stopPropagation();
        document.getElementById('settings-modal').classList.remove('hidden');
    };

    // Sidebar avatar: set profile picture
    const sidebarAvatarImg = document.getElementById('sidebar-avatar');
    let avatarInput = document.getElementById('set-avatar-input');
    if (!avatarInput) {
        avatarInput = document.createElement('input');
        avatarInput.type = 'file';
        avatarInput.id = 'set-avatar-input';
        avatarInput.accept = 'image/*';
        avatarInput.style.display = 'none';
        document.body.appendChild(avatarInput);
    }
    sidebarAvatarImg.addEventListener('click', function() {
        avatarInput.click();
    });
    avatarInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            sidebarAvatarImg.src = evt.target.result;
            localStorage.setItem('profileAvatar', evt.target.result);
            updateDaysLivedShortcut(); // update shortcut icon
        };
        reader.readAsDataURL(file);
    };
    // On load, apply avatar if set
    const savedAvatar = localStorage.getItem('profileAvatar');
    if (savedAvatar) {
        sidebarAvatarImg.src = savedAvatar;
        updateDaysLivedShortcut();
    }

    // --- Custom context menu for sidebar categories ---
    // Create context menu element
    const catContextMenu = document.createElement('div');
    catContextMenu.id = 'cat-context-menu';
    catContextMenu.style.position = 'absolute';
    catContextMenu.style.display = 'none';
    catContextMenu.style.zIndex = 10000;
    catContextMenu.style.background = 'rgba(255,255,255,0.97)'; // lighter background
    catContextMenu.style.borderRadius = '5px';
    catContextMenu.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
    catContextMenu.style.padding = '0.25em 0';
    catContextMenu.style.minWidth = '90px'; // smaller width
    catContextMenu.style.fontSize = '14px'; // smaller font
    catContextMenu.style.border = '1px solid #eee';
    catContextMenu.innerHTML = `
        <div id="cat-edit" style="padding:6px 14px;cursor:pointer;color:#333;">Edit</div>
        <div id="cat-delete" style="padding:6px 14px;cursor:pointer;color:#e55;">Delete</div>
    `;
    document.body.appendChild(catContextMenu);
    let contextTargetCat = null;

    // Hide context menu on click elsewhere
    document.addEventListener('click', () => {
        catContextMenu.style.display = 'none';
        contextTargetCat = null;
    });
    // Prevent default context menu on sidebar categories
    document.addEventListener('contextmenu', function(e) {
        if (e.target.classList.contains('sidebar-category')) {
            e.preventDefault();
        }
    });
    // Attach right-click handler to categories
    function attachCategoryContextMenu() {
        document.querySelectorAll('.sidebar-category').forEach(cat => {
            cat.oncontextmenu = function(e) {
                e.preventDefault();
                contextTargetCat = this;
                catContextMenu.style.display = 'block';
                catContextMenu.style.left = e.pageX + 'px';
                catContextMenu.style.top = e.pageY + 'px';
            };
        });
    }
    // Call after categories are (re)rendered
    attachCategoryContextMenu();
    // Also call in attachCategoryClicks
    const oldAttachCategoryClicks = attachCategoryClicks;
    attachCategoryClicks = function() {
        oldAttachCategoryClicks();
        attachCategoryContextMenu();
    };

    // Edit category name
    document.getElementById('cat-edit').onclick = function(e) {
        if (!contextTargetCat) return;
        catContextMenu.style.display = 'none';
        // Custom modal for renaming
        let renameModal = document.getElementById('cat-rename-modal');
        if (!renameModal) {
            renameModal = document.createElement('div');
            renameModal.id = 'cat-rename-modal';
            renameModal.className = 'modal-overlay';
            renameModal.innerHTML = `
                <div class="modal-content" style="max-width:320px;">
                    <label for="cat-rename-input">Rename category</label>
                    <input type="text" id="cat-rename-input" style="width:100%;margin:8px 0;">
                    <div style="text-align:right;">
                        <button id="cat-rename-ok">OK</button>
                        <button id="cat-rename-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(renameModal);
        }
        const input = renameModal.querySelector('#cat-rename-input');
        input.value = contextTargetCat.textContent;
        renameModal.style.display = 'flex';
        input.focus();
        // OK
        renameModal.querySelector('#cat-rename-ok').onclick = function() {
            const newName = input.value.trim();
            if (newName && newName !== contextTargetCat.textContent) {
                // Update category name
                const oldName = contextTargetCat.textContent;
                contextTargetCat.textContent = newName;
                // Update shortcuts-list data-category
                document.querySelectorAll('.shortcuts-list').forEach(list => {
                    if (list.getAttribute('data-category') === oldName) {
                        list.setAttribute('data-category', newName);
                    }
                });
            }
            renameModal.style.display = 'none';
            persistCategoriesAndShortcuts();
        };
        // Cancel
        renameModal.querySelector('#cat-rename-cancel').onclick = function() {
            renameModal.style.display = 'none';
        };
        // Close on outside click
        renameModal.onclick = function(e) {
            if (e.target === renameModal) renameModal.style.display = 'none';
        };
    };
    // Delete category
    document.getElementById('cat-delete').onclick = function(e) {
        if (!contextTargetCat) return;
        catContextMenu.style.display = 'none';
        const catName = contextTargetCat.textContent;
        // Remove category div
        contextTargetCat.remove();
        // Remove associated shortcuts-list
        document.querySelectorAll('.shortcuts-list').forEach(list => {
            if (list.getAttribute('data-category') === catName) {
                list.remove();
            }
        });
        // Optionally, show another category
        showShortcutsForCategory('Common');
        persistCategoriesAndShortcuts();
    };

    // --- Custom page context menu (not on sidebar) ---
    const pageContextMenu = document.createElement('div');
    pageContextMenu.id = 'page-context-menu';
    pageContextMenu.style.position = 'absolute';
    pageContextMenu.style.display = 'none';
    pageContextMenu.style.zIndex = 10000;
    pageContextMenu.style.background = 'rgba(255,255,255,0.97)';
    pageContextMenu.style.borderRadius = '5px';
    pageContextMenu.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
    pageContextMenu.style.padding = '0.25em 0';
    pageContextMenu.style.minWidth = '140px';
    pageContextMenu.style.fontSize = '14px';
    pageContextMenu.style.border = '1px solid #eee';
    pageContextMenu.innerHTML = `
        <div id="page-add-shortcut" style="padding:6px 14px;cursor:pointer;color:#333;">Add Shortcut</div>
        <div id="page-settings" style="padding:6px 14px;cursor:pointer;color:#333;">Settings</div>
        <div id="page-wallpaper" style="padding:6px 14px;cursor:pointer;color:#333;">Change Wallpaper</div>
    `;
    document.body.appendChild(pageContextMenu);

    // Hide page context menu on click elsewhere
    document.addEventListener('click', () => {
        pageContextMenu.style.display = 'none';
    });

    // Show custom page context menu (not on sidebar)
    document.addEventListener('contextmenu', function(e) {
        // If right-click is on sidebar or its children, do nothing (sidebar menu already handled)
        const sidebar = document.getElementById('sidebar');
        if (sidebar && (e.target === sidebar || sidebar.contains(e.target))) return;
        // If right-click is on a sidebar-category, let the category menu handle it
        if (e.target.classList && e.target.classList.contains('sidebar-category')) return;
        // If right-click is on a shortcut or any of its children, do not show the page context menu
        if (e.target.closest && e.target.closest('.shortcut')) return;
        // If right-click is on the engine selector or its children, do not show the page context menu
        const engineSelector = document.getElementById('engine-selector');
        if (engineSelector && (e.target === engineSelector || engineSelector.contains(e.target))) return;
        // Otherwise, show custom menu
        e.preventDefault();
        pageContextMenu.style.display = 'block';
        pageContextMenu.style.left = e.pageX + 'px';
        pageContextMenu.style.top = e.pageY + 'px';
    });

    // Add Shortcut handler
    document.getElementById('page-add-shortcut').onclick = function() {
        pageContextMenu.style.display = 'none';
        // Create or show floating overlay menu
        let shortcutOverlay = document.getElementById('shortcut-add-overlay');
        if (!shortcutOverlay) {
            shortcutOverlay = document.createElement('div');
            shortcutOverlay.id = 'shortcut-add-overlay';
            shortcutOverlay.style.position = 'fixed';
            shortcutOverlay.style.left = 0;
            shortcutOverlay.style.top = 0;
            shortcutOverlay.style.width = '100vw';
            shortcutOverlay.style.height = '100vh';
            shortcutOverlay.style.background = 'rgba(0,0,0,0.18)';
            shortcutOverlay.style.display = 'flex';
            shortcutOverlay.style.alignItems = 'center';
            shortcutOverlay.style.justifyContent = 'center';
            shortcutOverlay.style.zIndex = 10001;
            shortcutOverlay.innerHTML = `
                <div id="shortcut-add-dialog" style="background:#fff;min-width:240px;max-width:90vw;padding:18px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:sans-serif;">
                    <form id="shortcut-add-form" autocomplete="off">
                        <label for="shortcut-url-input" style="font-size:14px;">URL</label>
                        <input type="text" id="shortcut-url-input" placeholder="https://example.com" style="display:block;width:100%;margin-bottom:10px;padding:5px 0;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">
                        <label for="shortcut-name-input" style="font-size:14px;">Name</label>
                        <input type="text" id="shortcut-name-input" placeholder="(optional)" style="display:block;width:100%;margin-bottom:14px;padding:5px 0;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">
                        <div style="text-align:right;">
                            <button type="submit" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#3a8dde;color:#fff;cursor:pointer;margin-right:8px;">Add</button>
                            <button type="button" id="shortcut-add-cancel" style="padding:5px 18px;fontSize:14px;border-radius:4px;border:none;background:#eee;color:#333;cursor:pointer;">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(shortcutOverlay);
        } else {
            shortcutOverlay.style.display = 'flex';
        }
        // Reset fields
        const urlInput = shortcutOverlay.querySelector('#shortcut-url-input');
        const nameInput = shortcutOverlay.querySelector('#shortcut-name-input');
        urlInput.value = '';
        nameInput.value = '';
        urlInput.focus();
        // Add handler
        shortcutOverlay.querySelector('#shortcut-add-form').onsubmit = function(e) {
            e.preventDefault();
            const url = urlInput.value.trim();
            let name = nameInput.value.trim();
            if (!url) return;
            if (!name) name = url.replace(/^https?:\/\//, '').split('/')[0];
            // Find currently visible shortcuts-list
            const visibleList = Array.from(document.querySelectorAll('.shortcuts-list')).find(list => list.style.display !== 'none');
            if (!visibleList) return;
            const domain = url.replace(/^https?:\/\//, '').split('/')[0];
            const a = document.createElement('a');
            a.className = 'shortcut';
            a.href = url;
            a.target = '_blank';
            a.innerHTML = `<img class="shortcut-icon" src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt="${name}">${name}`;
            visibleList.appendChild(a);
            shortcutOverlay.style.display = 'none';
            attachShortcutContextMenu();
            persistCategoriesAndShortcuts();
        };
        // Cancel handler
        shortcutOverlay.querySelector('#shortcut-add-cancel').onclick = function() {
            shortcutOverlay.style.display = 'none';
        };
        // Close on outside click
        shortcutOverlay.onclick = function(e) {
            if (e.target === shortcutOverlay) shortcutOverlay.style.display = 'none';
        };
    };

    // Settings handler
    document.getElementById('page-settings').onclick = function() {
        pageContextMenu.style.display = 'none';
        document.getElementById('settings-modal').classList.remove('hidden');
    };
    // Wallpaper handler
    document.getElementById('page-wallpaper').onclick = function() {
        pageContextMenu.style.display = 'none';
        // Trigger wallpaper file input
        const wallpaperInput = document.getElementById('set-wallpaper-input');
        if (wallpaperInput) wallpaperInput.click();
    };

    // --- Custom context menu for shortcuts ---
    const shortcutContextMenu = document.createElement('div');
    shortcutContextMenu.id = 'shortcut-context-menu';
    shortcutContextMenu.style.position = 'absolute';
    shortcutContextMenu.style.display = 'none';
    shortcutContextMenu.style.zIndex = 10000;
    shortcutContextMenu.style.background = 'rgba(255,255,255,0.97)';
    shortcutContextMenu.style.borderRadius = '5px';
    shortcutContextMenu.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
    shortcutContextMenu.style.padding = '0.25em 0';
    shortcutContextMenu.style.minWidth = '110px';
    shortcutContextMenu.style.fontSize = '14px';
    shortcutContextMenu.style.border = '1px solid #eee';
    shortcutContextMenu.innerHTML = `
        <div id="shortcut-edit" style="padding:6px 14px;cursor:pointer;color:#333;">Edit</div>
        <div id="shortcut-delete" style="padding:6px 14px;cursor:pointer;color:#e55;">Delete</div>
    `;
    document.body.appendChild(shortcutContextMenu);
    let contextTargetShortcut = null;

    // Hide shortcut context menu on click elsewhere
    document.addEventListener('click', () => {
        shortcutContextMenu.style.display = 'none';
        contextTargetShortcut = null;
    });
    // Prevent default context menu on shortcuts
    document.addEventListener('contextmenu', function(e) {
        if (e.target.classList && e.target.classList.contains('shortcut')) {
            e.preventDefault();
        }
    });
    // Attach right-click handler to shortcuts
    function attachShortcutContextMenu() {
        document.querySelectorAll('.shortcut').forEach(shortcut => {
            shortcut.oncontextmenu = function(e) {
                e.preventDefault();
                contextTargetShortcut = this;
                shortcutContextMenu.style.display = 'block';
                shortcutContextMenu.style.left = e.pageX + 'px';
                shortcutContextMenu.style.top = e.pageY + 'px';
            };
        });
    }
    // Call after shortcuts are (re)rendered
    attachShortcutContextMenu();
    // Patch shortcut creation to always call this
    const oldCreateShortcut = function(a) {
        // ...existing code for shortcut creation...
    };
    // After any shortcut is added, call attachShortcutContextMenu();
    // (Patch all shortcut-adding code below to call it)

    // Edit shortcut
    document.getElementById('shortcut-edit').onclick = function(e) {
        if (!contextTargetShortcut) return;
        shortcutContextMenu.style.display = 'none';
        // Floating modal for editing shortcut
        let shortcutEditOverlay = document.getElementById('shortcut-edit-overlay');
        // Store the shortcut being edited in a local variable
        const editingShortcut = contextTargetShortcut;
        if (!shortcutEditOverlay) {
            shortcutEditOverlay = document.createElement('div');
            shortcutEditOverlay.id = 'shortcut-edit-overlay';
            shortcutEditOverlay.style.position = 'fixed';
            shortcutEditOverlay.style.left = 0;
            shortcutEditOverlay.style.top = 0;
            shortcutEditOverlay.style.width = '100vw';
            shortcutEditOverlay.style.height = '100vh';
            shortcutEditOverlay.style.background = 'rgba(0,0,0,0.18)';
            shortcutEditOverlay.style.display = 'flex';
            shortcutEditOverlay.style.alignItems = 'center';
            shortcutEditOverlay.style.justifyContent = 'center';
            shortcutEditOverlay.style.zIndex = 10001;
            shortcutEditOverlay.innerHTML = `
                <div id="shortcut-edit-dialog" style="background:#fff;min-width:240px;max-width:90vw;padding:18px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:sans-serif;">
                    <form id="shortcut-edit-form" autocomplete="off">
                        <label for="shortcut-edit-url-input" style="font-size:14px;">URL</label>
                        <input type="text" id="shortcut-edit-url-input" style="display:block;width:100%;margin-bottom:10px;padding:5px 0;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">
                        <label for="shortcut-edit-name-input" style="font-size:14px;">Name</label>
                        <input type="text" id="shortcut-edit-name-input" style="display:block;width:100%;margin-bottom:14px;padding:5px 0;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">
                        <div style="text-align:right;">
                            <button type="submit" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#3a8dde;color:#fff;cursor:pointer;margin-right:8px;">Save</button>
                            <button type="button" id="shortcut-edit-cancel" style="padding:5px 18px;fontSize:14px;border-radius:4px;border:none;background:#eee;color:#333;cursor:pointer;">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(shortcutEditOverlay);
        } else {
            shortcutEditOverlay.style.display = 'flex';
        }
        // Set fields
        const urlInput = shortcutEditOverlay.querySelector('#shortcut-edit-url-input');
        const nameInput = shortcutEditOverlay.querySelector('#shortcut-edit-name-input');
        urlInput.value = editingShortcut.href;
        const shortcutName = editingShortcut.textContent;
        nameInput.value = shortcutName;
        urlInput.focus();
        // Save handler
        shortcutEditOverlay.querySelector('#shortcut-edit-form').onsubmit = function(e) {
            e.preventDefault();
            const url = urlInput.value.trim();
            let name = nameInput.value.trim();
            if (!url) return false;
            if (!name) name = url.replace(/^https?:\/\//, '').split('/')[0];
            editingShortcut.href = url;
            // Always extract domain from URL for icon
            let domain = '';
            try {
                domain = new URL(url).hostname;
            } catch (err) {
                domain = url.replace(/^https?:\/\//, '').split('/')[0];
            }
            // Use fallback icon if domain is empty
            const iconUrl = domain ? `https://www.google.com/s2/favicons?sz=32&domain=${domain}` : 'https://www.google.com/s2/favicons?sz=32&domain=www.google.com';
            editingShortcut.innerHTML = `<img class="shortcut-icon" src="${iconUrl}" alt="${name}">${name}`;
            shortcutEditOverlay.style.display = 'none';
            attachShortcutContextMenu();
            persistCategoriesAndShortcuts();
            return false;
        };
        // Cancel handler
        shortcutEditOverlay.querySelector('#shortcut-edit-cancel').onclick = function() {
            shortcutEditOverlay.style.display = 'none';
        };
        // Close on outside click
        shortcutEditOverlay.onclick = function(e) {
            if (e.target === shortcutEditOverlay) shortcutEditOverlay.style.display = 'none';
        };
    };
    // Delete shortcut
    document.getElementById('shortcut-delete').onclick = function(e) {
        if (!contextTargetShortcut) return;
        shortcutContextMenu.style.display = 'none';
        // Handle built-in shortcuts
        if (contextTargetShortcut.classList.contains('days-lived-shortcut')) {
            contextTargetShortcut.remove();
            localStorage.setItem('hideDaysLivedShortcut', 'true');
            return;
        }
        if (contextTargetShortcut.classList.contains('day-week-shortcut')) {
            contextTargetShortcut.remove();
            localStorage.setItem('hideDayWeekShortcut', 'true');
            return;
        }
        // Normal shortcut
        contextTargetShortcut.remove();
        persistCategoriesAndShortcuts();
    };
    // Patch all shortcut-adding code to call attachShortcutContextMenu after adding
    // 1. In dblclick handler for .shortcuts-list
    document.querySelectorAll('.shortcuts-list').forEach(list => {
        list.addEventListener('dblclick', function() {
            const url = prompt('Enter website URL (e.g. https://example.com):');
            if (url && url.trim()) {
                const domain = url.replace(/^https?:\/\//, '').split('/')[0];
                const name = prompt('Enter shortcut name:', domain);
                const a = document.createElement('a');
                a.className = 'shortcut';
                a.href = url;
                a.target = '_blank';
                a.innerHTML = `<img class="shortcut-icon" src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt="${name}">${name}`;
                list.appendChild(a);
                persistCategoriesAndShortcuts();
            }
        });
    });
    // 2. In Add Shortcut overlay modal (page context menu)
    // Find the code that appends shortcut in the Add Shortcut overlay, and after append:
    // visibleList.appendChild(a);
    // Add:
    // attachShortcutContextMenu();
    // Make search icon clickable to submit search
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.style.pointerEvents = 'auto';
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', function(e) {
            e.preventDefault();
            const searchForm = document.getElementById('search-form');
            if (searchForm) searchForm.requestSubmit();
        });
    }

    // --- Shortcut square style toggle ---
    const shortcutSquareToggle = document.getElementById('shortcut-square-toggle');
    function applyShortcutSquareStyle(enabled) {
        document.querySelectorAll('.shortcut').forEach(a => {
            if (enabled) {
                a.classList.add('square');
                // Move text below icon
                const icon = a.querySelector('.shortcut-icon');
                let label = a.querySelector('span.shortcut-label');
                if (!label) {
                    // Wrap text in span
                    const text = a.childNodes[a.childNodes.length-1];
                    if (text && text.nodeType === 3) {
                        label = document.createElement('span');
                        label.className = 'shortcut-label';
                        label.textContent = text.textContent || text.nodeValue;
                        a.removeChild(text);
                        a.appendChild(label);
                    }
                }
            } else {
                a.classList.remove('square');
                // Restore text inline
                const label = a.querySelector('span.shortcut-label');
                if (label) {
                    a.appendChild(document.createTextNode(label.textContent));
                    label.remove();
                }
            }
        });
    }
    // On toggle
    shortcutSquareToggle.addEventListener('change', function() {
        localStorage.setItem('shortcutSquare', this.checked ? 'true' : 'false');
        applyShortcutSquareStyle(this.checked);
    });
    // On load
    if (localStorage.getItem('shortcutSquare') === 'true') {
        shortcutSquareToggle.checked = true;
        applyShortcutSquareStyle(true);
    }
    // Also re-apply after shortcuts are (re)rendered
    const oldAttachShortcutContextMenu = attachShortcutContextMenu;
    attachShortcutContextMenu = function() {
        oldAttachShortcutContextMenu();
        if (shortcutSquareToggle.checked) applyShortcutSquareStyle(true);
    };

    // --- Motto input logic ---
    const mottoInput = document.getElementById('motto-input');
    const mottoContainer = document.getElementById('motto-container');
    if (mottoInput && mottoContainer) {
        // Load saved motto
        const savedMotto = localStorage.getItem('userMotto');
        if (savedMotto !== null) mottoInput.value = savedMotto;
        if (savedMotto && savedMotto.trim()) {
            mottoContainer.textContent = savedMotto;
        }
        mottoInput.addEventListener('input', function() {
            localStorage.setItem('userMotto', this.value);
            mottoContainer.textContent = this.value || 'Empower your day. One tab at a time.';
        });
    }

    // --- Minimal engine option context menu (edit/delete) ---
    const engineContextMenu = document.createElement('div');
    engineContextMenu.id = 'engine-context-menu';
    engineContextMenu.style.position = 'absolute';
    engineContextMenu.style.display = 'none';
    engineContextMenu.style.zIndex = 10001;
    engineContextMenu.style.background = 'rgba(255,255,255,0.97)';
    engineContextMenu.style.borderRadius = '5px';
    engineContextMenu.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
    engineContextMenu.style.padding = '0.25em 0';
    engineContextMenu.style.minWidth = '110px';
    engineContextMenu.style.fontSize = '14px';
    engineContextMenu.style.border = '1px solid #eee';
    engineContextMenu.innerHTML = `
        <div id="engine-edit" style="padding:6px 14px;cursor:pointer;color:#333;">Edit</div>
        <div id="engine-delete" style="padding:6px 14px;cursor:pointer;color:#e55;">Delete</div>
    `;
    document.body.appendChild(engineContextMenu);
    let contextTargetEngineBtn = null;

    // Attach right-click to engine options (not add button)
    function attachEngineContextMenu() {
        document.querySelectorAll('.engine-option').forEach(btn => {
            if (btn.id === 'add-engine-btn') return;
            btn.oncontextmenu = function(e) {
                e.preventDefault();
                contextTargetEngineBtn = this;
                engineContextMenu.style.display = 'block';
                engineContextMenu.style.left = e.pageX + 'px';
                engineContextMenu.style.top = e.pageY + 'px';
            };
        });
    }
    attachEngineContextMenu();
    // Also call after adding new engine
    const oldHandleEngineOptionClick = handleEngineOptionClick;
    handleEngineOptionClick = function(btn) {
        oldHandleEngineOptionClick(btn);
        if (btn.id !== 'add-engine-btn') {
            btn.oncontextmenu = function(e) {
                e.preventDefault();
                contextTargetEngineBtn = this;
                engineContextMenu.style.display = 'block';
                engineContextMenu.style.left = e.pageX + 'px';
                engineContextMenu.style.top = e.pageY + 'px';
            };
        }
    };
    // Hide menu on outside click
    document.addEventListener('mousedown', function(e) {
        if (engineContextMenu.style.display !== 'none' && !engineContextMenu.contains(e.target)) {
            engineContextMenu.style.display = 'none';
            contextTargetEngineBtn = null;
        }
    });
    // Edit engine
    document.getElementById('engine-edit').onclick = function() {
        if (!contextTargetEngineBtn) return;
        engineContextMenu.style.display = 'none';
        modal.classList.remove('hidden');
        document.getElementById('engine-name').value = contextTargetEngineBtn.textContent.trim();
        document.getElementById('engine-url').value = contextTargetEngineBtn.getAttribute('data-action') + '{q}';
        document.getElementById('engine-icon-url').value = contextTargetEngineBtn.getAttribute('data-icon') || '';
        // Mark edit mode
        modal.setAttribute('data-editing-engine', contextTargetEngineBtn.getAttribute('data-engine'));
        document.getElementById('engine-save-btn').textContent = 'Save';
    };
    // Save engine (edit or add)
    const origSaveBtnHandler = document.getElementById('engine-save-btn').onclick;
    document.getElementById('engine-save-btn').onclick = function() {
        const name = document.getElementById('engine-name').value.trim();
        const url = document.getElementById('engine-url').value.trim();
        let icon = document.getElementById('engine-icon-url').value.trim();
        if (!name || !url) {
            alert('Name and URL are required.');
            return;
        }
        if (!url.includes('{q}')) {
            alert('URL must include {q} as a placeholder for the search term.');
            return;
        }
        const action = url.replace('{q}', '');
        // --- Fix: auto-generate icon if blank ---
        if (!icon) {
            let domain = '';
            try {
                domain = new URL(action).hostname;
            } catch (e) {
                domain = action.replace(/^https?:\/\//, '').split('/')[0];
            }
            if (domain) {
                icon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
            } else {
                icon = 'https://www.google.com/s2/favicons?sz=32&domain=www.google.com';
            }
        }
        const editingEngine = modal.getAttribute('data-editing-engine');
        if (editingEngine) {
            // Edit existing
            const btn = Array.from(document.querySelectorAll('.engine-option')).find(b => b.getAttribute('data-engine') === editingEngine);
            if (btn) {
                btn.setAttribute('data-engine', name.toLowerCase());
                btn.setAttribute('data-action', action);
                btn.setAttribute('data-icon', icon || '');
                btn.innerHTML = (icon ? `<img src="${icon}" alt="${name}" width="24" height="24"> ` : '') + name;
                persistSearchEngines();
            }
            modal.removeAttribute('data-editing-engine');
            this.textContent = 'Add';
            attachEngineContextMenu();
            modal.classList.add('hidden');
            persistSearchEngines();
            return;
        }
        // Otherwise, add new
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'engine-option';
        btn.setAttribute('data-engine', name.toLowerCase());
        btn.setAttribute('data-action', action);
        btn.setAttribute('data-icon', icon || '');
        btn.innerHTML = (icon ? `<img src="${icon}" alt="${name}" width="24" height="24"> ` : '') + name;
        handleEngineOptionClick(btn);
        engineSelector.insertBefore(btn, addEngineBtn);
        persistSearchEngines();
        modal.classList.add('hidden');
        attachEngineContextMenu();
    };
    // Delete engine
    document.getElementById('engine-delete').onclick = function() {
        if (!contextTargetEngineBtn) return;
        engineContextMenu.style.display = 'none';
        contextTargetEngineBtn.remove();
        persistSearchEngines();
    };

    // --- Helper to persist categories and shortcuts ---
    function persistCategoriesAndShortcuts() {
        const categories = [];
        document.querySelectorAll('.sidebar-category').forEach(cat => {
            if (cat.id === 'add-category-btn') return;
            const name = cat.textContent;
            const shortcuts = [];
            document.querySelectorAll('.shortcuts-list').forEach(list => {
                if (list.getAttribute('data-category') === name) {
                    list.querySelectorAll('.shortcut').forEach(a => {
                        shortcuts.push({
                            name: a.textContent,
                            url: a.href
                        });
                    });
                }
            });
            categories.push({ name, shortcuts });
        });
        localStorage.setItem('categoriesAndShortcuts', JSON.stringify(categories));
    }
    // --- Helper to persist search engines ---
    function persistSearchEngines() {
        const engines = [];
        document.querySelectorAll('.engine-option').forEach(btn => {
            if (btn.id === 'add-engine-btn') return;
            engines.push({
                name: btn.getAttribute('data-engine'),
                action: btn.getAttribute('data-action'),
                icon: btn.getAttribute('data-icon') || ''
            });
        });
        localStorage.setItem('searchEngines', JSON.stringify(engines));
    }

    // --- Debugging: Clear all data ---
    window.clearAllData = function() {
        localStorage.clear();
        location.reload();
    };

    // --- Restore search engines from localStorage on page load ---
    const savedEngines = localStorage.getItem('searchEngines');
    if (savedEngines) {
        try {
            const engines = JSON.parse(savedEngines);
            if (Array.isArray(engines)) {
                // Remove all current engine-option except add-engine-btn
                document.querySelectorAll('.engine-option').forEach(btn => {
                    if (btn.id !== 'add-engine-btn') btn.remove();
                });
                engines.forEach(engine => {
                    // Always use Google favicon service if icon is missing/invalid
                    let iconUrl = engine.icon;
                    if (!iconUrl || !/^https?:\/\//.test(iconUrl)) {
                        // Try to extract domain from action (search URL minus {q})
                        let domain = '';
                        try {
                            // engine.action is the search URL minus {q}
                            // Try to reconstruct a valid URL for domain extraction
                            let url = engine.action;
                            if (!/^https?:\/\//.test(url)) url = 'https://' + url;
                            domain = new URL(url).hostname;
                        } catch (e) {
                            domain = (engine.action || '').replace(/^https?:\/\//, '').split('/')[0];
                        }
                        if (!domain) domain = 'www.google.com';
                        iconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
                    }
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'engine-option';
                    btn.setAttribute('data-engine', engine.name);
                    btn.setAttribute('data-action', engine.action);
                    btn.setAttribute('data-icon', iconUrl);
                    btn.innerHTML = (iconUrl ? `<img src="${iconUrl}" alt="${engine.name}" width="24" height="24"> ` : '') + engine.name;
                    handleEngineOptionClick(btn);
                    engineSelector.insertBefore(btn, addEngineBtn);
                });
                persistSearchEngines();
            }
        } catch (e) {}
    }

    // --- Drag and drop for all shortcuts (including built-in) ---
    function setupShortcutDragAndDrop() {
        document.querySelectorAll('.shortcuts-list').forEach(list => {
            const shortcuts = Array.from(list.querySelectorAll('.shortcut'));
            shortcuts.forEach(shortcut => {
                shortcut.setAttribute('draggable', 'true');
                shortcut.ondragstart = function(e) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', '');
                    shortcut.classList.add('dragging');
                    window._draggedShortcut = shortcut;
                };
                shortcut.ondragend = function() {
                    shortcut.classList.remove('dragging');
                    window._draggedShortcut = null;
                };
                shortcut.ondragover = function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                };
                shortcut.ondragenter = function(e) {
                    e.preventDefault();
                    shortcut.classList.add('drag-over');
                };
                shortcut.ondragleave = function() {
                    shortcut.classList.remove('drag-over');
                };
                shortcut.ondrop = function(e) {
                    e.preventDefault();
                    shortcut.classList.remove('drag-over');
                    const dragged = window._draggedShortcut;
                    if (dragged && dragged !== shortcut && dragged.parentNode === shortcut.parentNode) {
                        const rect = shortcut.getBoundingClientRect();
                        const offset = e.clientX - rect.left;
                        if (offset < rect.width / 2) {
                            shortcut.parentNode.insertBefore(dragged, shortcut);
                        } else {
                            shortcut.parentNode.insertBefore(dragged, shortcut.nextSibling);
                        }
                        persistCategoriesAndShortcuts();
                        // Re-apply drag-and-drop to update event listeners
                        setupShortcutDragAndDrop();
                    }
                };
            });
        });
    }

    // Call after any shortcut/category update
    const oldPersistCategoriesAndShortcuts3 = persistCategoriesAndShortcuts;
    persistCategoriesAndShortcuts = function() {
        oldPersistCategoriesAndShortcuts3();
        setupShortcutDragAndDrop();
    };
    // Initial enable on page load
    setupShortcutDragAndDrop();

    // --- Built-in shortcut: Days Lived (icon = profile picture) ---
    function getDaysLived(birthdayStr) {
        if (!birthdayStr) return null;
        const start = new Date(birthdayStr);
        if (isNaN(start)) return null;
        const now = new Date();
        const diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    function getProfileAvatarUrl() {
        const savedAvatar = localStorage.getItem('profileAvatar');
        return savedAvatar || 'https://www.gravatar.com/avatar/?d=mp';
    }
    function updateDaysLivedShortcut() {
        if (localStorage.getItem('hideDaysLivedShortcut') === 'true') return;
        const shortcutsArea = document.getElementById('shortcuts-area');
        const list = shortcutsArea && shortcutsArea.querySelector('.shortcuts-list[data-category="Common"]');
        if (!list) return;
        let shortcut = list.querySelector('.shortcut.days-lived-shortcut');
        let birthday = localStorage.getItem('daysLivedBirthday');
        let days = getDaysLived(birthday);
        let label = days !== null ? `Days Lived: ${days}` : 'Set Birthday';
        const avatarUrl = getProfileAvatarUrl();
        if (!shortcut) {
            shortcut = document.createElement('a');
            shortcut.className = 'shortcut days-lived-shortcut';
            shortcut.href = '#';
            shortcut.style.background = '#eaf4fd';
            shortcut.style.color = '#2561a7';
            shortcut.innerHTML = `<img class="shortcut-icon" src="${avatarUrl}" alt="Days Lived" style="background:#fff;">${label}`;
            shortcut.onclick = function(e) {
                e.preventDefault();
                showBirthdayPicker();
            };
            list.insertBefore(shortcut, list.firstChild);
        } else {
            shortcut.innerHTML = `<img class="shortcut-icon" src="${avatarUrl}" alt="Days Lived" style="background:#fff;">${label}`;
        }
    }
    function showBirthdayPicker() {
        let picker = document.getElementById('days-lived-picker');
        if (!picker) {
            picker = document.createElement('div');
            picker.id = 'days-lived-picker';
            picker.style.position = 'fixed';
            picker.style.left = 0;
            picker.style.top = 0;
            picker.style.width = '100vw';
            picker.style.height = '100vh';
            picker.style.background = 'rgba(0,0,0,0.18)';
            picker.style.display = 'flex';
            picker.style.alignItems = 'center';
            picker.style.justifyContent = 'center';
            picker.style.zIndex = 10001;
            picker.innerHTML = `
                <div style="background:#fff;min-width:240px;max-width:90vw;padding:18px 24px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:sans-serif;">
                    <label for="birthday-input" style="font-size:15px;">Select your birthday</label><br>
                    <input type="date" id="birthday-input" style="margin:10px 0 18px 0;font-size:15px;padding:4px 8px;">
                    <div style="text-align:right;">
                        <button id="birthday-ok" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#3a8dde;color:#fff;cursor:pointer;margin-right:8px;">OK</button>
                        <button id="birthday-cancel" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#eee;color:#333;cursor:pointer;">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(picker);
        } else {
            picker.style.display = 'flex';
        }
        const input = picker.querySelector('#birthday-input');
        input.value = localStorage.getItem('daysLivedBirthday') || '';
        input.max = new Date().toISOString().slice(0,10);
        picker.querySelector('#birthday-ok').onclick = function() {
            if (input.value) {
                localStorage.setItem('daysLivedBirthday', input.value);
                updateDaysLivedShortcut();
            }
            picker.style.display = 'none';
        };
        picker.querySelector('#birthday-cancel').onclick = function() {
            picker.style.display = 'none';
        };
        picker.onclick = function(e) {
            if (e.target === picker) picker.style.display = 'none';
        };
        input.focus();
    }
    // Update on load and whenever categories/shortcuts change
    updateDaysLivedShortcut();
    const oldPersistCategoriesAndShortcuts = persistCategoriesAndShortcuts;
    persistCategoriesAndShortcuts = function() {
        oldPersistCategoriesAndShortcuts();
        updateDaysLivedShortcut();
    };

    // Patch avatar change handler to update shortcut icon
    if (avatarInput && sidebarAvatarImg) {
        const origAvatarOnChange = avatarInput.onchange;
        avatarInput.onchange = function(e) {
            if (origAvatarOnChange) origAvatarOnChange.call(this, e);
            updateDaysLivedShortcut();
        };
    }
    // On load, also update shortcut icon
    updateDaysLivedShortcut();

    // --- Built-in shortcut: Day/Week of Year ---
    function getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    function getWeekOfYear(date) {
        // ISO week: weeks start on Monday, week 1 is the week with the first Thursday of the year
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = new Date(target.getFullYear(),0,4);
        const diff = target - firstThursday;
        return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
    }
    function updateDayWeekShortcut() {
        if (localStorage.getItem('hideDayWeekShortcut') === 'true') return;
        const shortcutsArea = document.getElementById('shortcuts-area');
        const list = shortcutsArea && shortcutsArea.querySelector('.shortcuts-list[data-category="Common"]');
        if (!list) return;
        let shortcut = list.querySelector('.shortcut.day-week-shortcut');
        const now = new Date();
        const dayNum = getDayOfYear(now);
        const weekNum = getWeekOfYear(now);
        const label = `Day ${dayNum} · Week ${weekNum}`;
        if (!shortcut) {
            shortcut = document.createElement('a');
            shortcut.className = 'shortcut day-week-shortcut';
            shortcut.href = '#';
            shortcut.style.background = '#f7fbe7';
            shortcut.style.color = '#4b7b1c';
            shortcut.innerHTML = `<img class="shortcut-icon" src="https://cdn-icons-png.flaticon.com/512/2921/2921222.png" alt="Day/Week" style="background:#fff;">${label}`;
            shortcut.onclick = function(e) {
                e.preventDefault();
                showDayWeekInfoModal(dayNum, weekNum);
            };
            // Insert after Days Lived shortcut if present, else at top
            const daysLived = list.querySelector('.shortcut.days-lived-shortcut');
            if (daysLived && daysLived.nextSibling) {
                list.insertBefore(shortcut, daysLived.nextSibling);
            } else {
                list.insertBefore(shortcut, list.firstChild);
            }
        } else {
            shortcut.innerHTML = `<img class="shortcut-icon" src="https://cdn-icons-png.flaticon.com/512/2921/2921222.png" alt="Day/Week" style="background:#fff;">${label}`;
        }
    }
    function showDayWeekInfoModal(dayNum, weekNum) {
        let modal = document.getElementById('day-week-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'day-week-info-modal';
            modal.style.position = 'fixed';
            modal.style.left = 0;
            modal.style.top = 0;
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.18)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = 10001;
            modal.innerHTML = `
                <div style="background:#fff;min-width:240px;max-width:90vw;padding:18px 24px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:sans-serif;">
                    <div style="font-size:1.2em;margin-bottom:10px;">Today is day <b>${dayNum}</b> and week <b>${weekNum}</b> of this year.</div>
                    <div style="font-size:0.98em;color:#666;">• Day number: Jan 1 = 1<br>• Week number: ISO 8601 (weeks start on Monday, week 1 has the first Thursday)</div>
                    <div style="text-align:right;margin-top:18px;">
                        <button id="day-week-info-close" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#eee;color:#333;cursor:pointer;">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('b').textContent = dayNum;
            modal.querySelectorAll('b')[1].textContent = weekNum;
            modal.style.display = 'flex';
        }
        modal.querySelector('#day-week-info-close').onclick = function() {
            modal.style.display = 'none';
        };
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };
    }
    // Update on load and whenever categories/shortcuts change
    updateDayWeekShortcut();
    const oldPersistCategoriesAndShortcuts2 = persistCategoriesAndShortcuts;
    persistCategoriesAndShortcuts = function() {
        oldPersistCategoriesAndShortcuts2();
        updateDayWeekShortcut();
    };
    // Update every day at midnight
    setInterval(updateDayWeekShortcut, 60 * 1000); // check every minute in case of date change

    // --- Weather Widget in #weather-info-container (upper right) ---
    (function setupWeatherWidgetV2() {
        const container = document.getElementById('weather-info-container');
        if (!container) return;
        container.style.cursor = 'pointer';
        container.style.background = '#fff';
        container.style.border = '1px solid #e0e0e0';
        container.style.borderRadius = '8px';
        container.style.padding = '12px 18px 12px 18px';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        container.style.fontSize = '15px';
        container.style.display = 'inline-block';
        container.style.minWidth = '180px';
        container.title = 'Click to set city';

        // Modal for city input
        let weatherModal = document.getElementById('weather-city-modal');
        if (!weatherModal) {
            weatherModal = document.createElement('div');
            weatherModal.id = 'weather-city-modal';
            weatherModal.style.position = 'fixed';
            weatherModal.style.left = 0;
            weatherModal.style.top = 0;
            weatherModal.style.width = '100vw';
            weatherModal.style.height = '100vh';
            weatherModal.style.background = 'rgba(0,0,0,0.18)';
            weatherModal.style.display = 'none';
            weatherModal.style.alignItems = 'center';
            weatherModal.style.justifyContent = 'center';
            weatherModal.style.zIndex = 10011;
            weatherModal.innerHTML = `
                <div style="background:#fff;min-width:240px;max-width:90vw;padding:18px 24px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:sans-serif;">
                    <label for="weather-city-input" style="font-size:15px;">Enter city name</label><br>
                    <input type="text" id="weather-city-input" style="margin:10px 0 18px 0;font-size:15px;padding:4px 8px;width:100%;">
                    <div style="text-align:right;">
                        <button id="weather-city-ok" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#3a8dde;color:#fff;cursor:pointer;margin-right:8px;">OK</button>
                        <button id="weather-city-cancel" style="padding:5px 18px;font-size:14px;border-radius:4px;border:none;background:#eee;color:#333;cursor:pointer;">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(weatherModal);
        }
        function showWeatherModal() {
            const input = weatherModal.querySelector('#weather-city-input');
            input.value = localStorage.getItem('weatherCity') || 'London';
            weatherModal.style.display = 'flex';
            input.focus();
            weatherModal.querySelector('#weather-city-ok').onclick = function() {
                const city = input.value.trim();
                if (city) {
                    localStorage.setItem('weatherCity', city);
                    fetchAndShowWeather();
                }
                weatherModal.style.display = 'none';
            };
            weatherModal.querySelector('#weather-city-cancel').onclick = function() {
                weatherModal.style.display = 'none';
            };
            weatherModal.onclick = function(e) {
                if (e.target === weatherModal) weatherModal.style.display = 'none';
            };
        }
        container.onclick = showWeatherModal;
        // Fetch weather for city, fallback to London
        async function fetchAndShowWeather() {
            const city = localStorage.getItem('weatherCity') || 'London';
            container.innerHTML = `<div style='display:flex;align-items:center;gap:7px;'><svg width="22" height="22" style="vertical-align:middle;opacity:0.7;" viewBox="0 0 24 24"><path fill="#3a8dde" d="M6 19a7 7 0 1 1 12.9-4.1A5 5 0 1 1 18 19H6z"/></svg> <span style='font-weight:500;'>Weather</span></div><div style='margin-top:4px;'>Loading...</div>`;
            // Geocode city to lat/lon
            let lat = 51.5072, lon = -0.1276; // London default
            try {
                const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
                const geoData = await geo.json();
                if (geoData.results && geoData.results[0]) {
                    lat = geoData.results[0].latitude;
                    lon = geoData.results[0].longitude;
                }
            } catch (e) {}
            // Fetch weather
            try {
                const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=3&timezone=auto`);
                const w = await weather.json();
                if (w && w.daily && w.daily.time) {
                    const days = w.daily.time.map((date, i) => {
                        const tmax = w.daily.temperature_2m_max[i];
                        const tmin = w.daily.temperature_2m_min[i];
                        const code = w.daily.weathercode[i];
                        const icon = weatherIcon(code);
                        const label = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : (new Date(date)).toLocaleDateString(undefined, { weekday: 'short' }));
                        return `<div style='display:flex;align-items:center;gap:7px;justify-content:space-between;'><span style='font-size:1.2em;width:1.8em;text-align:center;'>${icon}</span> <span style='font-size:0.98em;width:5.5em;'>${label}</span> <span style='color:#3a8dde;font-size:1em;text-align:right;min-width:56px;display:inline-block;'>${Math.round(tmax)}°/${Math.round(tmin)}°</span></div>`;
                    }).join('');
                    container.innerHTML = `
                    <div style='display:flex;align-items:center;justify-content:space-between;'>
                        <div style='display:flex;align-items:center;gap:7px;'>
                            <svg width="22" height="22" style="vertical-align:middle;opacity:0.7;" viewBox="0 0 24 24"><path fill="#3a8dde" d="M6 19a7 7 0 1 1 12.9-4.1A5 5 0 1 1 18 19H6z"/></svg>
                            <span style='font-weight:500;'>Weather</span>
                        </div>
                        <span style='font-size:0.97em;color:#888;text-align:right;min-width:56px;display:inline-block;'>${city}</span>
                    </div>
                    <div style='margin-top:4px;'>${days}</div>
                `;
                } else {
                    container.innerHTML = `<div style='display:flex;align-items:center;justify-content:space-between;'><div style='display:flex;align-items:center;gap:7px;'><svg width="22" height="22" style="vertical-align:middle;opacity:0.7;" viewBox="0 0 24 24"><path fill="#3a8dde" d="M6 19a7 7 0 1 1 12.9-4.1A5 5 0 1 1 18 19H6z"/></svg> <span style='font-weight:500;'>Weather</span></div><span style='font-size:0.97em;color:#888;text-align:right;min-width:56px;display:inline-block;'>${city}</span></div><div style='margin-top:4px;'>Weather unavailable</div>`;
                }
            } catch (e) {
                container.innerHTML = `<div style='display:flex;align-items:center;justify-content:space-between;'><div style='display:flex;align-items:center;gap:7px;'><svg width="22" height="22" style="vertical-align:middle;opacity:0.7;" viewBox="0 0 24 24"><path fill="#3a8dde" d="M6 19a7 7 0 1 1 12.9-4.1A5 5 0 1 1 18 19H6z"/></svg> <span style='font-weight:500;'>Weather</span></div><span style='font-size:0.97em;color:#888;text-align:right;min-width:56px;display:inline-block;'>${city}</span></div><div style='margin-top:4px;'>Weather unavailable</div>`;
            }
        }
        // Weather code to emoji/icon
        function weatherIcon(code) {
            // Open-Meteo weather codes: https://open-meteo.com/en/docs#api_form
            if (code === 0) return '☀️'; // Clear
            if (code === 1 || code === 2) return '🌤️'; // Mainly clear/partly cloudy
            if (code === 3) return '☁️'; // Overcast
            if (code >= 45 && code <= 48) return '🌫️'; // Fog
            if (code >= 51 && code <= 67) return '🌦️'; // Drizzle
            if (code >= 71 && code <= 77) return '❄️'; // Snow
            if (code >= 80 && code <= 82) return '🌧️'; // Rain showers
            if (code >= 95 && code <= 99) return '⛈️'; // Thunderstorm
            return '🌡️';
        }
        fetchAndShowWeather();
        // Optionally, refresh every 30min
        setInterval(fetchAndShowWeather, 30*60*1000);
    })();

    // --- Ensure shortcut context menu is attached to built-in shortcuts ---
    function attachContextMenuToBuiltInShortcuts() {
        // Days Lived shortcut
        const daysLivedShortcut = document.querySelector('.shortcut.days-lived-shortcut');
        if (daysLivedShortcut) {
            daysLivedShortcut.oncontextmenu = function(e) {
                e.preventDefault();
                contextTargetShortcut = this;
                shortcutContextMenu.style.display = 'block';
                shortcutContextMenu.style.left = e.pageX + 'px';
                shortcutContextMenu.style.top = e.pageY + 'px';
            };
        }
        // Day/Week of Year shortcut
        const dayWeekShortcut = document.querySelector('.shortcut.day-week-shortcut');
        if (dayWeekShortcut) {
            dayWeekShortcut.oncontextmenu = function(e) {
                e.preventDefault();
                contextTargetShortcut = this;
                shortcutContextMenu.style.display = 'block';
                shortcutContextMenu.style.left = e.pageX + 'px';
                shortcutContextMenu.style.top = e.pageY + 'px';
            };
        }
    }
    // Patch attachShortcutContextMenu to always call this
    const prevAttachShortcutContextMenu = attachShortcutContextMenu;
    attachShortcutContextMenu = function() {
        prevAttachShortcutContextMenu();
        attachContextMenuToBuiltInShortcuts();
    };
    // Call once on load
    attachContextMenuToBuiltInShortcuts();
});
