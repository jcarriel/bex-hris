const moduleAlias = require('module-alias');

moduleAlias.addAliases({
  '@config': __dirname + '/dist/config',
  '@controllers': __dirname + '/dist/controllers',
  '@services': __dirname + '/dist/services',
  '@repositories': __dirname + '/dist/repositories',
  '@models': __dirname + '/dist/models',
  '@middleware': __dirname + '/dist/middleware',
  '@utils': __dirname + '/dist/utils',
  '@types': __dirname + '/dist/types',
  '@notifications': __dirname + '/dist/notifications',
});

require('./dist/index.js');
