'use strict';

const path = require('path');
const url = require('url');
const KoaRouter = require('@eggjs/router').KoaRouter;
const compose = require('koa-compose');
const co = require('co');
const ws = require('ws');

const WebSocketServer = ws.Server;
const debug = require('debug')('egg-ws');
const EggWs = Symbol('EggWs');

function EggWebSocketServer(app) {
  this.app = app;
  this.middleware = [];
  this.routers = [];
}

EggWebSocketServer.prototype.loadRoutes = function loadRoutes() {
  const app = this.app;
  const dirs = app.loader.getLoadUnits().map(unit => path.join(unit.path, 'app', 'ws'));
  this.routes = this.routes || {};
  app.loader.loadToApp(dirs, EggWs, { target: this.routes });
};

EggWebSocketServer.prototype.listen = function listen(options) {
  this.server = new WebSocketServer(Object.assign({ verifyClient: this.verifyClient.bind(this) }, options));
  this.server.on('connection', this.onConnection.bind(this));
};

EggWebSocketServer.prototype.verifyClient = function verifyClient(info, cb) {
  const ctx = this.app.createContext(info.req);
  info.req.ctx = ctx;
  const router = this.routers.find(router => router.verifyClient && router.match(ctx.path, ctx.method).route);
  if (router) {
    router.verifyClient(ctx, cb);
  }
};

EggWebSocketServer.prototype.onConnection = function onConnection(socket, req) {
  debug('Connection received');
  socket.on('error', err => {
    debug('Error occurred:', err);
  });
  const fn = co.wrap(compose(this.middleware));

  const context = req.ctx || this.app.createContext(req);
  context.websocket = socket;
  context.path = url.parse(req.url).pathname;

  fn(context).catch(err => {
    debug(err);
  });
};

EggWebSocketServer.prototype.use = function use(fn) {
  this.middleware.push(fn);
  return this;
};

EggWebSocketServer.prototype.route = function route(options) {
  const { verifyClient } = options;
  const router = new KoaRouter(options);
  this.use(router.routes());
  router.verifyClient = verifyClient;
  this.routers.push(router);
  return router;
};

module.exports = app => {
  const config = app.config.ws;

  debug('init start');
  app.ws = new EggWebSocketServer(app);
  app.ws.loadRoutes();

  app.on('server', server => {
    const options = { server };
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        options[key] = config[key];
      }
    }

    debug('start listening');
    app.ws.listen(options);
  });
};
