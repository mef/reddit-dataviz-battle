# April 2020 - The memonavirus

[Reddit contest page](https://www.reddit.com/r/dataisbeautiful/comments/fwmsqr/battle_dataviz_battle_for_the_month_of_april_2020/)

The code in this directory builds a comment + infections graph dataset, based on the source log files.

## Setup

Code is in node.js. Install dependencies with the command below.

    npm install
    
## Usage

1. Copy the log files in the `data` directory of the [data source repository](https://github.com/dovedevic/memonavirus) into `./data/`
2. Build the graph with the command below

```
npm start 
```

You are done, results ares stored in `./data/contamination-graph.json` file.

// TODO document graph data format

