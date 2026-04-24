chrome.runtime.onInstalled.addListener(async (details) => {
  // Open Koalendar login on install
  if (details.reason === "install") {
    chrome.tabs.create({
      url: "https://koalendar.com/login?utm_source=chrome-webstore&utm_campaign=install",
      active: true,
    });
  }

  // Ask feedback on uninstall
  // chrome.runtime.setUninstallURL(
  //   "https://docs.google.com/forms/d/e/1FAIpQLSdO9kUjRezByMIXdnUdJzRQ-mvIvsvUYBnq8csuBF9_07nzgA/viewform"
  // );

  return false;
});
