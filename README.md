# Node-RED extension

Use your webthings in [Node-RED](https://nodered.org/) for advanced home automatization. For more information, have a look at [this](https://github.com/bewee/node-red-contrib-webthingsio#readme) page.

## Setup

Install this addon through the addon list or clone it to `~/.webthingsio/addons/` using git.

Then go to `Settings > Developer > Create local authorization`. Make sure that all devices are checked and that "monitor and control" is selected. Then click allow and copy the token from the first text field. Go to `Settings > Add-Ons > Node-RED > Configure` and paste your token in the access token field, then click save.

After a reload of the gateway webpage, you will find a new menu entry for Node-RED.
