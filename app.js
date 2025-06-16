document.addEventListener('DOMContentLoaded', async () => {
    await AmoApi.init();
    renderCalendar();
});

// Рендер календаря
async function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Получаем первый день месяца и количество дней
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Очищаем календарь
    calendarEl.innerHTML = '';

    // Заголовки дней недели
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        dayHeader.textContent = day;
        calendarEl.appendChild(dayHeader);
    });

    // Пустые ячейки для дней предыдущего месяца
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarEl.appendChild(emptyDay);
    }

    // Заполняем календарь днями месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.innerHTML = `<div class="day-number">${day}</div>`;

        // Проверяем, есть ли сделки на эту дату
        const deals = await fetchDealsByDate(dateStr);
        if (deals.length > 0) {
            const dealCountEl = document.createElement('div');
            dealCountEl.className = 'deal-count';
            dealCountEl.textContent = deals.length;
            dayEl.appendChild(dealCountEl);
        }

        // Клик по дате — показываем сделки
        dayEl.addEventListener('click', () => showDeals(dateStr, deals));
        calendarEl.appendChild(dayEl);
    }
}

// Получение сделок по дате
async function fetchDealsByDate(date) {
    try {
        const deals = await AmoApi.getLeads({
            filter: {
                custom_fields: {
                    885453: date // Поле с датой (ID: 885453)
                }
            }
        });
        return deals;
    } catch (error) {
        console.error('Ошибка загрузки сделок:', error);
        return [];
    }
}

// Отображение списка сделок
function showDeals(date, deals) {
    const dealsListEl = document.getElementById('deals-list');
    const selectedDateEl = document.getElementById('selected-date');
    const dealsContainerEl = document.getElementById('deals-container');

    selectedDateEl.textContent = date;
    dealsContainerEl.innerHTML = '';

    // Сортировка сделок по ID (новые → старые)
    deals.sort((a, b) => b.id - a.id);

    // Формируем список сделок
    deals.forEach(deal => {
        const deliveryRange = getCustomFieldValue(deal, 892009); // Диапазон доставки
        const exactTime = getCustomFieldValue(deal, 892003);    // К точному времени
        const address = getCustomFieldValue(deal, 887367);      // Адрес

        const dealEl = document.createElement('div');
        dealEl.className = 'deal-item';
        dealEl.innerHTML = `
            <strong>ID: ${deal.id}</strong><br>
            <strong>${deal.name}</strong><br>
            Бюджет: ${deal.price || '—'} ₽<br>
            Диапазон доставки: ${deliveryRange || '—'}<br>
            К точному времени: ${exactTime || '—'}<br>
            Адрес: ${address || '—'}
        `;

        // Клик по сделке — открываем карточку
        dealEl.addEventListener('click', (e) => {
            e.stopPropagation();
            AmoApi.openCard('lead', deal.id);
        });

        dealsContainerEl.appendChild(dealEl);
    });

    dealsListEl.style.display = 'block';
}

// Получение значения кастомного поля
function getCustomFieldValue(deal, fieldId) {
    const field = deal.custom_fields_values?.find(f => f.field_id === fieldId);
    return field?.values?.[0]?.value;
}

// Форматирование даты в YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}