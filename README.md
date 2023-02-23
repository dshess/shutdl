# Scrape a Shutterfly Share Site

An organization I'm a member of has had a share site for 15 years, across many
different members, some of who are no longer involved or reachable.  I wrote
this to scrape the data because Shutterfly doesn't appear to offer a reasonable
takeout option.

**WARNING** I attempted to make it work well, but I only have a single example
site, and this is honestly a collection of systems tied together with bailing
wire and masking tape.  If you thought "I could write a Puppeteer script to
scrape this, but I don't have time", this is probably a good starting point for
you.  If you have never programmed in your life, you are probably in for a rough
time.  Good luck!

## Installation

Install node.js: https://nodejs.org/en/

On OSX, I used MacPorts: https://ports.macports.org/

```sh
# Then install npm8, I have no idea if other versions work or not.
sudo port install npm8
```

I would expect HomeBrew to also have node.js: https://brew.sh/

---

On Ubuntu 20.04, this seemed to work:

```sh
# This seems to install npm6, so I guess older versions work?
sudo apt-get install npm
```

---

On Windows 10, I downloaded and installed 32-bit [Node.js
installer](https://nodejs.org/en/download/).  Then I downloaded and installed
32-bit [Git for Windows Setup](https://git-scm.com/download/win).  I was able to
clone from my git-bash window, but I had to run npm from a separate cmd window
for some reason.

---

Once node.js is installed:

```sh
# cd to someplace you'd like the code to live.
git clone https://github.com/dshess/shutdl.git
cd shutdl

# Install dependencies.
npm install
```

npm will warn something like `deprecated puppeteer@8.0.0: < 19.2.0 is no longer
supported`.  This just happens to be the version I copy/pasted used, and it
works for me.  I have set the dependency in package.json to 19.0.0, and updated
the browser flags so that it also works.

## Usage

```sh
# Directory to store the scraped data.
DIR="/path/to/directory"

# Some URL from the share site, such as the top page, or an album page.
URL="https://sharesite.shutterfly.com/pictures/5"

# Chromium storage for cookies and other session info.
DATADIR="/tmp/sdl"

npm start -- --user-data-dir="${DATADIR}"  --dir="${DIR}" --url="${URL}"
```

Chromium will launch and browse to a Shutterfly login page.  Login.  Chromium
should then automatically browse to your share site's main page and start
scraping data.

Scraping flakes out periodically.  Since it can take a few hours to happen, it's
challenging to debug properly.  Just run it again and it will pick up where it
left off.

Sometimes your login cookie gets stale.  You can try this to refresh:

```sh
npm start -- --user-data-dir="${DATADIR}" --dir="${DIR}" --url="${URL}" --login
```

This basically just gives you a browser.  Login to Shutterfly as necessary,
browse around the share site to make sure things work, then quit.  Restart
without --login and it should proceed from where it left off.

## Scraped results

The files left in DIR will be:

* `.../Info.json` - data scraped from the all-albums page.
* `.../[date] - [album name]/Info.json` - data scraped from an album page.
* `.../[date] - [album name]/[photo id].json` - data scraped from a photo page.
* `.../[date] - [album name]/[photo id]_[stuff].jpg` - downloaded photo.

The more-specific json files usually contain a superset of the information for
an object relative to the less-specific json files.  Photo names are heuristic,
my share had albums where all of the photos downloaded from the UI had the same
name (`name.jpg`, `name (1).jpg`, `name (2).jpg`, and so on).

Scraping can be interrupted and restarted.  In fact, my scraping often errored
out after so many minutes of scraping and had to be restarted multiple times.
It will just pick up where it left off.  Sometimes I had to run with --login to
get things back on track.

## Test site generation

```sh
npm run site -- --dir="${DIR}"
```

will generate html files to recreate a low-poly on-disk version of the share
site.  You should be able to open `DIR/index.html` in your browser and browse
around.  This is intended to be a quick way to let you verify that everything
worked.  It's not really setup to be served over the Internet.  It is a good
idea to glance over it to make sure all the images were downloaded fully.

## Problems

Sometimes, when the scraper attempts to run the page comes up as a dark-gray
background with no content, and it just hangs.  As best I can tell, this is a
tracking pixel breaking somewhere.  How I "fix" it is to right-click in the page
and select "Inspect", then select "Network", then refresh the page (or click in
url bar then enter).  One of the network requests will end up hanging, which is
why the code attempts to block some unnecessary requests.  Double-click it to
open in a new tab, and it will work fine - this will also clear things for the
main tab.  Unfortunately, this messes up the normal navigation, and I haven't
had time to track it down, so just quit out and restart.  The user-data-dir will
be primed with the right cookies and it will work fine.

Sometimes things just get entirely messed up.  For the most part, this has
happened when I changed something major, like running an npm command to update a
dependency.  So **probably** it won't happen.  Usually, deleting `DIR` and
`DATADIR` and starting over gets things rolling again.

If the code is reproducibly failing with something like `Error: failed to find
element matching selector ".pic-img-title"`, then consider adding
`page.waitForSelector(the_sel)` on the line before the failing line.  See
photoScraper.scrape(), for an example.
