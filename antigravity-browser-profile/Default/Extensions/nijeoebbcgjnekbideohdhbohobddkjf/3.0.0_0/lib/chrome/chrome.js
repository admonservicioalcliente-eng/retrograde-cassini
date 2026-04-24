

var app = {};
url = "/data/UI/index.html"
// chrome.action.onClicked.addListener(function(activeTab)
// {
//     chrome.tabs.create({ url: url });
// });


app.version = function () {
  return chrome.runtime.getManifest().version
};
app.homepage = function () {
  return chrome.runtime.getManifest().homepage_url;
};
app.tab = {
  "open": function (url) {
    chrome.tabs.create({"url": url, "active": true})
  }
};
app.button = {"clicked": function (callback) {chrome.action.onClicked.addListener(callback)}};

// app.context_menu = {
//   "create": function (title, callback) {
//     chrome.contextMenus.create({
//       "title": title,
//       "contexts": ['link'],
//       "targetUrlPatterns": ['epub'].map(e => '*://*/*.' + e),
//       "onclick": function (e) {
//         callback(e.linkUrl || e.srcUrl || '')
//       }
//     });
//   }
// };

app.storage = (function () {
  var objs = {};
  globalThis.setTimeout(function () {
    chrome.storage.local.get(null, function (o) {
      objs = o;

      // From common.js
      {
        app.UI.receive("method", function (e) {
          config.epub.method = e.method;
          config.load();
        });
        
        app.UI.receive("font", function (e) {
          config.epub.font = e.font;
          config.load();
        });
        
        app.UI.receive("dark", function () {
          config.UI.dark = config.UI.dark === "active" ? "inactive" : "active";
          config.load();
        });
        
        
        app.UI.receive("resize", function (e) {
          config.UI.size = {"width": e.width, "height": e.height};
          config.load();
        });
        
        // window.setTimeout(function () {
        //   app.context_menu.create("View ePUB", function (url) {
        //     if (url) {
        //       var option = {"permissions": ["tabs"], "origins": [url]};
        //       chrome.permissions.request(option, function (allow) {
        //         if (allow) {
        //           config.epub.url = url;
        //           config.load();
        //         }
        //       });
        //     }
        //   });
        // }, 300);
        
        app.button.clicked(config.load);
        app.UI.receive("load", config.load);
        app.UI.receive("url", function (e) {config.epub.url = e.url});
        app.UI.receive("support", function () {
          app.tab.open(app.homepage());
        });
        app.UI.receive("gdrive", function () {
          debugger;
          app.tab.open(app.homepage()+"epub-reader");
        });
        
        
      }
    });
  }, 300);
  /*  */
  return {
    "read": function (id) {return objs[id]},
    "write": function (id, data) {
      var tmp = {};
      tmp[id] = data;
      objs[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  }
})();

app.UI = (function () {
  var r = {};
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.path === 'ui-to-background') {
      for (var id in r) {
        if (r[id] && (typeof r[id] === "function")) {
          if (request.method === id) r[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "id": null,
    "receive": function (id, callback) {
      r[id] = callback
    },
    "update": function (callback) {
      try{
        //debugger;
        chrome.tabs.update(app.UI.id, {"active": true}, callback)
      }
      catch(e){
        console.log("update",e);
      }
    },
    "send": function (id, data) {
      chrome.runtime.sendMessage({"path": 'background-to-ui', "method": id, "data": data})
    },
    "create": function () {
      //debugger;
      //app.UI.id = null;
      chrome.tabs.create({"url": "data/UI/index.html", "active": true}, function(tab){
        app.UI.id = tab.id;
        chrome.tabs.onRemoved.addListener(function (e) {if (e === app.UI.id) app.UI.id = null});
      });

      
      chrome.windows.getCurrent(function (win) {
        var width = config.UI.size.width;
        var height = config.UI.size.height;
        var url = chrome.runtime.getURL("data/UI/index.html");
        var top = win.top + Math.round((win.height - height) / 2);
        var left = win.left + Math.round((win.width - width) / 2);
        //chrome.windows.onRemoved.addListener(function (e) {if (e === app.UI.id) app.UI.id = null});
        /*chrome.windows.create({'url': url, 'type': 'popup', 'width': width, 'height': height, 'top': top, 'left': left}, function (w) {
          app.UI.id = w.id;
        });*/
      });
      
    }
  }
})();
