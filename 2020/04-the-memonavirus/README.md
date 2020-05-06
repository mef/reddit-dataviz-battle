# April 2020 - The memonavirus

[Reddit contest page](https://www.reddit.com/r/dataisbeautiful/comments/fwmsqr/battle_dataviz_battle_for_the_month_of_april_2020/)

The code in this directory builds a comment + infections graph dataset, based on the source log files.

## Setup

Code is in node.js. git software is also  necessary, as `git` command is used to extract source data.

Install node module dependencies with the command below.

    npm install
    
## Usage

### Run full process

The scripts extract data from the source, then run a set of processing scripts.

The following command executes the all steps.

```
npm start 
```

The results are stored inside directory `./data/dist`.

// TODO add inventory of expected output

The source repository is extracted in a temporary directory and will be deleted at reboot. This is because the data volume is 250+M, and is probably not needed in the long term.

The temporary directory name is displayed during the script's execution, and saved in the file `./data/metadata/datasourcePath`.

Intermediate results are stored in `./data/staging`.

// TODO add a cleanup script to remove the temporary data cloned repository once the processing is completed.

Whenever modifying the scripts, it is useful to run only parts of the steps. The various steps of the data extraction and transformation are broken down for this purpose. The next sections document how to run each part of the process individually.

### Extract source data

The following clones the data source git repository in a temporary folder

```
npm run extract
```

### Run transformations

The transform can run in stand-alone, as long as the extraction step has been executed once.

It chains all the transformation steps listed below.

```
npm run transform
```

### Build infection graph

This first step of the transform process builds a graph of comments and infections. The results are an export of the [Graphology](graphology.github.io/) instance, stored in `./data/staging/infection-graph.json`.

```
npm run transform:build-graph
```

### Compute general statistics

This script pulls figures out of the graph dataset:

* timeline of infections (and commenting activity): `./data/dist/infectionCurve.json`.
* (to be continued)


```
npm run transform:compute-stats
```

### Compute graph statistics

This script runs the following graph processing algorithms, saves the resulting graph export as well as a rendered graph visualization.

* to be completed



```
npm run transform:compute-graph-stats
```

### Customize transformations

In each transformation script, a set of functions is executed sequentially. The execution sequence is stored in the array `transformSteps`. Remove functions from this array to keep these steps (warning: some functions depend on the output of previous ones).

Add any function you want to this array, and make sure that it calls function `next` in order to proceed to the following step.

Open an issue if more details are needed.
