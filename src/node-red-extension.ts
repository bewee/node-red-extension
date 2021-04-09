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

  private defaultLocalGateway: any;

  // eslint-disable-next-line no-unused-vars
  constructor(private addonManager: AddonManagerProxy, private config: Config) {
    this.initializeNodeRed();
    this.defaultLocalGateway = {
      type: 'webthingsio-gateway',
      name: 'Local',
      host: 'localhost',
      port: 8080,
      https: false,
      accessToken: this.config.accessToken,
      skipValidation: false,
    };
  }

  initializeNodeRed(): void {
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
      uiPort: this.config.nodeRedPort || 1880,
    };
    let customSettings = {};
    try {
      customSettings = JSON.parse(this.config.nodeRedSettings!);
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
    if (!this.config.accessToken) {
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
        node.name === 'Local';
    });
    if (localgateways.length === 0) {
      console.info('Adding configuration node for local gateway');
      configs.push({
        id: util.generateId(),
        ... this.defaultLocalGateway,
      });
    } else {
      console.info('Updating configuration node for local gateway');
      Object.assign(localgateways[0], this.defaultLocalGateway);
    }
    RED.runtime.flows.updateFlow({
      id: globalflow.id,
      flow: globalflow,
    });
  }
}
