document.addEventListener('DOMContentLoaded', () => {
    const carTableBody = document.getElementById('carTableBody');
    const searchInput = document.getElementById('searchInput');
    const carForm = document.getElementById('carForm');
    const carIdInput = document.getElementById('carId');
    const clearBtn = document.getElementById('clearBtn');
    const sortButtons = document.querySelectorAll('.sort-btn');

    let allCars = [];
    let currentSort = { by: 'car_model', order: 'asc' };

    const fetchCars = async () => {
        const query = searchInput.value;
        const { by, order } = currentSort;
        try {
            allCars = await window.electronAPI.getCars({ q: query, sortBy: by, sortOrder: order });
            renderCars(allCars);
        } catch (error) {
            console.error('Error fetching cars:', error);
        }
    };

    const renderCars = (cars) => {
        carTableBody.innerHTML = '';
        cars.forEach(car => {
            const tr = document.createElement('tr');
            tr.dataset.id = car.id; // 행에 ID를 직접 추가

            if (car.owned && car.owned.toUpperCase() === 'Y') {
                tr.classList.add('owned-car');
            }

            tr.innerHTML = `
                <td>${car.year}</td>
                <td>${car.car_model}</td>
                <td>${car.car_type}</td>
                <td>${car.collect}</td>
                <td>${car.added}</td>
                <td class="owned-cell align-center ${car.owned && car.owned.toUpperCase() === 'Y' ? 'owned-cell-yes' : ''}">${car.owned}</td>
                <td class="align-right">${(car.price || 0).toLocaleString()}</td>
                <td>${car.memo}</td>
            `;
            carTableBody.appendChild(tr);
        });
    };

    searchInput.addEventListener('input', fetchCars);

    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sortBy = button.dataset.sortby;
            if (currentSort.by === sortBy) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.by = sortBy;
                currentSort.order = 'asc';
            }
            sortButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchCars();
        });
    });

    carForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = carIdInput.value;
        const carData = {
            year: document.getElementById('year').value,
            car_model: document.getElementById('car_model').value,
            car_type: document.getElementById('car_type').value,
            collect: document.getElementById('collect').value,
            added: document.getElementById('added').value,
            owned: document.getElementById('owned').value,
            price: document.getElementById('price').value,
            memo: document.getElementById('memo').value,
        };

        try {
            if (id) {
                await window.electronAPI.updateCar({ ...carData, id });
            } else {
                await window.electronAPI.addCar(carData);
            }
            clearForm();
            fetchCars();
        } catch (error) {
            console.error('Error saving car:', error);
        }
    });

    carTableBody.addEventListener('click', async (e) => {
        const target = e.target;

        // Case 1: 'Owned' 셀 클릭 시 상태 토글
        if (target.classList.contains('owned-cell')) {
            const row = target.closest('tr');
            if (!row) return;

            const id = parseInt(row.dataset.id, 10);
            const carToUpdate = allCars.find(car => car.id === id);
            if (!carToUpdate) return;

            const newStatus = carToUpdate.owned === 'Y' ? 'N' : 'Y';

            try {
                await window.electronAPI.updateCar({ id, owned: newStatus });
                // 로컬 데이터 및 UI 즉시 업데이트
                carToUpdate.owned = newStatus;
                target.textContent = newStatus;
                row.classList.toggle('owned-car');
                target.classList.toggle('owned-cell-yes');
            } catch (error) {
                console.error('Error updating owned status:', error);
            }
        } 
        // Case 2: 행의 다른 부분을 클릭 시 폼 채우기
        else {
            const row = target.closest('tr');
            if (!row) return;

            const id = parseInt(row.dataset.id, 10);
            const carToEdit = allCars.find(car => car.id === id);
            
            if (carToEdit) {
                carIdInput.value = carToEdit.id;
                document.getElementById('year').value = carToEdit.year;
                document.getElementById('car_model').value = carToEdit.car_model;
                document.getElementById('car_type').value = carToEdit.car_type;
                document.getElementById('collect').value = carToEdit.collect;
                document.getElementById('added').value = carToEdit.added;
                document.getElementById('owned').value = carToEdit.owned;
                document.getElementById('price').value = carToEdit.price;
                document.getElementById('memo').value = carToEdit.memo;
            }
        }
    });

    const clearForm = () => {
        carForm.reset();
        carIdInput.value = '';
    };

    clearBtn.addEventListener('click', clearForm);
    
    // Client-side validation for memo
    const memoInput = document.getElementById('memo');
    memoInput.addEventListener('input', () => {
        const sanitized = memoInput.value.replace(/[^a-zA-Z0-9 ]/g, '');
        if (memoInput.value !== sanitized) {
            memoInput.value = sanitized;
        }
    });

    // Initial load
    fetchCars();
});