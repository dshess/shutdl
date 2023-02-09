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

    // Create a download URL for the image on a photo page.
    async downloadUrl(page) {
        let logger = console.log
        logger = () => {}          // Comment this out to see logging.

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
        // Probably not necessary since we'll be overriding it, but provided
        // just in case of consistency checks.
        const alt_sel = '.pic-detail-img .detail-img';
        const alt = await page.$eval(alt_sel, item => item.getAttribute('alt'));
        imgUrl += "&title="+alt;
        logger("imgUrl:", imgUrl);

        return imgUrl;
    }
}

module.exports = photoScraper;
