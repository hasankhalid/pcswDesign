// function to round off numbers to a desired decimal
function roundToDec(num, decimal){
  return Math.round(num * (10**decimal)) / (10**decimal)
}

// reArrange indicators in a desired sequence
function reArrangeInds(data, indArray){
  if (indArray.length != 3){
    throw "length of indicator list is not equal to 3"
  }

  let reArrDat = [];

  data.forEach(d => {
    reArrDat.push({
      District: d.District,
      Ind1: roundToDec(+d[indArray[0]], 2),
      Ind2: roundToDec(+d[indArray[1]], 2),
      Ind3: roundToDec(+d[indArray[2]], 2),
      Division: d.Division
    })
  })
  return reArrDat;
}

function conIndNum(data){
  let indNames = Object.keys(data[0]);
  indNames.pop();
  indNames.shift();

  data.forEach(d => {
    indNames.forEach(ind => {
      d[ind] = roundToDec(d[ind], 2);
    })
  })
}


// defining the params for the chart
//const dataScProm = d3.csv('testScatter.csv');

const widthSVG = 750;
const heightSVG = 680;
const margins = {
  top: 50,
  bottom:70,
  left: 70,
  right: 150
}

const width = widthSVG - margins.left - margins.right;
const height = heightSVG - margins.top - margins.bottom;

//console.log(width, height)

let x = d3.scaleLinear()
          .domain([0, 100])
          .range([0, width]);

let y = d3.scaleLinear()
          .domain([0, 100])
          .range([height, 0]);

var xAxis = d3.axisBottom()
                  .scale(x);

let yAxis = d3.axisLeft()
                  .scale(y);

let radScale = d3.scaleSqrt()
                .domain([0, 100])
                .range([3, 18*0.7])

let colScale

let dataScProm;


async function drawAnimScatter() {
  dataScProm = await d3.csv('ScatterPlotInds.csv');
  conIndNum(dataScProm);

  let keys = Object.keys(dataScProm[0]);
  keys.shift();
  keys.pop();
  let randKeys = shuffle(keys).slice(0,3)
  console.log(randKeys);
  drawScatterPlot(dataScProm, ['Experienced physical or sexual spousal violence', 'Sought help post-violence', 'Experienced physical or sexual violence by other family members'], true);


  d3.select('#buttonHolder button').on('click', async function(){
    let reShufArr = shuffle(keys).slice(0,3);
    await transScatterPlot(dataScProm, 2000, reShufArr, true);
    drawCircVoronoi(d3.select('svg').select('g'), dataScProm, reShufArr, 30);
  })
}

drawAnimScatter()


function computeExtents(data, indArray){
  // isolating X and Y
  let X = data.map(d => d[indArray[0]]);
  let Y = data.map(d => d[indArray[1]]);
  // computing extents
  let XExtent = d3.extent(X);
  let YExtent = d3.extent(Y);
  // computing diffs
  let XDiff = XExtent[1] - XExtent[0];
  let YDiff = YExtent[1] - YExtent[0];
  // computing midpoints
  let XMid = XExtent[0] + (XDiff/ 2);
  let YMid = YExtent[0] + (YDiff/ 2);

  // updating XExtent or YExtent based on which difference is larger
  if (XDiff >= YDiff){
    YExtent = [YMid - (XDiff/2), YMid + (XDiff/2)];
    // in case the min is negative
    if (YExtent[0] < 0){
      YExtent = [0, YExtent[1] - YExtent[0]];
    }
  }
  else {
    XExtent = [XMid - (YDiff/2), XMid + (YDiff/2)];
    if (XExtent[0] < 0){
      XExtent = [0, XExtent[1] - XExtent[0]];
    }
  }
  // return the extents
  let marginBuffer = 0.02
  return {
    "x": [XExtent[0] - (XDiff * marginBuffer), XExtent[1] + (XDiff * marginBuffer)],
    "y": [YExtent[0] - (YDiff * marginBuffer), YExtent[1] + (YDiff * marginBuffer)]
  }
}


// define the dimensions and margins
function drawScatterPlot(data, indArray, scale){
  // setting up the SVG
  let SVG = d3.select('#scatterContain')
    .append('svg')
    .attr('height', heightSVG)
    .attr('width', widthSVG);

  console.log(computeExtents(data, indArray));

  if (scale == true) {
    x.domain(computeExtents(data, indArray).x);
    y.domain(computeExtents(data, indArray).y);
  }
  else if (scale == false){
    x.domain([0, 100]);
    y.domain([0, 100]);
  }


  // group for the SVG
  let SVGG = SVG.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  colScale = d3.scaleOrdinal(d3.schemePaired)
                  .domain(data.map(d => d.Division));

  // getting column names
  let indNames = Object.keys(data[0]);
  indNames.pop();
  indNames.shift();
  //console.log(indNames);

  SVGG.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => {
        return x(d[indArray[0]])
      })
      .attr('cy', d => y(d[indArray[1]]))
      .style('fill', d => colScale(d.Division))
      .style('fill-opacity', 0.65)
      .attr('r', d => radScale(d[indArray[2]]))
      .attr('class', d => removeSpace(d.District))
      .classed('dataEnc', true);


  SVGG.append('g')
     .attr('class', 'x axis')
     .attr('transform', 'translate(0,' + height + ')')
     .call(xAxis)
     .append('text')
     .text(indArray[0])
     .classed('x axis label', true)
     .attr('transform', `translate(${width/2}, 40)`)

  SVGG.append('g')
     .attr('class', 'y axis')
     .call(yAxis)
     .append('text')
     .text(indArray[1])
     .classed('y axis label', true)
     .attr('transform', `translate(-40, ${height/2}) rotate(270)`)
     .style('text-anchor', 'middle');


  // draw legend for the scatter chart
  makeNestCircLegend('svg', [90, 30], [0, 25, 100], radScale, indArray[2]);

  drawCircVoronoi(SVGG, data, indArray, 30);

  drawDivLegend(SVG, [650, 35], colScale, 'Division');

}

function drawDivLegend(selection, translate, legendScale, titleText) {
  selection.append("g")
    .attr("class", "legendOrdinal")
    .attr("transform", `translate(${translate[0]},${translate[1]})`);

  //defining the legend function
  let legendOrdinal = d3.legendColor()
    .shapePadding(2)
    .shapeWidth(16)
    .shapeHeight(10)
    .scale(legendScale);

  // legend for divisions
  let legendDiv = selection.select(".legendOrdinal");

  // call legend
  legendDiv.call(legendOrdinal);
  legendDiv.append('g')
          .classed('legendTitle', true)
          .classed('Division', true)
          .append('text')
          .text(titleText)
          .attr('transform', 'translate(0, -10)');

  // activating interaction with the legendCells
  legendDiv.selectAll('.cell').on('mouseover', HoverLegend(true))
  legendDiv.selectAll('.cell').on('mouseout', HoverLegend(false))
}

function HoverLegend(over){
  return function(d, i){
    d3.selectAll('circle.dataEnc')
      .filter(dat => dat.Division == d)
      .transition()
      .duration(50)
      .style('fill-opacity', over ? 1 : 0.65)

    d3.selectAll('circle.dataEnc')
      .filter(dat => dat.Division != d)
      .transition()
      .duration(50)
      .style('fill-opacity', over ? 0.2 : 0.65)
  }
}

function transScatterPlot(data, transDur, reArrArray, scale){
  // remove prior voronoi shit
  let selection = d3.select('svg').select('g')
  selection.select("defs").remove()
  selection.selectAll(".circle-catcher").remove()

  // scale or no scale
  if (scale == true) {
    x.domain(computeExtents(data, reArrArray).x);
    y.domain(computeExtents(data, reArrArray).y);
  }
  else if (scale == false){
    x.domain([0, 100]);
    y.domain([0, 100]);
  }

  return new Promise((resolve, reject) => {
    let SVGG = d3.select('svg').select('g');

    //let reArrData = reArrangeInds(data, reArrArray)

    SVGG.selectAll('circle')
        //.data(reArrData)
        .transition('bubbleTrans')
        .duration(transDur)
        .attr('cx', d => {
          return x(d[reArrArray[0]])
        })
        .attr('cy', d => y(d[reArrArray[1]]))
        .style('fill', d => colScale(d.Division))
        .style('fill-opacity', 0.65)
        .attr('r', d => radScale(d[reArrArray[2]]))
        .call(allTransitionEnd, resolve, null, [data])

    // updating axes
    SVGG.select('g.x.axis')
      .transition()
      .duration(transDur)
      .call(xAxis);

    SVGG.select('g.y.axis')
      .transition()
      .duration(transDur)
      .call(yAxis);


    // change labels
    d3.select('.x.axis.label').text(reArrArray[0]);
    d3.select('.y.axis.label').text(reArrArray[1]);
    d3.select('.legendGroup text.legendTitle').text(reArrArray[2]);
  })
}

// Danial's function to end all transitions
function allTransitionEnd(transition, callback, thisVal, args) {
    if (typeof callback !== "function") throw new Error("Wrong callback in endall");
    if (transition.size() === 0) { callback() }
    var n = 0;
    transition
        .each(function() { ++n; })
        .on("end", function() {
          if (!--n) callback.apply(thisVal, args);
        });
}

function makeNestCircLegend(CSSSelect = 'svg', transformArray, bubArray, bubScale, legendTitle){
  // appending a legendgroup
  let legendGroup = d3.select('svg')
                   .append('g')
                   .classed('legendGroup', true)
                   .attr('transform', `translate(${transformArray[0]}, ${transformArray[1]})`)

  //console.log(legendGroup);

  legendGroup.append('text')
           .text(legendTitle)
           .classed('legendTitle', true)
           .attr('dx', 40)
           .style('font-size', '12px')
           .style('text-anchor', 'start');

  let radius = bubScale(d3.max(bubArray));
  // hard code params such as Padding and font size for now
  let legLabelPadding = 5;
  let legLabFontSize = 8;

  const circGroups = legendGroup.selectAll('circle')
           .data(bubArray)
           .enter()
           .append('g')
           .classed('circLegendGroup', true)
           .attr('transform', d => `translate(0, ${radius - radScale(d)})`);

  circGroups.append('circle')
           .attr('r', d => radScale(d))
           .style('stroke', 'white')
           .style('stroke-width', '0.75px');

  circGroups.append('text')
           .text(d => d)
           .attr('dx', radius + legLabelPadding)
           .attr('dy', d => -(radScale(d) - legLabFontSize/2))
           .style('fill', 'white')
           .style('font-family', 'Montserrat')
           .style('font-size', `${legLabFontSize}px`)
}

function removeSpace(string){
  return string.split(" ").join("");
}

function randonGen(scale){
  return Math.random() * scale * [-1, 1][Math.floor(Math.random() * 2)];
}

function drawCircVoronoi(selection, data, indArray, circCatchRad){
  // setting up the voronoi
  let nodes = data;
  // defining the voronoi function
  let voronoi = d3.voronoi()
                 .x(d => x(d[indArray[0]]) + randonGen(.05))
                 .y(d => y(d[indArray[1]])+ randonGen(.05))
                 .extent([[0, 0], [width, height]]);

  //console.log(voronoi.polygons(nodes));

  let polygon =  selection.append("defs")
                  .selectAll(".clip")
                  .data(voronoi.polygons(nodes))
                  //First append a clipPath element
                  .enter().append("clipPath")
                  .attr("class", "clip")
                  //Make sure each clipPath will have a unique id (connected to the circle element)
                  .attr("id", (d, i) => {
                    //console.log(d.data.District);
                    return removeSpace(d.data.District)
                  })
                  //Then append a path element that will define the shape of the clipPath
                  .append("path")
                  .attr("class", "clip-path-circle")
                  .attr("d", d => "M" + d.join(",") + "Z");

  selection.selectAll(".circle-catcher")
     .data(nodes)
     .enter().append("circle")
     .attr("class", (d, i) => "circle-catcher " + removeSpace(d.District) )
     //Apply the clipPath element by referencing the one with the same countryCode
     .attr("clip-path", (d, i) => `url(#${removeSpace(d.District)})` )
     //Bottom line for safari, which doesn't accept attr for clip-path
     .style("clip-path", (d, i) => `url(#${removeSpace(d.District)})`)
     .attr("cx", function(d) {return x(d[indArray[0]]);})
     .attr("cy", function(d) {return y(d[indArray[1]]);})
     //Make the radius a lot bigger
     .attr("r", circCatchRad)
     .style("fill", "grey")
     .style("opacity", 0.0)
     .style("pointer-events", "all")
     //Notice that we now have the mousover events on these circles
     .on("mouseover", Hover(true))
     .on("mouseout",  Hover(false));
}

function Hover(over){
  return function(d, i){
    // getting the class and then the district
    let distSelect = d3.select(this).attr('class').replace("circle-catcher ", "");
    let xcoord = d3.select(this).attr('cx');
    let ycoord = d3.select(this).attr('cy');

    // selecting active elements
    d3.select(`circle.dataEnc.${distSelect}`)
      //.style('stroke', over ? 'white' : 'none')
      .transition()
      .duration(50)
      .style('fill-opacity', over ? 1 : 0.65)

    // add titles for districts
    d3.select(this)
      .call(addRemTitle);

    // selecting inactive elements
    d3.selectAll(`circle.dataEnc:not(.${distSelect})`)
      .transition()
      .duration(100)
      .style('fill-opacity', over ? 0.2 : 0.65)

    let SVGG = d3.select('svg').select('g');

    let lineData = [
      {"x1": xcoord, "y1": ycoord, "x2": xcoord, "y2": height},
      {"x1": xcoord, "y1": ycoord, "x2": 0, "y2": ycoord}
    ]

    if (over == true){
      SVGG.selectAll('line.labelLine')
        .data(lineData)
        .enter()
        .append('line')
        .classed('labelLine', true)
        .attr("x1", d => d.x1)
        .attr("y1", d => d.y1)
        .attr("x2", d => d.x2)
        .attr("y2", d => d.y2)
        .style('stroke', 'white')
        .style('stroke-width', 0.25)
        .style('stroke-dasharray', 2)
    }
    else {
      SVGG.selectAll('line').remove();
    }

    function addRemTitle(selection){
      console.log(selection);
      if (over) {
        selection.append('title')
          .style('fill', 'white')
          .text(d => d.District)
          //.style('fill', 'black');
      } else {
        selection.select('title')
          .remove();
      }
    }

  }
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
