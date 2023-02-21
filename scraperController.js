const fs = require('fs');
const https = require('https');
const rootScraper = require('./rootScraper.js');
const albumScraper = require('./albumScraper.js');
const photoScraper = require('./photoScraper.js');
const findRoot = require('./findRoot.js');

// If cacheFile exists and can be read as JSON, return it.  If not, call the
// generate function, and write the results into the cache file, then return
// them.
//
// If cacheFlag is false, refresh the cacheFile.
async function cacheOr(cacheFile, cacheFlag, generate) {
    let logger = console.log
    logger = () => {}          // Comment this out to see logging.

    if (cacheFlag) {
        try {
            fs.accessSync(cacheFile, fs.constants.F_OK);
            data = fs.readFileSync(cacheFile);
            const ret = JSON.parse(data);
            // TODO: Consider a verifier here.
            return ret;
        } catch (err) {
            // Only on ENOENT so that other kinds of failures don't lead to
            // sudden fetch storms.
            if (err.code != 'ENOENT') {
                throw(err);
            }
        }
    }

    const ret = await generate();
    logger("ret:", ret);

    const tmpFile = cacheFile + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(ret, null, 2));
    fs.renameSync(tmpFile, cacheFile);
    return ret;
}

async function scrapeAll(browserInstance, argv){
    let logger = console.log
    logger = () => {}          // Comment this out to see logging.

    if (!argv.dir) {
        console.log("--dir=<dir> is required.");
        process.exit(1);
    }

    const dirname = argv.dir;
    {
        try {
            fs.accessSync(dirname, fs.constants.D_OK);
        } catch(err) {
            if (err.code == 'ENOENT') {
                fs.mkdirSync(dirname);
            } else {
                console.log(err);
                process.exit(1);
            }
        }
    }

    const rootUrl = argv.url;
    if (!rootUrl) {
        console.log("--url=<url> root URL required.");
        process.exit(1);
    }
    
    let browser;
    try{
        browser = await browserInstance;

        const pages = await browser.pages()
        let page = pages[0];

        // NOTE: I found that sometimes the scraper got wedged, and as best I
        // could tell it was because of various tracking stuff.  This was an
        // attempt to weed out unnecessary cruft.  It seems to have worked for
        // me, but it's really not clear if it's the right approach.
        await page.setRequestInterception(true);
        page.on('request', intercepted_request => {
            const url = intercepted_request.url();
            // These all seem to not necessary.
            if (url.startsWith('https://sb.scorecardresearch.com/') ||
                url.startsWith('https://www.facebook.com/') ||
                url.startsWith('https://connect.facebook.net/') ||
                url.startsWith('https://www.mczbf.com/') ||
                url.startsWith('https://udc-neb.kampyle.com/') ||
                url.startsWith('https://assets.adobedtm.com/') ||
                url.startsWith('https://www.googletagservices.com/') ||
                url.startsWith('https://securepubads.g.doubleclick.net/') ||
                false) {
                intercepted_request.abort();
                return;
            }
            // These seem to be necessary.
            if (url.startsWith('data:') ||
                url.startsWith('https://accounts.tinyprints.com/') ||
                url.startsWith('https://accounts.shutterfly.com/') ||
                url.startsWith('https://www.shutterfly.com/') ||
                url.startsWith('https://beacon.shutterfly.com/') ||
                url.startsWith('https://iam.shutterfly.com/') ||
                url.startsWith('https://cmd.shutterfly.com/') ||
                url.startsWith('https://os.shutterfly.com/') ||
                url.startsWith('https://uniim-cp.shutterfly.com/') ||
                url.startsWith('https://uniim-share.shutterfly.com/') ||
                url.startsWith('https://cdn.staticsfly.com/') ||
                url.startsWith('https://cld1.staticsfly.com/') ||
                url.startsWith('https://cdn-stage.staticsfly.com/') ||
                url.startsWith('https://cdn.optimizely.com/') ||
                url.startsWith('https://fast.fonts.net/') ||
                url.startsWith('https://ajax.googleapis.com/') ||
                false) {
                intercepted_request.continue();
                return;
            }
            // TODO: Root share site URL is also necessary.

            // Default allow, since there could be interstitial ads on login.
            //console.log(intercepted_request.url());
            if (true) {
                intercepted_request.continue();
            } else {
                intercepted_request.abort();
            }
        });

        // For reasons I'm not clear about, sometimes the browser just hangs
        // waiting for the page to load.  To "fix" it, use --login, then bring
        // up the dev inspector, then click Network, then refresh the page, then
        // double-click the request which hangs to open in a new tab.  It
        // doesn't fix things for the current run, but due to the userDataDir
        // setting in browser.js, it will work for an hour or two.
        if (argv.login) {
            console.log("Login to the site and then close the browser");
            await page.goto(rootUrl, {timeout: 0});
            while (await page.waitForNavigation({timeout: 0})) {
                console.log("Still waiting.");
            }
            process.exit(1);
        }

        // TODO: --album implies --root, and --photo implies --album.  Should
        // --nocache apply to only the most specific part, or to the entire
        // stack?
        const noCache = argv.nocache;

        const rootInfoFile = dirname + "/Info.json";
        const rootInfo = await cacheOr(rootInfoFile, !noCache, (
            function (page, rootUrl){
                return async () => {
                    if (!rootUrl) {
                        console.log("--url=<url> root URL required.");
                        process.exit(1);
                    }

                    console.log("root:", rootUrl);
                    await page.goto(rootUrl, {timeout: 0});
                    const albumsUrl = await findRoot(page, rootUrl);

                    await page.goto(albumsUrl, {timeout: 0});
                    return await rootScraper(page, albumsUrl);
                }
            }
        )(page, rootUrl));

        // Short-circuit if root-only was requested.
        if (argv.root) {
            await browser.close();
            return;
        }

        let albumIds = {};
        let photoIds = {};
        if (argv.album) {
            argv.album.split(",").forEach((id) => {
                albumIds[id] = 1;
            });
        } else if (argv.photo) {
            if (argv.photo.indexOf(":") == -1) {
                console.log("--photo=albumId:photoId,photoId,photoId,...");
                process.exit();
            }
            const a = argv.photo.split(":");
            console.log(a);
            albumIds[a[0]] = 1;
            a[1].split(",").forEach((id) => {
                photoIds[id] = 1;
            });
        }

        for (const album of rootInfo.albums) {
            if ((argv.album || argv.photo) && !albumIds[album.id]) {
                continue;
            }

            logger("album:", album.id);

            const albumDir = dirname + "/" + album.subdir;
            try {
                fs.accessSync(albumDir, fs.constants.F_OK);
            } catch (err) {
                fs.mkdirSync(albumDir);
            }

            const albumInfoFile = albumDir + "/Info.json";
            logger("albumInfoFile:", albumInfoFile);
            const albumInfo = await cacheOr(albumInfoFile, !noCache, (
                function (page, url, id){
                    return async () => {
                        console.log("album:", url);
                        await page.goto(url, {timeout: 0});

                        return await albumScraper(page, url, id);
                    }
                }
            )(page, album.url, album.id));

            for (const photo of albumInfo.photos) {
                if (argv.nophotos || (argv.photo && !photoIds[photo.id])) {
                    continue;
                }

                logger("photo:", photo.id);

                const photoInfoFile = albumDir + "/" + photo.id + ".json";
                logger("photoInfoFile:", photoInfoFile);
                const photoInfo = await cacheOr(photoInfoFile, !noCache, (
                    function (page, url, id){
                        return async () => {
                            console.log("photo:", url);
                            await page.goto(url, {timeout: 0});

                            info = await photoScraper.scrape(page, url, id);

                            const imgPath = albumDir + "/" + info.fname;
                            logger("photoImageFile:", imgPath);

                            const imgUrl = await photoScraper.downloadUrl(page);
                            logger("photoImgUrl:", imgUrl);

                            // Attempt to fetch the image.
                            const tmpPath = imgPath + ".tmp";
                            https.get(imgUrl, res => {
                                const stream = fs.createWriteStream(tmpPath);
                                res.pipe(stream);
                                stream.on('finish', () => {
                                    stream.close();
                                    fs.renameSync(tmpPath, imgPath);
                                });
                            });

                            // 2s pause for rate limit.
                            await page.waitForTimeout(2000);

                            return info;
                        }
                    }
                )(page, photo.url, photo.id));
            }
        }

        await browser.close();
    } catch(err) {
        // TODO: This is copy/paste from a project which was copy/paste from an
        // example.  Maybe it would make more sense to just not have the try
        // block?
        console.log("error:", err);
        throw(err);
    }
}

module.exports = (browserInstance, argv) => scrapeAll(browserInstance, argv)
