define(['jquery'], function($) {
  var OrderCalendarWidget = function() {
    var self = this;
    var currentDate = new Date();
    var dealsCache = {};
    var refreshInterval;

    // Основные методы
    this.callbacks = {
      render: function() {
        return true;
      },

      init: function() {
        if (!AmoApi) {
          console.error('AmoAPI не загружен');
          return false;
        }
        
        try {
          AmoApi.init().then(function() {
            self.renderCalendar(currentDate);
            self.setupRefresh();
          });
          return true;
        } catch (e) {
          console.error('Ошибка инициализации:', e);
          return false;
        }
      },

      bind_actions: function() {
        $(document)
          .on('click', '.calendar-day', function() {
            var date = $(this).data('date');
            self.showDealsForDate(date);
          })
          .on('click', '.deal-item', function(e) {
            e.stopPropagation();
            var dealId = $(this).data('deal-id');
            AmoApi.openCard('lead', dealId);
          })
          .on('click', '#prev-month', function() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            self.renderCalendar(currentDate);
          })
          .on('click', '#next-month', function() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            self.renderCalendar(currentDate);
          })
          .on('click', '#back-to-calendar', function() {
            $('#deals-list').addClass('hidden');
            $('#calendar-container').removeClass('hidden');
            self.updateIframeSize();
          });
        
        return true;
      },

      destroy: function() {
        clearInterval(refreshInterval);
        return true;
      },

      onSave: function() {
        self.setupRefresh();
        return true;
      }
    };

    // Кастомные методы
    this.renderCalendar = function(date) {
      var monthNames = self.i18n('monthNames');
      $('#current-month').text(monthNames[date.getMonth()] + ' ' + date.getFullYear());
      
      var calendarHtml = '';
      var firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      var daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      // Заголовки дней недели
      var weekdays = self.i18n('weekdays');
      weekdays.forEach(function(day) {
        calendarHtml += '<div class="weekday">' + day + '</div>';
      });
      
      // Дни месяца
      for (var day = 1; day <= daysInMonth; day++) {
        var dayDate = new Date(date.getFullYear(), date.getMonth(), day);
        var dateStr = self.formatDate(dayDate);
        var deals = dealsCache[dateStr] || [];
        
        calendarHtml += '<div class="calendar-day" data-date="' + dateStr + '">' +
          '<div class="day-number">' + day + '</div>' +
          (deals.length > 0 ? '<div class="deal-count">' + deals.length + '</div>' : '') +
          '</div>';
      }
      
      $('#calendar').html(calendarHtml);
      self.updateIframeSize();
    };

    this.showDealsForDate = function(date) {
      var dateObj = new Date(date);
      var formattedDate = dateObj.toLocaleDateString(self.i18n('locale'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      $('#selected-date').text(formattedDate);
      $('#deals-container').empty();
      
      var deals = dealsCache[date] || [];
      deals.sort(function(a, b) { return b.id - a.id; });
      
      if (deals.length === 0) {
        $('#deals-container').html('<p>' + self.i18n('noDeals') + '</p>');
      } else {
        deals.forEach(function(deal) {
          var deliveryRange = self.getCustomFieldValue(deal, 892009);
          var exactTime = self.getCustomFieldValue(deal, 892003);
          var address = self.getCustomFieldValue(deal, 887367);
          
          var dealHtml = '<div class="deal-item" data-deal-id="' + deal.id + '">' +
            '<h3>' + deal.name + '</h3>' +
            '<div class="deal-info">' +
              '<div><strong>ID:</strong> ' + deal.id + '</div>' +
              '<div><strong>Бюджет:</strong> ' + (deal.price || '—') + '</div>' +
              '<div><strong>Диапазон доставки:</strong> ' + (deliveryRange || '—') + '</div>' +
              '<div><strong>К точному времени:</strong> ' + (exactTime || '—') + '</div>' +
              '<div><strong>Адрес:</strong> ' + (address || '—') + '</div>' +
            '</div>' +
          '</div>';
          
          $('#deals-container').append(dealHtml);
        });
      }
      
      $('#calendar-container').addClass('hidden');
      $('#deals-list').removeClass('hidden');
      self.updateIframeSize();
    };

    this.setupRefresh = function() {
      clearInterval(refreshInterval);
      var settings = self.get_settings();
      var refreshRate = (settings && settings.refresh_rate) ? parseInt(settings.refresh_rate) : 15;
      
      if (refreshRate > 0) {
        refreshInterval = setInterval(function() {
          self.refreshDealsData();
        }, refreshRate * 60 * 1000);
      }
    };

    this.refreshDealsData = function() {
      var date = new Date();
      var year = date.getFullYear();
      var month = date.getMonth();
      
      for (var day = 1; day <= 31; day++) {
        var dayDate = new Date(year, month, day);
        if (dayDate.getMonth() !== month) break;
        
        var dateStr = self.formatDate(dayDate);
        self.fetchDealsByDate(dateStr).then(function(deals) {
          dealsCache[dateStr] = deals;
          self.renderCalendar(currentDate);
        });
      }
    };

    this.fetchDealsByDate = function(date) {
      return AmoApi.getLeads({
        filter: {
          custom_fields: {885453: date}
        },
        limit: 250
      }).then(function(deals) {
        dealsCache[date] = deals;
        return deals;
      }).catch(function(error) {
        console.error('Ошибка загрузки сделок:', error);
        return [];
      });
    };

    this.updateIframeSize = function() {
      var height = document.body.scrollHeight;
      parent.postMessage({
        type: 'resize',
        height: height,
        widgetId: 'order-calendar'
      }, '*');
    };

    this.formatDate = function(date) {
      return date.getFullYear() + '-' + 
             (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
             date.getDate().toString().padStart(2, '0');
    };

    this.getCustomFieldValue = function(deal, fieldId) {
      var field = deal.custom_fields_values.find(function(f) { 
        return f.field_id === fieldId; 
      });
      return field ? field.values[0].value : null;
    };

    return this;
  };
  
  return OrderCalendarWidget;
});
