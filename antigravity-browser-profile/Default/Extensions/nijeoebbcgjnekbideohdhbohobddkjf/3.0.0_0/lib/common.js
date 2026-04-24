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

