async function scrapeAll(browserInstance){
    let logger = console.log
    //logger = () => {}          // Comment this out to see logging.

    let browser;
    try{
        browser = await browserInstance;

        const pages = await browser.pages()
        let page = pages[0];
        
        await browser.close();
    }
    catch(err){
        console.log("Could not resolve the browser instance => ", err);
    }
}

module.exports = (browserInstance) => scrapeAll(browserInstance)
