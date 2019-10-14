# October 2019 - Visualize the Jump-Scares for over 500 horror, thriller, and sci-fi Movies

[Reddit contest page](https://www.reddit.com/r/dataisbeautiful/comments/dei68x/battle_dataviz_battle_for_the_month_of_october/)

## How to use

### Setup

    npm install
    
### Run the whole ETL

The following command extracts data from the online database and run the analysis scripts:

    npm start
    
Results are saved in the directory `output`.


### Run individual steps

The following data can be extracted from wheresthejump.com

#### Download all subtitle files

Download the `.srt` files announcing jump scares for the all the movies referenced in the website.

    npm run extract-subtitles
    
The subtitles are placed in the directory `./data/subtitles`.

#### Download the list of movies

Download the list of movies listed in `https://wheresthejump.com/full-movie-list/`, together with associated metadata:

* Director
* Year
* Jump count
* Jump Scare rating
* Netflix (US)
* Imdb rating

    npm run extract-subtitles

The results are saved in a JSON file: `./data/moviesList.json`.

### Build a timeline of all jump scare in all movies

This transformation script processes all the downloaded subtitles files and outputs a single file containing the jump-scare timestamps of all movies.

    npm run build-jumpscare-timeline

(!) node.js v12+ is required for this transformation to work, since `String.prototype.matchAll()` is used. Can be replaced by `Regexp.exec` in order to run on older versions of node.js (c.f. [MDN Article](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/matchAll).


The results are saved in a JSON file: `./data/jumpScareTimeline.json`.

