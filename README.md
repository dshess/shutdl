Scrape a Shutterfly Share Sites into local files.

**WARNING** This breaks for no obvious reason.  See end of file.  **WARNING**

Most basic usage:

Edit "userDataDir" setting in browser.js to make sure it will work for your
system.  This lets cookies work.  TODO: Add a command-line parameter?

Create a landing directory, it won't create that directory for you:

```
DIR=/path/to/directory
mkdir "${DIR}"
```

Set the root URL for the "View all albums" page of your site.  From the home url
(something like "mysite.shutterfly.com"), click "Pictures & Videos", then
"Pictures".  [TODO: Figure it out from the home page?]

```
URL=https://sharesite.shutterfly.com/pictures/5
```

Launch Chromium and login to the share site to prime your cookies:

```
npm start -- --dir="${DIR}" --url="${URL}" --login
```

Start scraping:

```
npm start -- --dir="${DIR}" --url="${URL}"
```

You will see Chromium browsing around on the site while populating DIR.  The
files will be:

* .../Info.json - data scraped from the all-albums page.
* .../[date] - [album name]/Info.json - data scraped from an album page.
* .../[date] - [album name]/[photo id].json - data scraped from a photo page.
* .../[date] - [album name]/[photo id]_[stuff].jpg - downloaded photo.

The more-specific json files usually contain a superset of the information for
an object relative to the less-specific json files.  Photo names are heuristic,
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
everything worked, it's not really setup to be served over the Internet.  It is
a good idea to glance over it to make sure all the images were downloaded fully.

---

Sometimes, when the scraper attempts to run the page comes up as a dark-gray
background with no content, and it just hangs.  As best I can tell, this is a
tracking pixel breaking somewhere.  How I "fix" it is to right-click in the page
and select "Inspect", then select "Network", then refresh the page (or click in
url bar then enter).  One of the network requests will end up hanging.
Double-click it to open in a new tab, and it will work fine - this will also
clear things for the main tab.  Unfortunately, this messes up the normal
navigation, and I haven't had time to track it down, so just quit out and
restart.  The user-data-dir will be primed with the right cookies and it will
work fine.