const fs = require('fs');
const jsrender = require('jsrender');

function main(){
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

    if (!argv.dir) {
        console.log("--dir=<dir> required.");
        return;
    }
    logger("dir:", argv.dir);

    // Load all of the data.  rootInfo is just the main Info file loaded.
    // For each album, the album-specific Info file is loaded as ._info.
    // For each photo, the photo-specific json file is loaded as ._info
    // on the photo.
    const rootInfoFile = argv.dir + "/Info.json";
    let rootInfo = JSON.parse(fs.readFileSync(rootInfoFile));
    for (let i = 0; i < rootInfo.albums.length; i++) {
        const albumInfoFile = argv.dir + "/" + rootInfo.albums[i].subdir + "/Info.json";
        rootInfo.albums[i]._info = JSON.parse(fs.readFileSync(albumInfoFile));
        for (let j = 0; j < rootInfo.albums[i]._info.photos.length; j++) {
            const photoInfoFile = argv.dir + "/" + rootInfo.albums[i].subdir + "/" + rootInfo.albums[i]._info.photos[j].id + ".json";
            rootInfo.albums[i]._info.photos[j]._info = JSON.parse(fs.readFileSync(photoInfoFile));
        }
    }
    logger("albums[0].photos[0]:", rootInfo.albums[0]._info.photos[0]);

    const rootIndexFilename = argv.dir + "/index.html";
    let rootIndexTmpl = jsrender.templates('./templates/root_index.html');
    let rootHtml = rootIndexTmpl(rootInfo);
    fs.writeFileSync(rootIndexFilename, rootHtml);

    for (let i = 0; i < rootInfo.albums.length; i++) {
        let albumInfo = rootInfo.albums[i];
        albumInfo.rootTitle = rootInfo.title;
        albumInfo.i = i+1;
        albumInfo.c = rootInfo.albums.length;
        if (i-1 >= 0) {
            albumInfo.prevAlbumDir = rootInfo.albums[i-1].subdir;
        }
        if (i+1 < rootInfo.albums.length) {
            albumInfo.nextAlbumDir = rootInfo.albums[i+1].subdir;
        }

        const albumIndexFilename = argv.dir + "/" + albumInfo.subdir + "/index.html";
        let albumIndexTmpl = jsrender.templates('./templates/album_index.html');
        let albumHtml = albumIndexTmpl(albumInfo);
        fs.writeFileSync(albumIndexFilename, albumHtml);
        
        for (let j = 0; j < albumInfo._info.photos.length; j++) {
            let photoInfo = albumInfo._info.photos[j];
            photoInfo.rootTitle = rootInfo.title;
            photoInfo.albumTitle = albumInfo.title;
            photoInfo.i = j+1;
            photoInfo.c = albumInfo._info.photos.length;
            if (j-1 >= 0) {
                photoInfo.prevPhoto = albumInfo._info.photos[j-1].id;
            }
            if (j+1 < albumInfo._info.photos.length) {
                photoInfo.nextPhoto = albumInfo._info.photos[j+1].id;
            }

            const photoIndexFilename = argv.dir + "/" + albumInfo.subdir + "/" + photoInfo.id + "_photo.html";
            let photoIndexTmpl = jsrender.templates('./templates/photo.html');
            let photoHtml = photoIndexTmpl(photoInfo);
            fs.writeFileSync(photoIndexFilename, photoHtml);
        }
    }
}

main();
