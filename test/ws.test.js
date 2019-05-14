'use strict';

const mock = require('egg-mock');

describe('test/ws.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'apps/ws-test',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .expect('hi, ws')
      .expect(200);
  });
});
