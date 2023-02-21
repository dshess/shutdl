async function findRoot(page, startingUrl) {
    let logger = console.log
    //logger = () => {}          // Comment this out to see logging.

    logger("Navigate to ", startingUrl);
    try {
        let promise = page.goto(startingUrl, {timeout: 0});

        // HACK: Sometimes the initial request hangs.  Initiating a new request
        // sometimes jars it awake.
        if (false) {
            let newPage;
            try {
                newPage = await page.browser().newPage();
                await newPage.goto(startingUrl, {timeout: 5*1000});
                await newPage.close();
                newPage = {}
            } catch(err) {
                logger(err);
                if (newPage) {
                    await newPage.close();
                }
            }
        }

        await promise;
    } catch(err) {
        logger(err);
    }

    const signin_sel = '.signin-wrapper';
    let signin = await page.$(signin_sel);
    while (signin) {
        logger("Signin to Shutterfly");
        logger(signin);
        await page.waitForNavigation({timeout: 0});
        signin = await page.$(signin_sel);
    }

    const origin = await page.evaluate('window.location.origin');
    logger("origin:", origin);

    const picturesUrl = origin + "/pictures";    
    logger("Navigate to ", picturesUrl);
    await page.goto(picturesUrl, {timeout: 0});

    // TODO: This is dubious, it's selecting the URL associated with the link
    // around the [eye (count)] item for the top level.  But there are similar
    // items per photo.  Unfortunately, the "Pictures" link item uses onClick,
    // which would involve parsing out the parameter.
    const all_sel = '.section-header .i-eye';
    await page.waitForSelector(all_sel, {timeout: 100000});
    allUrl = await page.$eval(all_sel, item => item.getAttribute('href'));
    logger("allUrl:", allUrl);

    return allUrl;
}

module.exports = (page, startingUrl) => findRoot(page, startingUrl)
