function albumSubdir(date, title) {
    let logger = console.log
    logger = () => {}          // Comment this out to see logging.

    const months = {
        January: "01",
        February: "02",
        March: "03",
        April: "04",
        May: "05",
        June: "06",
        July: "07",
        August: "08",
        September: "09",
        October: "10",
        November: "11",
        December: "12",
    };
    logger("title: ", title);
    logger("date: ", date);

    const dateRe = /(\S+) (\d+), (\d+)/;
    const out = dateRe.exec(date);
    logger("out: ", out);
    newDate = out[3]+"-"+months[out[1]]+"-"+out[2].padStart(2, '0');
    return newDate + " - " + title.replace(/[/<>:"/\\|?*]/g, '_');
}

// Load the root URL, navigate to "All", then pull down the info about all of
// the albums.
async function scrapeRoot(page, rootUrl) {
    let logger = console.log
    logger = () => {}          // Comment this out to see logging.

    // TODO: Page id is also the last componend of the URL path.  For instance,
    // '5'.
    const id_page = await page.$eval('html', h => h.getAttribute('id'));
    const id = id_page.split("-")[0];
    logger("id:", id);

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
        await page.evaluate('Shr.AjaxDataGrid._16("All", '+id+')');
        logger("Waiting for: "+count_sel);
        await page.waitForSelector(count_sel);
    }

    let info = {}

    // Map back to the URL this was fetched from.
    info.url = rootUrl;

    const title_sel = '#header-title';
    info.title = await page.$eval(title_sel, item => item.innerText.trim());
    logger("title:", info.title);

    info.count = await page.$eval(count_sel, item => item.innerText.trim());
    logger("count:", info.count);

    const album_sel = '.pic-album';
    const albums = await page.$$(album_sel);

    info.albums = [];

    for (let i = 0; i < albums.length; i++) {
        const album = albums[i]
        let albumInfo = {}

        const id_sel = '.picAlbumTitle .i-edit';
        albumInfo.id = await album.$eval(id_sel, item => item.getAttribute('s:menuargs'))
        logger("id: ", albumInfo.id)

        let title_sel = '.picAlbumTitle .pic-album-title';
        albumInfo.title = await album.$eval(title_sel, item => item.innerText.trim());
        logger("title: ", albumInfo.title);

        const url_sel = '.picAlbumTitle .pic-album-title';
        albumInfo.url = await album.$eval(url_sel, item => item.getAttribute('href'))
        logger("url: ", albumInfo.url)

        let count_sel = '.picAlbumTitle .i-eye';
        albumInfo.count = await album.$eval(count_sel, item => item.innerText.trim());
        logger("count: ", albumInfo.count);

        let date_sel = '.pic-date';
        albumInfo.date = await album.$eval(date_sel, item => item.innerText.trim());
        logger("date: ", albumInfo.date);

        let caption_sel = '.pic-album-text';
        albumInfo.caption = await album.$eval(caption_sel, item => item.innerText.trim());
        logger("caption: ", albumInfo.caption);

        albumInfo.subdir = albumSubdir(albumInfo.date, albumInfo.title);

        info.albums.push(albumInfo)
    }

    return info;
}

module.exports = (page, dir) => scrapeRoot(page, dir)

// TODO: Would it make sense to just scrape directly out of internal structures?
// Shr.P.sections[0].count == album count.
// Shr.P.sections[0].groups == albums.
// Shr.P.sections[0].groups[0].created == album 0 unix epoch
// Shr.P.sections[0].groups[0].count == album 0 picture count
// Shr.P.sections[0].groups[0].title == album 0 title
// Shr.P.sections[0].groups[0].text == album 0 caption
// Shr.P.sections[0].groups[0].coverPicture{} == album 0 cover pic info
