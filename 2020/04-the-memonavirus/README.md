# April 2020 - The memonavirus

[Reddit contest page](https://www.reddit.com/r/dataisbeautiful/comments/fwmsqr/battle_dataviz_battle_for_the_month_of_april_2020/)

The code in this directory builds a comment + infections graph dataset, based on the source log files.

## Setup

Code is in node.js. git software is also  necessary, as `git` command is used to extract source data.

Install node module dependencies with the command below.

    npm install
    
## Usage

The following command extracts data from the online repository and run the data transformation scripts:

```
npm start 
```

The source repository is extracted in a temporary directory and will be deleted at reboot. This is because the data volume is 250+M, and is probably not needed in the long term.

The temporary directory name is displayed during the script's execution, and saved in the file `./data/metadata`.

// TODO add a cleanup script to remove the cloned repository once the processing is completed.

The data transformation script stores its results in `./data/contamination-graph.json` file.

// TODO document graph data format

### Run extraction only

```
npm run extract
```

### Run transformation only

The transform can run in stand-alone, using data source from the latest extraction run.

```
npm run transform
```



