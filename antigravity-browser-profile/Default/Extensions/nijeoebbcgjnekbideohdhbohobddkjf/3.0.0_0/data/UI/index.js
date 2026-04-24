var background = (function () {
    var r = {};
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.path === 'background-to-ui') {
            for (var id in r) {
                if (request.method === id) r[id](request.data);
            }
        }
    });
    /*  */
    return {
        "receive": function (id, callback) { r[id] = callback },
        "send": function (id, data) { chrome.runtime.sendMessage({ "path": 'ui-to-background', "method": id, "data": data }) }
    }
})();

var config = {};

config.url = '';
config.option = {};
config.info = null;
config.font = null;
config.dark = null;
config.timeout = {};
config.result = null;

config.keyup = function (e) {
    if ((e.keyCode || e.which) === 37) config.action.left();
    if ((e.keyCode || e.which) === 39) config.action.right();
};

config.action = {
    "left": function () {
        config.book.package.metadata.direction === "rtl" ? config.rendition.next() : config.rendition.prev();
        config.style(300);
    },
    "right": function () {
        config.book.package.metadata.direction === "rtl" ? config.rendition.prev() : config.rendition.next();
        config.style(300);
    },
    "empty": function () {
        if (config.xhr) config.xhr.abort();
        if (config.book) config.book.destroy();
        config.renderer.setAttribute("empty", '');
        config.info.textContent = chrome.i18n.getMessage("message_ready");//"ePUB Reader is ready";
        config.renderer.textContent = chrome.i18n.getMessage("message_enter_url");//"Please enter a URL or drag & drop an ePub file in the above field";
    }
};

config.fetch = function (url) {
    if (url !== undefined) {
        config.url = url;
        background.send("url", { "url": config.url });
    }
    /*  */
    if (config.url) {
        config.action.empty();
        config.xhr = new XMLHttpRequest();
        config.xhr.open("GET", config.url, true);
        config.xhr.responseType = "arraybuffer";
        config.xhr.onload = function () { config.render(this.response) };
        config.info.textContent = chrome.i18n.getMessage("message_fetching_0");//"Fetching document 0% please wait...";
        config.renderer.textContent = chrome.i18n.getMessage("message_loading");//"Loading document, please wait...";
        config.xhr.onerror = function (e) {
            config.info.textContent = chrome.i18n.getMessage("message_error");
        };
        config.xhr.onprogress = function (e) {
            config.info.textContent = chrome.i18n.getMessage("message_fetching_1")
                + Math.floor((e.loaded / e.total) * 100)
                + chrome.i18n.getMessage("message_fetching_2");
        };
        config.xhr.send();
    } else config.render('');
};

config.style = function (delay) {
    if (config.timeout.style) window.clearTimeout(config.timeout.style);
    config.timeout.style = window.setTimeout(function () {
        var iframes = [...document.querySelectorAll("iframe")];
        iframes.forEach(function (iframe) {
            var style = iframe.contentDocument.createElement("style");
            if (iframe.contentDocument.head) {

                iframe.contentDocument.head.appendChild(style);
                style.textContent = config.dark === "active" ?
                    `
          body {
            color: #383838;
            font-size: ${config.font}% !important;
          }
          a {
            color: #9a751d !important;
          }
          h1, h2, h3, h4, h5, span.page-normal {
            color: #548811 !important;
          }
          html {
            filter: invert(100%);
            background-color: #191919;
            text-rendering: optimizeSpeed;
            image-rendering: optimizeSpeed;
            -webkit-font-smoothing: antialiased;
            -webkit-image-rendering: optimizeSpeed;
          }
          img {
            opacity: 0.80;
            filter: invert(100%) !important;
          }
        ` :
                    `
          body {font-size: ${config.font}% !important}
        `;
            }
        });
    }, delay);
};

config.render = function (result) {
    config.action.empty();
    if (result !== undefined) config.result = result;
    /*  */
    if (config.result) {
        var container = document.querySelector(".epub-container");
        config.info.textContent = chrome.i18n.getMessage("message_loading");//"Loading document, please wait...";
        config.renderer.style.width = (parseInt(window.getComputedStyle(document.getElementById("content-row")).width.replace("px", ""))) + "px";//window.getComputedStyle(container).width; 
        config.renderer.style.height = (parseInt(window.getComputedStyle(container).height.replace("px", ""))) + "px";
        /*  */
        try {
            config.book = ePub();
            config.book.open(config.result);
            config.rendition = config.book.renderTo("epub", config.option);
            config.rendition.on("keyup", config.keyup);
            /*  */
            config.rendition.display().then(function () {
                config.style(0);
                var element = config.renderer.firstChild;
                var height = parseInt(window.getComputedStyle(container).height.replace("px", ""));
                element.addEventListener("scroll", function () { config.style(300) });
                if (element) {
                    config.renderer.firstChild.style.overflowX = "hidden";
                    config.renderer.firstChild.style.maxHeight = (height - 105) + "px";
                }
                /*  */
            });
            /*  */
            config.book.loaded.navigation.then(function () {
                config.renderer.textContent = '';
                config.renderer.removeAttribute("empty");
            });
            /*  */
            config.book.ready.then(function () {
                var metadata = config.book.package.metadata;
                config.info.textContent = metadata.title + (metadata.creator ? " (" + metadata.creator + ")" : '');
                document.title = chrome.i18n.getMessage("app_name") + " :: " + metadata.title + (metadata.language ? " (" + metadata.language + ")" : '');
            });
        } catch (e) {
            config.info.textContent = chrome.i18n.getMessage("message_error");//"An error has occurred! please try again."
        }
    }
};

config.load = function () {
    var locale = new Localize();
    locale.init();
    locale.localizeHtmlPage();
    //(new Localize()).init();  
    var url = document.getElementById("url");
    var dark = document.getElementById("dark");
    var file = document.getElementById("file");
    var next = document.getElementById("next");
    var prev = document.getElementById("prev");
    var font = document.getElementById("font");
    var reload = document.getElementById("reload");
    var methods = document.getElementById("methods");
    var support = document.getElementById("support");
    var uploadEpub = document.getElementById("upload-epub");
    var gdrive = document.getElementById("gdrive");
    var rateUs = document.getElementById("rateUs");
    /*  */
    config.info = document.getElementById("info");
    config.renderer = document.getElementById("epub");
    /*  */
    methods.addEventListener("change", function (e) {
        background.send("method", {
            "method": e.target[e.target.selectedIndex].value
        });
    }, false);
    /*  */
    font.addEventListener("change", function (e) {
        if (config.timeout.font) window.clearTimeout(config.timeout.font);
        config.timeout.font = window.setTimeout(function () {
            background.send("font", { "font": e.target.value });
        }, 300);
    }, false);
    /*  */
    file.addEventListener("change", function (e) {
        var file = e.target.files[0];
        var epub = file.name.indexOf(".epub") !== -1;
        if (epub) {
            $(".only-loaded").show();
            var reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = function () {
                config.render(this.result)
            };
            config.info.textContent = chrome.i18n.getMessage("message_loading");//"Loading document, please wait...";
        } else config.info.textContent = chrome.i18n.getMessage("message_wrong_content");//"Invalid file! please try again.";
    });
    uploadEpub.addEventListener("click", function (e) {
        file.click();
    });
    /*  */
    url.addEventListener("change", function (e) {
        if (e.target.value) {
            var option = { "permissions": ["tabs"], "origins": [e.target.value] };
            chrome.permissions.request(option, function (allow) {
                if (allow) config.fetch(e.target.value);
            });
        } else config.fetch('');
    }, false);
    /*  */
    background.send("load");
    window.removeEventListener("load", config.load, false);
    document.addEventListener("keyup", config.keyup, false);
    prev.addEventListener("click", config.action.left, false);
    next.addEventListener("click", config.action.right, false);
    dark.addEventListener("click", function () { background.send("dark") }, false);
    reload.addEventListener("click", function () { document.location.reload() }, false);
    support.addEventListener("click", function () { background.send("support") }, false);
    gdrive.addEventListener("click", function () {
        debugger;
        background.send("gdrive");

    }, false);

    rateUs.addEventListener("click", function (e) {
        const url = rateUs.getAttribute("href");
        chrome.tabs.create({
            url,
        });
    })

    $(".only-loaded").hide();


};

background.receive("load", function (e) {
    if (config.url && config.url !== e.url) config.result = '';
    /*  */
    config.url = e.url;
    config.font = e.font;
    config.dark = e.dark;
    config.option = e.option;

    /*  */
    document.getElementById("url").value = config.url;
    document.getElementById("methods").value = e.method;
    document.getElementById("font").value = Number(config.font);
    document.getElementById("next").setAttribute("method", e.method);
    document.getElementById("prev").setAttribute("method", e.method);
    /*  */
    if (config.dark === "active") document.documentElement.setAttribute("dark", '');
    else document.documentElement.removeAttribute("dark");
    config[config.result ? "render" : "fetch"]();
});

window.addEventListener("resize", function (e) {
    if (config.timeout.resize) window.clearTimeout(config.timeout.resize);
    config.timeout.resize = window.setTimeout(function () {
        background.send("resize", {
            "width": e.target.innerWidth,
            "height": e.target.innerHeight
        });
    }, 1000);
}, false);

window.addEventListener("load", config.load, false);
background.receive("reload", function () { document.location.reload() });
document.addEventListener("dragover", function (e) { e.preventDefault() });
document.addEventListener("drop", function (e) { if (e.target.id !== "file") e.preventDefault() });
