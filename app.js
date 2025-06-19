document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Проверяем, загружен ли виджет в iframe AmoCRM
        if (window === window.top) {
            window.location.href = 'https://www.amocrm.ru';
            return;
        }

        // Инициализация AmoCRM API
        await initializeAmoAPI();
        
        // Инициализация календаря
        initCalendar();
        
        // Скрываем индикатор загрузки
        hideLoading();
        
        // Отправляем начальный размер iframe
        updateIframeSize();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Произошла ошибка при загрузке виджета. Пожалуйста, обновите страницу.');
    }
});

// Глобальные переменные
let currentDate = new Date();
let dealsCache = {};
let isInitialized = false;

// Обработчик сообщений для изменения размера iframe
window.addEventListener('message', (event) => {
    if (event.data === 'resize') {
        updateIframeSize();
    }
});

// Функция инициализации AmoAPI
async function initializeAmoAPI() {
    if (isInitialized) return;
    
    try {
        await AmoApi.init();
        isInitialized = true;
        
        // Проверяем авторизацию
        if (!AmoApi.isAuthorized()) {
            showError('Требуется авторизация в AmoCRM');
            return;
        }
    } catch (error) {
        throw new Error(`Ошибка инициализации API: ${error.message}`);
    }
}

// Основные функции календаря
async function initCalendar() {
    renderCalendar(currentDate);
    
    // Обработчики событий для навигации
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });
    
    document.getElementById('back-to-calendar').addEventListener('click', () => {
        showCalendarView();
    });
}

async function renderCalendar(date) {
    showLoading();
    const calendarEl = document.getElementById('calendar');
    const monthYearEl = document.getElementById('current-month');
    
    // Очищаем календарь
    calendarEl.innerHTML = '';
    
    // Устанавливаем заголовок месяца и года
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    monthYearEl.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    // Добавляем заголовки дней недели
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'weekday';
        dayEl.textContent = day;
        calendarEl.appendChild(dayEl);
    });
    
    // Получаем первый день месяца и количество дней
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const prevMonthDays = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    
    // Добавляем пустые ячейки для дней предыдущего месяца
    for (let i = 1; i < firstDay; i++) {
        addDayElement(calendarEl, prevMonthDays - firstDay + i + 1, true);
    }
    
    // Добавляем дни текущего месяца
    const today = new Date();
    const currentMonthDeals = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
        const dateStr = formatDate(dayDate);
        const isToday = dayDate.toDateString() === today.toDateString();
        
        const dayEl = addDayElement(calendarEl, day, false, isToday);
        
        // Проверяем кэш на наличие данных
        if (dealsCache[dateStr]) {
            updateDayWithDeals(dayEl, dealsCache[dateStr].length);
        } else {
            const deals = await fetchDealsByDate(dateStr);
            dealsCache[dateStr] = deals;
            currentMonthDeals[dateStr] = deals;
            
            if (deals.length > 0) {
                updateDayWithDeals(dayEl, deals.length);
            }
        }
        
        dayEl.addEventListener('click', () => showDealsForDate(dateStr));
    }
    
    // Добавляем пустые ячейки для дней следующего месяца
    const daysLeft = 7 - (firstDay - 1 + daysInMonth) % 7;
    if (daysLeft < 7) {
        for (let i = 1; i <= daysLeft; i++) {
            addDayElement(calendarEl, i, true);
        }
    }
    
    hideLoading();
    updateIframeSize();
}

// Вспомогательные функции
function addDayElement(container, dayNumber, isOtherMonth, isToday = false) {
    const dayEl = document.createElement('div');
    dayEl.className = `day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    dayEl.innerHTML = `<div class="day-number">${dayNumber}</div>`;
    container.appendChild(dayEl);
    return dayEl;
}

function updateDayWithDeals(dayElement, dealsCount) {
    if (dealsCount > 0) {
        const dealCountEl = document.createElement('div');
        dealCountEl.className = 'deal-count';
        dealCountEl.textContent = dealsCount;
        dayElement.appendChild(dealCountEl);
    }
}

async function fetchDealsByDate(date) {
    try {
        if (!isInitialized) await initializeAmoAPI();
        
        const deals = await AmoApi.getLeads({
            filter: {
                custom_fields: {
                    885453: date // Поле "Заказ на..." (ID: 885453)
                }
            },
            limit: 250 // Максимальное количество сделок за одну дату
        });
        
        return deals || [];
    } catch (error) {
        console.error('Ошибка загрузки сделок:', error);
        showError('Ошибка загрузки данных. Пожалуйста, попробуйте позже.');
        return [];
    }
}

// Функции для работы с интерфейсом
async function showDealsForDate(date) {
    showLoading();
    showDealsView();
    
    const selectedDateEl = document.getElementById('selected-date');
    const dealsContainerEl = document.getElementById('deals-container');
    
    // Форматируем дату для отображения
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    selectedDateEl.textContent = formattedDate;
    
    // Очищаем контейнер сделок
    dealsContainerEl.innerHTML = '';
    
    // Получаем сделки
    const deals = dealsCache[date] || await fetchDealsByDate(date);
    
    // Сортируем сделки по ID (новые сверху)
    deals.sort((a, b) => b.id - a.id);
    
    if (deals.length === 0) {
        dealsContainerEl.innerHTML = '<p>На эту дату нет заказов</p>';
        hideLoading();
        updateIframeSize();
        return;
    }
    
    // Отображаем каждую сделку
    deals.forEach(deal => {
        const dealEl = createDealElement(deal);
        dealsContainerEl.appendChild(dealEl);
    });
    
    hideLoading();
    updateIframeSize();
}

function createDealElement(deal) {
    const dealEl = document.createElement('div');
    dealEl.className = 'deal-item';
    
    // Получаем значения кастомных полей
    const deliveryRange = getCustomFieldValue(deal, 892009); // Диапазон доставки
    const exactTime = getCustomFieldValue(deal, 892003);     // К точному времени
    const address = getCustomFieldValue(deal, 887367);       // Адрес
    
    dealEl.innerHTML = `
        <h3>${escapeHtml(deal.name)}</h3>
        <div class="deal-info">
            <div><strong>ID:</strong> ${deal.id}</div>
            <div><strong>Бюджет:</strong> ${deal.price ? formatPrice(deal.price) : '—'}</div>
            <div><strong>Диапазон доставки:</strong> ${escapeHtml(deliveryRange) || '—'}</div>
            <div><strong>К точному времени:</strong> ${escapeHtml(exactTime) || '—'}</div>
            <div><strong>Адрес:</strong> ${escapeHtml(address) || '—'}</div>
        </div>
    `;
    
    // Клик по сделке - открываем карточку
    dealEl.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
            AmoApi.openCard('lead', deal.id);
        } catch (error) {
            console.error('Ошибка открытия карточки:', error);
            showError('Не удалось открыть карточку сделки');
        }
    });
    
    return dealEl;
}

// Функции отображения/скрытия элементов
function showCalendarView() {
    document.getElementById('deals-list').classList.add('hidden');
    document.getElementById('calendar-container').classList.remove('hidden');
    updateIframeSize();
}

function showDealsView() {
    document.getElementById('calendar-container').classList.add('hidden');
    document.getElementById('deals-list').classList.remove('hidden');
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
        <p>${message}</p>
        <button onclick="location.reload()">Обновить</button>
    `;
    document.getElementById('app').appendChild(errorEl);
    updateIframeSize();
}

// Функции обновления размера iframe
function updateIframeSize() {
    const height = document.body.scrollHeight;
    parent.postMessage({ 
        type: 'resize',
        height: height,
        widgetId: 'order-calendar-widget'
    }, '*');
}

// Вспомогательные функции
function getCustomFieldValue(deal, fieldId) {
    const field = deal.custom_fields_values?.find(f => f.field_id === fieldId);
    return field?.values?.[0]?.value;
}

function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', 
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
