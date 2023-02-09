const fs = require('fs');
const https = require('https');

const photoScraper = {
    async scrape(page, url, id) {
        let logger = console.log
        //logger = () => {}          // Comment this out to see logging.

        logger("url: ", url);
        await page.goto(url, {timeout: 0});

        let info = {};

        info.id = id;
        logger("photoId:", info.id);
        info.url = url;

        const title_sel = '.pic-img-title';
        info.title = await page.$eval(title_sel, item => item.innerText.trim());
        logger("title:", info.title);

        const added_sel = '#pic-detail-added';
        const added = await page.$eval(added_sel, item => item.innerText.trim());
        info.added = added.replaceAll("&nbsp;", " ");
        logger("added: ", info.added);

        const by_sel = '.format-pic-detail-menu';
        info.by = await page.$eval(by_sel, item => item.innerText.trim());
        logger("by: ", info.by);

        const tag_sel = '.pic-img-text';
        info.tag = await page.$eval(tag_sel, item => item.innerText.trim());
        logger("tag:", info.tag);

        // Shutterfly seems to name the file based on the title text.  Some
        // photos also have a different filename exposed, perhaps the original
        // upload name?
        let fname = info.title;
        if (info.tag.length > 0) {
            if (info.tag.split(" ").length == 2) {
                fname = info.tag.split(" ")[0];
            }
        }
        fname = fname.replaceAll("/", "_");

        // alt is added by the user, include id to make sure fname is unique.
        info.fname = info.id + "_" + fname;

        const suffix = /\.(JPG|jpg|JPEG|jpeg)$/;
        if (!info.fname.match(suffix)) {
            info.fname += ".jpg";
        }
        
        return info;
    },

    // TODO: Maybe combine these, again, to get rid of the double-goto.
    // TODO: Or figure out how to return the fetch URL?
    async download(page, url, fname, alt) {
        let logger = console.log
        //logger = () => {}          // Comment this out to see logging.

        logger("url: ", url);
        await page.goto(url, {timeout: 0});

        let imgUrl = "https://cmd.shutterfly.com/commands/async/downloadpicture";
        imgUrl += "?site=site";

        // TBD: Unique id for the image?
        const imageId = await page.evaluate("Shr.P.sections[0].shutterflyId");
        logger("id:", imageId);
        if (!imageId) {
            throw("Missing imageId");
        }
        imgUrl += "&id="+imageId;

        // TBD: Key for the overall collection?
        const collectionKey = await page.evaluate("Shr.P.sections[0].collectionKey");
        logger("collectionKey:", collectionKey);
        if (!collectionKey) {
            throw("Missing collectionKey");
        }
        imgUrl += "&collectionKey="+collectionKey;

        // TBD: Unique key per album?
        const albumKey = await page.evaluate("Shr.P.sections[0].albumKey");
        logger("albumKey:", albumKey);
        if (!albumKey) {
            throw("Missing albumKey");
        }
        imgUrl += "&albumKey="+albumKey;

        // TBD: I think this determines the name the file is downloaded to.
        // Probably not necessary since we'll be overriding it, but provided just in
        // case of consistency checks.
        imgUrl += "&title="+alt;
        logger("imgUrl:", imgUrl);

        // Attempt to fetch the image.
        https.get(imgUrl, res => {
            const stream = fs.createWriteStream(fname);
            res.pipe(stream);
            stream.on('finish', () => {
                stream.close();
            });
        });
    }
}

module.exports = photoScraper;
