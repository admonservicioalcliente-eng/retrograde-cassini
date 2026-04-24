var config = {};

config.UI = {
  set dark (val) {app.storage.write("dark", val)},
  set size (o) {if (o) app.storage.write("size", o, function () {})},
  get dark () {return app.storage.read("dark") !== undefined ? app.storage.read("dark") : "inactive"},
  get size () {return app.storage.read("size") !== undefined ? app.storage.read("size") : {"width": 1024, "height": 700}}
};

config.load = function () {
  if (app.UI.id) {
    app.UI.update(function () {
      app.UI.send("load", {
        "url": config.epub.url,
        "dark": config.UI.dark,
        "font": config.epub.font,
        "method": config.epub.method,
        "option": config.epub.rendition.option[config.epub.method]
      });
    });
  } else app.UI.create();
};

config.epub = {
  set url (val) {app.storage.write("url", val)},
  set method (val) {app.storage.write("method", val)},
  set font (o) {if (o) app.storage.write("font", o, function () {})},
  get url () {return app.storage.read("url") !== undefined ? app.storage.read("url") : ''},
  get font () {return app.storage.read("font") !== undefined ? app.storage.read("font") : 75},
  get method () {return app.storage.read("method") !== undefined ? app.storage.read("method") : "scrolled-continuous"},
  "rendition": {
    "option": {
      "archived": {"width": "100%", "height": "100%"},
      "scrolled": {"width": "100%", "flow": "scrolled-doc"},
      "spreads": {"width": "100%", "height": "100%", "spread": "always"},
      "hypothes": {"width": "100%", "height": "100%", "flow": "scrolled-doc", "ignoreClass": "annotator-hl"},
      "spreads-continuous": {"width": "100%", "height": "100%", "flow": "paginated", "manager": "continuous"},
      "scrolled-continuous": {"width": "100%", "height": "100%", "flow": "scrolled", "manager": "continuous"},
      "swipe": {"width": "100%", "height": "100%", "flow": "paginated", "manager": "continuous", "snap": true},
      "highlights": {"width": "100%", "height": "100%", "manager": "continuous", "ignoreClass": "annotator-hl"},
    }
  }
};
