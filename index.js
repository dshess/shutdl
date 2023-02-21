const browserObject = require('./browser');
const scraperController = require('./scraperController');

// https://stackoverflow.com/a/58188006
const argv = (() => {
    const arguments = {};
    arguments.loose = [];
    process.argv.slice(2).map( (element) => {
        const simple = element.match('^--([a-zA-Z0-9][-a-zA-Z0-9]*)$');
        if (simple) {
            arguments[simple[1]] = true;
            return;
        }

        const matches = element.match( '^--([a-zA-Z0-9][-a-zA-Z0-9]*)=(.*)$');
        if ( matches ){
            arguments[matches[1]] = matches[2]
                .replace(/^['"]/, '').replace(/['"]$/, '');
            return;
        }
        arguments.loose.push(element);
    });
    return arguments;
})();

if (argv.help) {
    console.log("Usage: npm start -- --user-data-dir=<dir> --dir=<dir> --url=<url>");
    console.log("");
    console.log("--user-data-dir provides storage for the Chromium profile.");
    console.log("--dir is where scraped data is stored.");
    console.log("--url is some URL from the share site, such as a photo.");
    console.log("");
    console.log("Optional:");
    console.log("--login can be used to re-login after session timeout.");
    console.log("--nocache can force refetch of album or photo info.");
    console.log("--root causes only root album info to be fetched.");
    console.log("--album=id,id,id limits fetching to specific albums.");
    console.log("--nophotos to not fetch photos.");
    console.log("--photo=aid:pid,piid limits fetching to specific photos in a specific album.");
    process.exit(1);
}

// TODO: This is clunky.
let headless = false;
if (argv.headless) {
    headless = true;
} else if (argv.noheadless) {
    headless = false;
}

//Start the browser and create a browser instance
let browserInstance = browserObject.startBrowser(headless, argv["user-data-dir"]);

// Pass the browser instance to the scraper controller
scraperController(browserInstance, argv)
