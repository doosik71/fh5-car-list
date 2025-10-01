document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const tabBar = document.getElementById('tab-bar');
    const addTabBtn = document.getElementById('add-tab-btn');
    const tabContents = document.getElementById('tab-contents');

    // --- State Management ---
    let tabs = [];
    let activeTabId = null;
    let nextTabId = 1;
    let allCars = []; // Single source of truth for car data

    // --- Tab Content HTML Template ---
    const createTabContentHTML = (tabId) => `
        <div class="tab-content" id="tab-content-${tabId}" data-tab-id="${tabId}">
            <div class="container">
                <div class="sticky-header">
                    <div class="form-container">
                        <form class="car-form" id="carForm-${tabId}">
                            <input type="hidden" id="carId-${tabId}">
                            <div class="form-grid">
                                <input type="number" id="year-${tabId}" placeholder="Year" readonly>
                                <input type="text" id="car_model-${tabId}" placeholder="Car Model" required readonly>
                                <input type="text" id="car_type-${tabId}" placeholder="Car Type" readonly>
                                <input type="text" id="collect-${tabId}" placeholder="Collect" readonly>
                                <input type="text" id="added-${tabId}" placeholder="Added" readonly>
                            </div>
                            <div class="form-last-row">
                                <select id="owned-${tabId}">
                                    <option value="N">Owned: No</option>
                                    <option value="Y">Owned: Yes</option>
                                </select>
                                <input type="number" id="price-${tabId}" placeholder="Price">
                                <input type="text" id="memo-${tabId}" placeholder="Memo (Alphanumeric and spaces only)">
                                <button type="submit">Save</button>
                                <button type="button" class="clear-btn">Clear</button>
                            </div>
                        </form>
                    </div>
                    <div class="controls">
                        <div class="search-wrapper">
                            <input type="text" class="searchInput" placeholder="Search cars...">
                            <button class="clear-search-btn hidden">&times;</button>
                        </div>
                        <div class="sort-buttons">
                            <span>Sort:</span>
                            <button class="sort-btn" data-sortby="year">Year</button>
                            <button class="sort-btn" data-sortby="car_model">Model</button>
                            <button class="sort-btn" data-sortby="car_type">Type</button>
                            <button class="sort-btn" data-sortby="owned">Owned</button>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="car-table" id="carTable-${tabId}">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Car Model</th>
                                <th>Car Type</th>
                                <th>Collect</th>
                                <th>Added</th>
                                <th class="align-center">Owned</th>
                                <th class="align-right">Price</th>
                                <th>Memo</th>
                            </tr>
                        </thead>
                        <tbody class="carTableBody">
                            <!-- Car data will be inserted here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // --- Core Functions ---

    const getTabState = (tabId) => tabs.find(t => t.id === tabId);
    const getActiveTabState = () => getTabState(activeTabId);

    const render = () => {
        renderTabs();
        renderActiveTabContent();
    };

    const renderTabs = () => {
        tabBar.querySelectorAll('.tab').forEach(t => t.remove());
        tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = 'tab';
            tabEl.dataset.tabId = tab.id;
            tabEl.draggable = true;
            if (tab.id === activeTabId) {
                tabEl.classList.add('active');
            }

            const tabNameEl = document.createElement('span');
            tabNameEl.className = 'tab-name';
            tabNameEl.textContent = tab.name;
            tabEl.appendChild(tabNameEl);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-tab-btn';
            closeBtn.innerHTML = '&times;';
            if (tabs.length <= 1) {
                closeBtn.classList.add('hidden');
            }
            tabEl.appendChild(closeBtn);

            tabBar.insertBefore(tabEl, addTabBtn);
        });
    };

    const renderActiveTabContent = () => {
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        const activeContent = document.getElementById(`tab-content-${activeTabId}`);
        if (activeContent) {
            activeContent.classList.add('active');
            renderTableForTab(getActiveTabState());
        }
    };

    const renderTableForTab = (tabState) => {
        const tableBody = document.querySelector(`#tab-content-${tabState.id} .carTableBody`);
        if (!tableBody) return;

        let carsToRender = [...allCars];

        // 1. Filter
        if (tabState.searchTerm) {
            const searchTerms = tabState.searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 0);
            carsToRender = carsToRender.filter(car => {
                const carValues = Object.values(car).map(val => String(val).toLowerCase());
                return searchTerms.every(term =>
                    carValues.some(carVal => carVal.includes(term))
                );
            });
        }

        // 2. Sort
        const { sortBy, sortOrder } = tabState.sort;
        if (sortBy) {
            carsToRender.sort((a, b) => {
                const valA = a[sortBy];
                const valB = b[sortBy];
                let comparison = 0;
                if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
                return sortOrder === 'desc' ? comparison * -1 : comparison;
            });
        }

        // 3. Render
        tableBody.innerHTML = '';
        carsToRender.forEach(car => {
            const tr = document.createElement('tr');
            tr.dataset.id = car.id;
            if (car.owned && car.owned.toUpperCase() === 'Y') {
                tr.classList.add('owned-car');
            }
            tr.innerHTML = `
                <td>${car.year || ''}</td>
                <td>${car.car_model || ''}</td>
                <td>${car.car_type || ''}</td>
                <td>${car.collect || ''}</td>
                <td>${car.added || ''}</td>
                <td class="owned-cell align-center ${car.owned && car.owned.toUpperCase() === 'Y' ? 'owned-cell-yes' : ''}">${car.owned}</td>
                <td class="align-right">${(car.price || 0).toLocaleString()}</td>
                <td>${car.memo || ''}</td>
            `;
            tableBody.appendChild(tr);
        });
    };

    // --- Event Handlers ---

    const addTab = () => {
        const newTabId = nextTabId++;
        const newTabState = {
            id: newTabId,
            name: `List ${newTabId}`,
            searchTerm: '',
            sort: { by: 'car_model', order: 'asc' }
        };
        tabs.push(newTabState);
        activeTabId = newTabId;

        const contentHTML = createTabContentHTML(newTabId);
        tabContents.insertAdjacentHTML('beforeend', contentHTML);
        
        render();
        addEventListenersForTab(newTabId);
    };

    const switchTab = (tabId) => {
        if (tabId === activeTabId) return;
        activeTabId = tabId;
        render();
    };

    const closeTab = (tabId) => {
        if (tabs.length <= 1) return;

        const tabIndex = tabs.findIndex(t => t.id === tabId);
        tabs.splice(tabIndex, 1);

        document.getElementById(`tab-content-${tabId}`).remove();

        if (activeTabId === tabId) {
            activeTabId = tabs[tabIndex] ? tabs[tabIndex].id : tabs[tabIndex - 1].id;
        }

        render();
    };

    const handleSearchInput = (e) => {
        const tabState = getActiveTabState();
        if (!tabState) return;

        const searchInput = e.target;
        const clearBtn = searchInput.nextElementSibling; // The clear button

        tabState.searchTerm = searchInput.value;
        tabState.name = searchInput.value.trim() === '' ? `List ${tabState.id}` : searchInput.value.trim();

        // Show/hide clear button
        if (searchInput.value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }

        renderTabs();
        renderTableForTab(tabState);
    };

    const handleSortClick = (e) => {
        const tabState = getActiveTabState();
        if (!tabState) return;

        const sortBy = e.target.dataset.sortby;
        if (tabState.sort.by === sortBy) {
            tabState.sort.order = tabState.sort.order === 'asc' ? 'desc' : 'asc';
        } else {
            tabState.sort.by = sortBy;
            tabState.sort.order = 'asc';
        }
        
        renderTableForTab(tabState);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const tabId = parseInt(e.target.closest('.tab-content').dataset.tabId, 10);
        const id = document.getElementById(`carId-${tabId}`).value;
        const carData = {
            year: document.getElementById(`year-${tabId}`).value,
            car_model: document.getElementById(`car_model-${tabId}`).value,
            car_type: document.getElementById(`car_type-${tabId}`).value,
            collect: document.getElementById(`collect-${tabId}`).value,
            added: document.getElementById(`added-${tabId}`).value,
            owned: document.getElementById(`owned-${tabId}`).value,
            price: document.getElementById(`price-${tabId}`).value,
            memo: document.getElementById(`memo-${tabId}`).value,
        };

        try {
            if (id) {
                await window.electronAPI.updateCar({ ...carData, id });
            } else {
                await window.electronAPI.addCar(carData);
            }
            clearForm(tabId);
            await fetchAllCars(); // Refetch all data
            render(); // Re-render all tabs
        } catch (error) {
            console.error('Error saving car:', error);
        }
    };

    const handleTableClick = async (e, tabId) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        const carId = parseInt(row.dataset.id, 10);
        const car = allCars.find(c => c.id === carId);
        if (!car) return;

        if (target.classList.contains('owned-cell')) {
            const newStatus = car.owned === 'Y' ? 'N' : 'Y';
            try {
                await window.electronAPI.updateCar({ id: carId, owned: newStatus });
                car.owned = newStatus; // Update the central data
                render(); // Re-render to reflect change everywhere
            } catch (error) {
                console.error('Error updating owned status:', error);
            }
        } else {
            // Populate form for editing
            const currentSelected = document.querySelector(`#tab-content-${tabId} .selected-row`);
            if (currentSelected) currentSelected.classList.remove('selected-row');
            row.classList.add('selected-row');

            document.getElementById(`carId-${tabId}`).value = car.id;
            document.getElementById(`year-${tabId}`).value = car.year;
            document.getElementById(`car_model-${tabId}`).value = car.car_model;
            document.getElementById(`car_type-${tabId}`).value = car.car_type;
            document.getElementById(`collect-${tabId}`).value = car.collect;
            document.getElementById(`added-${tabId}`).value = car.added;
            document.getElementById(`owned-${tabId}`).value = car.owned;
            document.getElementById(`price-${tabId}`).value = car.price;
            document.getElementById(`memo-${tabId}`).value = car.memo;
        }
    };

    const clearForm = (tabId) => {
        document.getElementById(`carForm-${tabId}`).reset();
        document.getElementById(`carId-${tabId}`).value = '';
        const currentSelected = document.querySelector(`#tab-content-${tabId} .selected-row`);
        if (currentSelected) currentSelected.classList.remove('selected-row');
    };

    // --- Event Listener Setup ---

    addTabBtn.addEventListener('click', addTab);

    tabBar.addEventListener('click', (e) => {
        const tabEl = e.target.closest('.tab');
        if (tabEl) {
            const tabId = parseInt(tabEl.dataset.tabId, 10);
            if (e.target.classList.contains('close-tab-btn')) {
                closeTab(tabId);
            } else {
                switchTab(tabId);
            }
        }
    });

    function addEventListenersForTab(tabId) {
        const content = document.getElementById(`tab-content-${tabId}`);
        const searchInput = content.querySelector('.searchInput');
        const clearSearchBtn = content.querySelector('.clear-search-btn');

        searchInput.addEventListener('input', handleSearchInput);

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            // Manually trigger input event to reuse the logic in handleSearchInput
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            searchInput.dispatchEvent(inputEvent);
        });

        content.querySelectorAll('.sort-btn').forEach(btn => btn.addEventListener('click', handleSortClick));
        content.querySelector('.car-form').addEventListener('submit', handleFormSubmit);
        content.querySelector('.clear-btn').addEventListener('click', () => clearForm(tabId));
        content.querySelector('.carTableBody').addEventListener('click', (e) => handleTableClick(e, tabId));
    }
    
    // --- Drag and Drop for Tabs ---
    let draggedTab = null;

    tabBar.addEventListener('dragstart', (e) => {
        draggedTab = e.target.closest('.tab');
        if (draggedTab) {
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => {
                draggedTab.style.opacity = '0.5';
            }, 0);
        }
    });

    tabBar.addEventListener('dragend', (e) => {
        if (draggedTab) {
            draggedTab.style.opacity = '';
            draggedTab = null;
        }
    });

    tabBar.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetTab = e.target.closest('.tab');
        if (targetTab && draggedTab && targetTab !== draggedTab) {
            const rect = targetTab.getBoundingClientRect();
            const isAfter = e.clientX > rect.left + rect.width / 2;
            if (isAfter) {
                targetTab.parentNode.insertBefore(draggedTab, targetTab.nextSibling);
            } else {
                targetTab.parentNode.insertBefore(draggedTab, targetTab);
            }
        }
    });

    tabBar.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedTab) {
            const newTabElements = [...tabBar.querySelectorAll('.tab')];
            const newTabsOrder = newTabElements.map(t => tabs.find(tab => tab.id === parseInt(t.dataset.tabId)));
            tabs = newTabsOrder;
            renderTabs();
        }
    });

    // --- Initial Load ---
    const fetchAllCars = async () => {
        try {
            allCars = await window.electronAPI.getCars({}); // Fetch all cars without filters
        } catch (error) {
            console.error('Failed to fetch initial car data:', error);
        }
    };

    const initialize = async () => {
        await fetchAllCars();
        addTab(); // Add the first tab
    };

    initialize();
});
