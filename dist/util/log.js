'use strict';

var winston = require('winston');

module.exports = function (module) {
  var filename = module.id;
  return {
    info: function (msg, vars) {
      if (vars) winston.info('[' + filename + ']' + ': ' + msg, vars);else winston.info('[' + filename + ']' + ': ' + msg);
    },
    warn: function (msg, vars) {
      if (vars) winston.warn('[' + filename + ']' + ': ' + msg, vars);else winston.warn('[' + filename + ']' + ': ' + msg);
    },
    debug: function (msg, vars) {
      if (vars) winston.debug('[' + filename + ']' + ': ' + msg, vars);else winston.debug('[' + filename + ']' + ': ' + msg);
    }
  };
};
//# sourceMappingURL=log.js.map