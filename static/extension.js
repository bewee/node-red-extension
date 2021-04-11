(() => {
  class NodeRedExtension extends window.Extension {

    constructor() {
      super('node-red-extension');
      this.addMenuEntry('Node-RED');

      window.API.getAddonConfig('node-red-extension').then((config) => {
        const port = config.nodeRed.port || 1880;
        const host = config.nodeRed.host ?
          config.nodeRed.host :
          window.location.hostname;
        this.nodeRedUrl = `http://${host}:${port}`;
        this.addMenuObserver();
        this.applyViewVisibility();
      });
    }

    addMenuObserver() {
      const mutationObserver = new MutationObserver(
        (mutationsList, _observer) => {
          const relevantMutations = mutationsList.filter((mutation) => {
            return mutation.attributeName === 'class';
          });
          if (!relevantMutations || !relevantMutations[0]) {
            return;
          }
          this.applyViewVisibility();
        }
      );
      mutationObserver.observe(
        document.getElementById('extension-node-red-extension-view'),
        {attributes: true},
      );
    }

    applyViewVisibility() {
      const view = document.getElementById(
        'extension-node-red-extension-view',
      );
      if (view.className.split(' ').includes('selected')) {
        document.querySelector('#menu-button').style.zIndex = '500';
        this.view.innerHTML = `<iframe src = ${this.nodeRedUrl}></iframe>`;
      } else {
        document.querySelector('#menu-button').style.zIndex = null;
        this.view.innerHTML = '';
      }
    }

  }

  new NodeRedExtension();
})();
