Scrape a Shutterfly Share Sites into local files.

Most basic usage:

Edit "userDataDir" setting in browser.js to make sure it will work for your
system.  This lets cookies work.  TODO: Add a command-line parameter?

Create a landing directory, it won't create that directory for you.

DIR=/path/to/directory
mkdir "${DIR}"

The URL for "View all albums" page of your site.  From the home url, click
"Pictures & Videos", then "Pictures".  TODO: Figure it out from the home page?

URL=https://sharesite.shutterfly.com/pictures/5

Launch Chromium and login to the share site to prime your cookies.

npm start -- --dir="${DIR}" --url="${URL}" --login

Start scraping:

npm start -- --dir="${DIR}" --url="${URL}"

You will see Chromium browsing around on the site while populating DIR.  The
files will be:

/Info.json - data scraped from the all-albums page.
/<date> - <album name>/Info.json - data scraped from an album page.
/<date> - <album name>/<photo id>.json - data scraped from a photo page.
/<date> - <album name>/<photo id>_<stuff>.jpg - downloaded photo.

The more-specific json files usually contain a superset of the information for
ath object relative to the less-specific json files.  Photo names are heuristic,
my share had albums where all of the photos downloaded from the UI had the same
name ("name.jpg", "name (1).jpg", "name (2).jpg", and so on).

Scraping can be interrupted and restarted.  In fact, my scraping often errored
out after so many minutes of scraping and had to be restarted multiple times.
It will just pick up where it left off.

---

Once complete, run:

npm run site -- --dir="${DIR}"

to generate html files to recreate a low-poly on-disk version of the share site.
This is intended to be a quick way to let you browser around to verify that
everything worked, it's not really setup to be served over the Internet.