define(['jquery', 'underscore', 'twigjs'], function($, _, Twig) {
  var CustomWidget = function() {
    var self = this;

    // 1. Базовые методы виджета
    this._getWidgetObj = function() {
      return {
        callbacks: this.callbacks || {},
        disableSave: function() { /* native amoCRM method */ },
        enableSave: function() { /* native amoCRM method */ }
      };
    };

    // 2. Основные callback-и
    this.callbacks = {
      // Обязательные callback-и
      init: function() {
        console.log('Widget initialized');
        return true;
      },
      
      render: function() {
        console.log('Widget rendered');
        return true;
      },
      
      bind_actions: function() {
        console.log('Actions bound');
        return true;
      },
      
      onSave: function() {
        console.log('Save triggered');
        return true;
      },
      
      settings: function() {
        console.log('Settings loaded');
        return true;
      },
      
      destroy: function() {
        console.log('Widget destroyed');
        return true;
      },

      // 3. Обработчики элементов CRM
      contacts: {
        selected: function() {
          console.log('Contact selected');
        }
      },
      
      leads: {
        selected: function() {
          console.log('Lead selected');
        }
      },
      
      tasks: {
        selected: function() {
          console.log('Task selected');
        }
      },

      // 4. Дополнительные функции
      advancedSettings: function() {
        console.log('Advanced settings opened');
        return true;
      }
    };

    // 5. Вспомогательные методы
    this.getTemplate = function(template, params, callback) {
      params = params || {};
      template = template || '';
      
      return this.render({
        href: '/templates/' + template + '.twig',
        base_path: this.params.path,
        v: this.get_version(),
        load: callback
      }, params);
    };

    // 6. Инициализация виджета
    var widgetObj = this._getWidgetObj();
    if (widgetObj && widgetObj.callbacks) {
      widgetObj.callbacks = this.callbacks;
    }

    return this;
  };

  return CustomWidget;
});
