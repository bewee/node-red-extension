/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import {AddonManagerProxy} from 'gateway-addon';
import express from 'express';
import fs from 'fs';
import RED from 'node-red';
import {Config} from './config';
import {util} from '@node-red/util';
import http from 'http';

export class NodeRedExtension {

  // eslint-disable-next-line no-unused-vars
  constructor(private addonManager: AddonManagerProxy, private config: Config) {
    this.initializeNodeRed();
  }

  defaultLocalGateway(): any {
    if (!this.config.gateway) {
      this.config.gateway = {};
    }
    return {
      type: 'webthingsio-gateway',
      name: this.config.gateway.name || 'Local',
      host: this.config.gateway.host || '127.0.0.1',
      port: this.config.gateway.port || 8080,
      https: this.config.gateway.https,
      accessToken: this.config.gateway.accessToken,
      skipValidation: this.config.gateway.skipValidation,
    };
  }

  initializeNodeRed(): void {
    if (!this.config.nodeRed) {
      this.config.nodeRed = {};
    }
    if (this.config.nodeRed.host) {
      const location =
        `${this.config.nodeRed.host}:${this.config.nodeRed.port}`;
      // eslint-disable-next-line max-len
      console.warn(`Not starting a local Node-RED instance, but using the one hosted at ${location}! Please note that I cannot apply gateway specific options there :\\`);
      return;
    }

    const dataDir = (this.addonManager as any).userProfile.dataDir;
    const path = `${dataDir}/node-red-extension/`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    process.env.NODE_RED_HOME = path;
    process.env.HOME = path;
    process.env.USERPROFILE = path;
    process.env.HOMEPATH = path;
    process.env.DEBUG = '*';

    const app = express();

    const defaultSettings = {
      httpRoot: '/',
      httpAdminRoot: '/',
      httpNodeRoot: '/',
      uiHost: '0.0.0.0',
      uiPort: this.config.nodeRed.port || 1880,
    };
    let customSettings = {};
    try {
      customSettings = JSON.parse(this.config.nodeRed.settings!);
    } catch (ex) {
      console.info('No custom Node-RED settings specified!');
    }
    const settings = {
      ... defaultSettings,
      ... customSettings,
    };

    const server = http.createServer((req, res) => {
      app(req, res);
    });
    server.setMaxListeners(0);

    RED.init(server, settings as any);
    app.use(settings.httpAdminRoot as string, RED.httpAdmin);
    app.use(settings.httpNodeRoot as string, RED.httpNode);
    RED.start().then(async () => {
      console.info('Node-RED running!');
      this.addGatewayNode();
      server.on('error', (err) => {
        console.error('Server error:', err);
      });
      server.listen(settings.uiPort, settings.uiHost, () => {
        console.info('Node-RED server listening!');
      });
    });
  }

  async addGatewayNode(): Promise<void> {
    if (!this.config.gateway || !this.config.gateway.accessToken) {
      // eslint-disable-next-line max-len
      console.warn('Not generating a local configuration node. Please consider adding an access token to the add-on config.');
      return;
    }

    const globalflow = await RED.runtime.flows.getFlow({
      id: 'global',
    });
    let configs = (globalflow as any).configs;
    if (!configs) {
      configs = [];
      (globalflow as any).configs = configs;
    }
    const localgateways = configs.filter((node: any) => {
      return node.type === 'webthingsio-gateway' &&
        node.name === this.defaultLocalGateway().name;
    });
    if (localgateways.length === 0) {
      console.info('Adding configuration node for local gateway');
      configs.push({
        id: util.generateId(),
        ... this.defaultLocalGateway(),
      });
    } else {
      console.info('Updating configuration node for local gateway');
      Object.assign(localgateways[0], this.defaultLocalGateway());
    }
    RED.runtime.flows.updateFlow({
      id: globalflow.id,
      flow: globalflow,
    });
  }
}
