const puppeteer = require('puppeteer');

async function startBrowser(){
    let browser;
    try {
        //console.log("Opening the browser......");
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--disable-setuid-sandbox",
                  "--disable-remote-fonts"],
            'ignoreHTTPSErrors': true,
            userDataDir: '/tmp/Shutdl'
        });
    } catch (err) {
        console.log("Could not create a browser instance => : ", err);
    }
    return browser;
}

module.exports = {
    startBrowser
};
