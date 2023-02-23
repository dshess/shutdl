async function scrapeAlbum(page, url, id) {
    let logger = console.log
    logger = () => {}          // Comment this out to see logging.

    let info = {};

    info.id = id;
    logger("id: ", info.id);

    const title_sel = '.title-text';
    info.title = await page.$eval(title_sel, item => item.innerText.trim());
    logger("title: ", info.title);

    info.url = url;

    // |count_sel| will match when all images are present, |pager_sel| will
    // match when a paged interface is present.  In the latter case, click "All"
    // and wait for things to update.
    const count_sel = '.navbar-paging>.all';
    const pager_sel = '.navbar-paging>.navbar-prev';
    logger("Waiting for: "+count_sel+','+pager_sel);
    await page.waitForSelector(count_sel + ',' + pager_sel);
    logger("Checking: "+pager_sel);
    if (await page.$(pager_sel)) {
        logger("Clicking All");
        // "Click" on the "All" button.
        await page.evaluate('Shr.AjaxDataGrid._16("All", "'+id+'")');
        logger("Waiting for: "+count_sel);
        await page.waitForSelector(count_sel);
    }
    info.count = await page.$eval(count_sel, item => item.innerText.trim());

    // TODO: .album-details second child might be cleaner?
    const captionId = '#n_'+id+'_text';
    logger("captionId:", captionId);
    info.caption = await page.$eval(captionId, item => item.innerText.trim());
    logger("caption: ", info.caption);
    
    info.photos = [];

    const photo_sel = '.pic-item';
    const photos = await page.$$(photo_sel);
        
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]

        let photoInfo = {};

        const border_sel = '.pic-img-border';
        const border = await photo.$(border_sel);

        const tip = await border.$eval('a', a => a.getAttribute('tip'));
        photoInfo.id = tip.split(":")[1];
        logger("id: ", photoInfo.id);

        photoInfo.url = await border.$eval('a', a => a.getAttribute('href'));
        logger("url: ", photoInfo.url);

        // TODO: I thought this would be a ref to the thumbnail, but it's
        // the photo's caption, and isn't always unique.
        photoInfo.alt = await border.$eval('img', i => i.getAttribute('alt'));
        logger("alt: ", photoInfo.alt);
        
        info.photos.push(photoInfo)
    }
    return info;
}

module.exports = (page, url, id) => scrapeAlbum(page, url, id)
