const puppeteer = require('puppeteer');

async function startBrowser(headless, userDataDir){
    let browser;
    try {
        //console.log("Opening the browser......");
        browser = await puppeteer.launch({
            headless: headless,
            defaultViewport: null,
            args: ["--disable-setuid-sandbox",
                  "--disable-remote-fonts"],
            'ignoreHTTPSErrors': true,
            userDataDir: userDataDir
        });
    } catch (err) {
        console.log("Could not create a browser instance => : ", err);
    }
    return browser;
}

module.exports = {
    startBrowser
};
