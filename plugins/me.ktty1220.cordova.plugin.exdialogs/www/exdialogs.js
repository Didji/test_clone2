// Generated by CoffeeScript 1.7.1
(function() {
  var PLUGIN, checkSelectArgs, defaultFail, exec;

  exec = require('cordova/exec');

  PLUGIN = 'ExDialogs';

  defaultFail = function(e) {
    return console.error(e);
  };

  checkSelectArgs = function(fail, items, title, icon, sinit, minit) {
    var i, _i, _ref;
    if (!(items instanceof Array)) {
      return fail(new Error('items is not Array'));
    }
    if (items.length === 0) {
      return fail(new Error('items length is 0'));
    }
    title = (title != null ? title : '').toString();
    icon = (icon != null ? icon : '').toString();
    if (sinit == null) {
      sinit = 0;
    }
    if (minit == null) {
      minit = [];
    }
    if (!(minit instanceof Array)) {
      minit = [minit];
    }
    for (i = _i = 0, _ref = items.length - minit.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      minit.push(false);
    }
    return {
      fail: fail != null ? fail : defaultFail,
      args: [items, title, icon, sinit, minit]
    };
  };

  module.exports = {
    selectPlain: function(win, fail, items, title, icon) {
      var a;
      a = checkSelectArgs(fail, items, title, icon);
      return cordova.exec(win, a.fail, PLUGIN, 'selectPlain', a.args);
    },
    selectSingle: function(win, fail, items, init, title, icon) {
      var a;
      a = checkSelectArgs(fail, items, title, icon, init);
      return cordova.exec(win, a.fail, PLUGIN, 'selectSingle', a.args);
    },
    selectMulti: function(win, fail, items, init, title, icon) {
      var a;
      a = checkSelectArgs(fail, items, title, icon, null, init);
      return cordova.exec(win, a.fail, PLUGIN, 'selectMulti', a.args);
    },
    progressStart: function(win, fail, message, title, max) {
      if (max == null) {
        max = 100;
      }
      return cordova.exec(win, fail != null ? fail : defaultFail, PLUGIN, 'progressStart', [message, title, max]);
    },
    progressValue: function(value, message) {
      return cordova.exec(null, null, PLUGIN, 'progressValue', [value, message]);
    },
    progressStop: function() {
      return cordova.exec(null, null, PLUGIN, 'progressStop', []);
    },
    toast: function(message) {
      return cordova.exec(null, null, PLUGIN, 'toast', [message]);
    },
    textArea: function(message, win, title, line) {
      if (line == null) {
        line = 5;
      }
      return cordova.exec(win, null, PLUGIN, 'textArea', [message, title, line]);
    }
  };

}).call(this);