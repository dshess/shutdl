const fs = require('fs');
const https = require('https');
const rootScraper = require('./rootScraper.js');
const albumScraper = require('./albumScraper.js');
const photoScraper = require('./photoScraper.js');

// If cacheFile exists and can be read as JSON, return it.  If not, call the
// generate function, and write the results into the cache file, then return
// them.
//
// If cacheFlag is false, refresh the cacheFile.
async function cacheOr(cacheFile, cacheFlag, generate) {
    let logger = console.log
    //logger = () => {}          // Comment this out to see logging.

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
    fs.writeFileSync(cacheFile, JSON.stringify(ret, null, 2));
    return ret;
}

async function scrapeAll(browserInstance){
    let logger = console.log
    //logger = () => {}          // Comment this out to see logging.

    // https://stackoverflow.com/a/58188006
    const argv = (() => {
        const arguments = {};
        arguments.loose = [];
        process.argv.slice(2).map( (element) => {
            const simple = element.match('^--([a-zA-Z0-9]+)$');
            if (simple) {
                arguments[simple[1]] = true;
                return;
            }

            const matches = element.match( '^--([a-zA-Z0-9]+)=(.*)$');
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
        console.log("Usage: npm start -- --dir=<dir>");
        console.log("");
        console.log("<dir> - root for storing scraped data.  Must exist.");
        process.exit(1);
    }

    const dirname = argv.dir;
    {
        try {
            fs.accessSync(dirname, fs.constants.D_OK);
        } catch(err) {
            if (err.code == 'ENOENT') {
                console.log("Create output dir:");
                console.log("  mkdir "+dirname);
                process.exit(1);
            }
            console.log(err);
            process.exit(1);
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
                    logger("Navigate to ", rootUrl);
                    await page.goto(rootUrl, {timeout: 0});

                    return await rootScraper(page, rootUrl);
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
                        logger("Navigate to ", url);
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
                            logger("Navigate to ", url);
                            await page.goto(url, {timeout: 0});

                            info = await photoScraper.scrape(page, url, id);

                            const imgPath = albumDir + "/" + info.fname;
                            logger("photoImageFile:", imgPath);

                            const imgUrl = await photoScraper.downloadUrl(page);
                            logger("photoImgUrl:", imgUrl);

                            // Attempt to fetch the image.
                            https.get(imgUrl, res => {
                                const stream = fs.createWriteStream(imgPath);
                                res.pipe(stream);
                                stream.on('finish', () => {
                                    stream.close();
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
    }
    catch(err){
        console.log("Could not resolve the browser instance => ", err);
    }
}

module.exports = (browserInstance) => scrapeAll(browserInstance)
