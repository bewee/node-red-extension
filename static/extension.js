(() => {
  class NodeRedExtension extends window.Extension {

    constructor() {
      super('node-red-extension');
      this.addMenuEntry('Node-RED');

      window.API.getAddonConfig('node-red-extension').then((config) => {
        this.port = config.port || 1880;
        this.nodeRedUrl = `http://${window.location.hostname}:${this.port}`;
        this.setupView();
        document.querySelector('#menu-button').style.zIndex = '500';
      });
    }

    setupView() {
      this.view.innerHTML = `<iframe src = ${this.nodeRedUrl}></iframe>`;
    }

  }

  new NodeRedExtension();
})();
