import React, { Component } from 'react';
import ReactDOM, { render } from 'react-dom';
import * as d3 from "d3";
import { timelines } from 'd3-timelines';
import _ from 'lodash';
import $ from 'jquery';
import Component3 from './Component3';
import { renderIntoDocument } from 'react-dom/test-utils';

class Component1_2 extends Component {
    constructor(props) {
        super(props);
        this.state = {
            width: window.innerWidth-100,
            origWidth: window.innerWidth-100,
            height: this.props.property.svg_height,
            resizeData: this.props.incidents,
            resizeFtime: "f0",
            resizeFstate: ["all"],
            resizeFilter: false,
            resizeClick: false,
            resizeZStart: null,
            resizeZEnd: null,
            resizeZoom: false
        };
        this.ref1 = React.createRef();
        this.updateDimensions = this.updateDimensions.bind(this);
        this.remove = this.remove.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.update = this.update.bind(this);
    }

    createTimelineChart() {
        let resizeData = this.props.incidents;
        let resizeFtime = "f0";
        let resizeFstate = ["all"];
        let resizeFilter = false;
        let resizeClick = false;
        let resizeZoom = false;
        let resizeZStart = null;
        let resizeZEnd = null;
        window.addEventListener("resize", function () {
            this.setState({
                resizeData: resizeData,
                resizeFtime: resizeFtime,
                resizeFstate: resizeFstate,
                resizeFilter: resizeFilter,
                resizeClick: resizeClick,
                resizeZStart: resizeZStart,
                resizeZEnd: resizeZEnd,
                resizeZoom: resizeZoom
            });
        }.bind(this));
        
        /**
         * Saving props with info about incident to variables.
         */
        let incident = this.props.incidents;
        let origIncidents = this.props.incidents;
        let properties = this.props.property;
        let popup = this.props.popup;
        let description = this.props.description;
        let color = ["#30d2ff"];
        let onclickData = [];
        let onclick1Incident = 0;

        // defined own color for whole incident
        if (typeof properties.incidentColor != "undefined") {
            color = properties.incidentColor;
        }

        /**
         * Using d3-timelines library to draw the chart and defining svg.
         */
        let height = properties.svg_height;
        let width = document.body.clientWidth; 
        let chart = timelines();
        $(".component2").css("max-height", height)
        let svg = d3.select(this.ref1.current)
            .append("svg")
            .attr("id", "svg-container")
            .attr("width", this.state.width)
            .attr("height", height);
        
        let container = d3.select(".component2")
            .append("div")
            .attr("id", "div-container");
        
        let div = container.append("div")
            .attr("id", "popup")
            .style("opacity", 0);

        let dashboardWindow = d3.select("#window");

        /**
         * Creating corresponding format of input data to the chart.
         */
        incident = JSON.parse(JSON.stringify(incident).split('"states":').join('"times":'));
        incident = JSON.parse(JSON.stringify(incident).split('"ID":').join('"label":'));
        let data = [];
        let origData = [];
        let i = 0;
        let domain; 
        let range = [];
        // check if defined in file
        if (typeof properties.domain != "undefined") {
            domain = properties.domain;
            if (typeof properties.colors != "undefined") {
                properties.colors.forEach(e => {
                    range.push(e.domain);
                });
            }
        }
        // data for filtering and sorting from actual to old
        let objTime = {};
        let filterArray = [];
        let pomArrS = [];
        let pomArrE = [];

        /**
         * Find beginnig and ending of chart.
         * @param {Array} d - Data to viz. 
         */
       function changeBegEnd(d) {
           pomArrS = [];
           pomArrE = [];
           d.forEach(d => {
               pomArrS.push(new Date(d.created).getTime());
                if (typeof d.resolved != "undefined") {
                    pomArrE.push(new Date(d.resolved).getTime());
                }
                else if (typeof d.closed != "undefined") {
                    pomArrE.push(new Date(d.closed).getTime());
                }
                else {
                    pomArrE.push(new Date().getTime());
                }
           });
            let result = {  start: pomArrS.sort(function(a, b) {return a - b;})[0], 
                            end: pomArrE.sort(function(a, b) {return b - a;})[0]};
            return result;
       };

       /**
        * Setting other parameters of chart like color, sorting from current to older, ...
        */
       let oldColor = [];
       let counter = 0;
       let y = 0;
       let numberCount = [];
        data = incident;
        data.forEach(d => {
            d.label = "#" + d.label;
            numberCount.push(d.label.length - 1);
            // sorting by actual incidents from up down
            objTime["start"] = new Date(d.created).getTime();
            if (typeof d.resolved != "undefined") 
                objTime["end"] = new Date(d.resolved).getTime();
            else if (typeof d.closed != "undefined")
                objTime["end"] = new Date(d.closed).getTime();
            else 
                objTime["end"] = new Date().getTime();
            filterArray.push(objTime);

            d.times.forEach(e => {
                e.starting_time = new Date(e.starting_time);
                e.ending_time = new Date(e.ending_time);
                if (e.ending_time == "Invalid Date")
                    if (typeof d.closed != "undefined") 
                        e.ending_time = new Date(d.closed); 
                    else  
                        e.ending_time = new Date();
                // color the rectangles as defined in json file
                if (range.includes(e[domain])) {
                    e["color"] = properties.colors[range.indexOf(e[domain])].color;
                }
                e["x"] = i;
                i++;
            });
            objTime = {};
        });

        /**
         * Filtering input data - actual on top 
         */
        let j = 0;
        let start_date, end_date;
        filterArray.forEach(f => {
            pomArrS.push(f.start);
            pomArrE.push(f.end);
            j++;
        });
        start_date = new Date (Math.min.apply(null, pomArrS));
        end_date = new Date (Math.max.apply(null, pomArrE));

        // filtered times -> change to indexes of filterArray
        pomArrS.sort(function(a,b){return (b-a)});
        pomArrE.sort(function(a,b){return (b-a)});

        j = 0;
        // get indexes
        filterArray.forEach(f => {
            let indexS = pomArrS.indexOf(f.start);
            pomArrS[indexS] = j;
            let indexE = pomArrE.indexOf(f.end);
            pomArrE[indexE] = j;
            j++;
        });
    
        let help = [];
        // sort from actula to old
        for (let i = 0; i < pomArrS.length; i++) {
            let s = pomArrS[i];
            if (typeof data[s].resolved != "undefined") {
                pomArrS.push(s);
                pomArrS.splice(pomArrS.indexOf(s), 1);
            }
            let e = pomArrE[i];
            if (typeof data[e].resolved != "undefined") {
                pomArrE.push(e);
                help.unshift(pomArrE.indexOf(e));
                //pomArrE.splice(pomArrE.indexOf(e), 1);
            }
        };
        help.forEach(h => {
            pomArrE.splice(h, 1)
        });

        // swap the sorted data with original 
        let swap = [];
        for(let i = 0; i < data.length; i++) {
            swap.push(data[pomArrE[i]]);
        };
        data = swap;
        origData = data;
        

        // Defining own color -> incidentX_property.json
        let colorScale = d3.scaleOrdinal().range(color);
        
        // Time constants.
        const day = 24 * 60 * 60 * 1000; 
        const week = 7 * day;
        const month = 4  * week;     
        const today = new Date().getTime();

        let incidentsWithIcons = [];
        // variable used for proper padding of labels
        let left = 13 + parseInt((Math.max.apply(null, numberCount)*7));

        // variables for zooming
        let origBegEnd = changeBegEnd(data);
        let actBegEnd = changeBegEnd(data);
        let ZTIME = 1; //60
        let zooming = false;

        d3.select(".component3").style("visibility", "hidden")

        function showHideIcons() {
            let checkIcons = [];
            data.forEach(d => {
                let label = parseInt(d.label.split("#").join(""));
                if (incidentsWithIcons.includes(label)) {
                    checkIcons.push(label);
                }
            });
            checkIcons.sort();
            incidentsWithIcons.sort();
            if (_.isEqual(checkIcons, incidentsWithIcons) == false) {
                let hideID = incidentsWithIcons.filter(x => !checkIcons.includes(x));
                checkIcons.forEach(e => {
                    d3.select("#iconDiv"+e).style("visibility", "visible");
                    createIconDiv(e);
                });
                hideID.forEach(e => {
                    d3.select("#iconDiv"+e).style("visibility", "hidden");
                });
            }
            else {
                incidentsWithIcons.forEach(e => {
                    d3.select("#iconDiv" + e)
                        .style("visibility", "visible");
                    createIconDiv(e);
                })
            }
        }

        /**
         * Creating chart. 
         * @param {Date} beg - Start date of chart.
         * @param {Date} end - End date of chart.
         */
        function createChart(beg, end) {
            let ch = timelines().rotateTicks(35)
            .margin({left: left, right: 30, top: 40, bottom: 0})
            .itemHeight(properties.state_height)
            .colors(colorScale)
            .beginning(beg)
            .ending(end)
            .stack()
            .tickFormat({
                format: d3.timeFormat("%d/%m"),
                tickTime: d3.timeDays,
                tickInterval: 1,
                tickSize: 10})
            /**
             * When mouse is out of the rect recover all attributes.
             */
            .mouseout(function (d, i, datum) {
                let id = d.srcElement.id;
                let element = document.getElementById(id);
                if (typeof oldColor[0] != "undefined") {
                    element.style.fill = oldColor[0].color;
                    svg.select("rect[id="+id+"]").attr("height", properties.state_height).attr("y", y);
                    oldColor.length = 0;
                    div.transition()
                        .duration(200)  
                        .style("opacity", 0);
                    counter = 0;
                }
            }) 
            /**
             * When hover over rect -> higher rect and change color
             */
            .hover(function (d, i, datum, h){
                counter++;
                let id = d.srcElement.id;
                let numID = id.replace(/timelineItem_[0-9]*_/, "");
                let dataID = id.replace(/timelineItem_/, "");
                dataID = dataID.replace(/_[0-9]*/, "");
                // save old color of element to restore it
                if (counter == 1) {
                    oldColor.push({color: document.getElementById(id).style.fill});
                    let element = document.getElementById(id);
                    let newColor = oldColor[0].color;
                    element.style.fill = newColor.slice(0, -1) + ", 0.8)";
                    y = svg.select("rect[id="+id+"]").attr("y");
                    svg.select("rect[id="+id+"]").attr("height", (properties.state_height + 3)).attr("y", (y - 5));
                }
                // popup
                div.transition()
                    .duration(200)  
                    .style("opacity", .9);
                let state = data[dataID].times[numID];
                let formatTime = d3.timeFormat("%H:%M");
                let formatDay = d3.timeFormat("%d/%m");
                let Sday = formatDay(state.starting_time);
                let Eday = formatDay(state.ending_time);
                let content = "";
                if (Sday == Eday) {
                    content = "day:" + Sday + "<br/>"; 
                } else {
                    content = "day:" + Sday + " - " + Eday + "<br/>";
                }
                content += "time:" + formatTime(state.starting_time) + " - " + formatTime(state.ending_time) + "<br/>";
                popup.forEach(e => {
                if (Object.keys(state).includes(e)) {
                    content += e + ": " + state[e] + "<br/>";
                }
                });
                div.html(content)
                    .style("left", (d.layerX + 10) + "px")
                    .style("top", (d.layerY) + "px");
                
            })
            .click(function(d, i, datum, x, rect) {
                let id = d.srcElement.id;
                id = id.replace("timelineItem_", "");
                let index = id.substring(id.indexOf("_")+1);
                id = id.substring(0, id.indexOf("_"));
                
                // render component 3
                d3.select(".component3").selectAll("*").remove();
                d3.select("#root3").style("visibility", "hidden");
                d3.select("#root4").style("visibility", "hidden");
                onclick1Incident++;
                if ((data.length == 1) && (onclick1Incident > 1) ) {
                    console.log("--1--")
                    renderIntoDocument(<Component3 incident={data[id]} description={description} property={properties} clickedState={index}></Component3>);
                    //document.getElementById("state"+index).scrollIntoView();
                } else {
                    onclickData = data;
                    renderIntoDocument(<Component3 incident={data[id]} description={description} property={properties} clickedState={null}></Component3>);
                    // redraw chart
                    let idata = [data[id]];
                    let startEnd = changeBegEnd(idata);
                    let ch = createChart(startEnd.start, startEnd.end);
                    data = idata;
                    resizeClick = true;
                    y = y - id * (properties.state_height+5);
                    redrawChart(ch); 
                    showHideIcons();

                    // hide popup on state when clicked
                    div.transition()
                        .duration(200)  
                        .style("opacity", 0); 

                    // save data for scaling TODO
                    resizeData = data;
                    origBegEnd = changeBegEnd(data);
                    actBegEnd = changeBegEnd(data);
                    recovery1.style("visibility", "visible");

                    // show 1 incident in window
                    dashboardWindow
                        .style("border", "0.2px solid rgb(151, 151, 151)")
                        .style("border-radius", "3px")
                        .style("background", "rgba(235, 235, 235, 0.95)")
                        .style("box-shadow", "4px 4px 8px 0 rgba(0, 0, 0, 0.2)")
                        .style("padding", "10px")
                        .style("margin", "50px 0");

                    d3.select(".component3").style("visibility", "visible");
                    d3.select("#filterBtn").style("opacity", 0);
                    d3.select("#recoveryBtn").style("opacity", 0);
            }})

            /**
             * Show right format of dates.
             */
            let withoutday = d3.timeFormat("%H:%M");
            let withday = d3.timeFormat("%d/%m %H:%M");
            let datum = d3.timeFormat("%d/%m");
            let days = (end - beg) / day;
            let interval = 1;
            //console.log(window.innerWidth)
            if (window.innerWidth <= 900) interval = 2;
            if (window.innerWidth <= 600) interval = 3;
            if (days <= 1) {
                ch.tickFormat({
                    format:  function (d, i) {
                        if (i % interval == 0)
                            return withoutday(d);
                        else return;
                    },
                    tickTime: d3.timeHours,
                    tickInterval: 1,
                    tickSize: 10});
            }
            else if (days <= 6) {
                ch.tickFormat({
                    // every new day show it's date
                    format: function (d, i) {
                        if (i % interval == 0) {    
                            if ((i == 0) || d.getHours() == 0) return withday(d);
                            else return withoutday(d);
                        }
                    },
                    tickTime: d3.timeDays,
                    tickInterval: 1,
                    tickSize: 10});
            }
            else {
                let x;
                ch.tickFormat({
                    // days are not repeating
                    format: function(d, i) {
                        if (i % interval == 0) {
                            if (i == 0) {
                                x = d;
                                return datum(d);
                            }
                            if ((i != 0) && (datum(d) != datum(x))) {
                                x = d;
                                return datum(d);
                            }
                            else {
                                x = d;
                                return;
                            }
                        }
                    },
                    tickTime: d3.timeDays,
                    tickInterval: 1,
                    tickSize: 10});
            }
            return ch;
        }   

        /**
         * 
         * @param {d3-timelines} chart - Chart which should be redraw.  
         */
        function redrawChart(chart) {
            svg.selectAll("*").remove();
            svg.datum(data).call(chart);
            svg.selectAll("rect")
                .style("stroke", "black")
                .style("stroke-width", "0.2px");

            // double date printing => erase ticks
            var childNode = document.querySelectorAll(".tick");
            childNode.forEach(e => {
                e.childNodes.forEach(v => {
                    if (v.nodeName === "text") {
                        if (v.textContent == "") {
                            d3.select(e).attr("opacity", 0);
                        }
                    }
                });
            });
        }

        /**
         * Function update for updating chart when filtering.
         * @param {Array} d - Data which were viz.
         * @param {String} ftime - Selected time from to.
         * @param {Array} fstate - Selected states which should be viz.
         */
        function update(d, ftime, fstate) {
            let timeAlert = false;
            let stateAlert = false;
            let chart;
            let result = true;
            let newData = [];
            let count = 0;
            resizeFtime = ftime;
            resizeFstate = fstate;
            origData.forEach(d => {
                if (fstate.includes(d.times[d.times.length - 1].status)) {
                    newData.push(d);
                    count++;
                }
            });
            
            if ((count == 0) && (fstate.includes("all") == false)) {
                data = d;
                stateAlert = true;
            }
            else if ((fstate.includes("all") == false))
                data = newData;
            else 
                data = origData.slice();
            let BegEnd = changeBegEnd(data);
            actBegEnd = BegEnd;
            switch (ftime) {
                case "f0":
                    chart = createChart(BegEnd.start, BegEnd.end);
                    break;
                case "f24":
                    if (today-day < BegEnd.end) {
                        BegEnd.start = today-day;
                        BegEnd.end = today;
                        chart = createChart(today-day, today);
                    }
                    else {
                        BegEnd = changeBegEnd(d);
                        chart = createChart(BegEnd.start, BegEnd.end);
                        timeAlert  = true;
                        data = d;
                    }
                    break;
                case "fweek":
                    if (today-week < BegEnd.end) {
                        BegEnd.start = today-week;
                        BegEnd.end = today;
                        chart = createChart(today-week, today);
                    }
                    else {
                        BegEnd = changeBegEnd(d);
                        chart = createChart(BegEnd.start, BegEnd.end);
                        timeAlert = true;
                        data = d;
                    }    
                    break;
                case "fmonth":
                    if (today-month < BegEnd.end) {
                        BegEnd.start = today-month;
                        BegEnd.end = today;
                        chart = createChart(today-month, today);
                    }
                    else {
                        BegEnd = changeBegEnd(d);
                        chart = createChart(BegEnd.start, BegEnd.end);
                        timeAlert = true;
                        data = d;
                    } 
                    break;
            }   
            actBegEnd = BegEnd;
            if  ((stateAlert == true) && (timeAlert == false)) {
                filterAlert(1);
                result = false;
                chart = createChart(start_date, end_date);
            }
            else if ((stateAlert == true) && (timeAlert == true)) {
                filterAlert(0);
                result = false;
            }
            else if ((stateAlert == false) && (timeAlert == true)) {
                filterAlert(0);
                result = false;
            }
            
            // dont show incident when there is no data for voz time
            data.forEach(d => {
                if (d.times[d.times.length -1].ending_time < BegEnd.start) {
                    data.splice(data.indexOf(d) );
                }
            })
            
            redrawChart(chart);
            resizeData = data;
            origBegEnd = Object.assign(origBegEnd, BegEnd)
            //origBegEnd = changeBegEnd(data);
            // icons viz. 
            let checkIcons = [];
            data.forEach(d => {
                let label = parseInt(d.label.split("#").join(""));
                if (incidentsWithIcons.includes(label)) {
                    checkIcons.push(label);
                }
            });

            showHideIcons();

            // double date printing => erase ticks
            var childNode = document.querySelectorAll(".tick");
            childNode.forEach(e => {
                e.childNodes.forEach(v => {
                    if (v.nodeName === "text") {
                        //console.log(v.textContent);
                        if (v.textContent == "") {
                            d3.select(e).attr("opacity", 0);
                        }
                    }
                });
            });

            return result;
        }

        /**
         * Creating/changing parameters of icon div. 
         * @param {integer} id Id of incident which icon should be processed.
         */
        function createIconDiv(id) {
            let where = "";
            let counter = 0;
            let i = 0;
            data.forEach(d => {
                //console.log(id);
                if (d.label == ("#" + id)) {
                    where = ".timelineSeries_" + i;
                    counter++;
                }
                i++;
            });
            //console.log(where);
            if (counter > 0) {
                let y = svg.select(where).attr("y");
                d3.select("#iconDiv"+id)
                    .style("top", (parseInt(y) + 2) + "px")
                    .style("left", document.getElementsByClassName("component2")[0].clientWidth-60 + "px")
                    .style("position", "absolute");
            }
        }
        /**
         * Div for alert notification when filering. 
         */
        let alertDiv = container
            .append("div")
            .attr("id", "alertDiv");
        function filterAlert(flag) {
            if (flag == 0)
                d3.select("#alertDiv").style("visibility", "visible")
                    .text("Ve zvoleném intervalu se nenachází žádný stav!");
            else 
                d3.select("#alertDiv").style("visibility", "visible")
                    .text("Požadavkům nevyhovuje žádný incident!");
            setTimeout(function () {   
                d3.select("#alertDiv").style("visibility", "hidden"); 
            }, 5000);
        }

        /**
         * Elements for filtering select.
         */
        let filtrClick = false;
        let filtering = false;
        let ftime;
        let fstate = [];
        container.append("button")
            .attr("id", "filterBtn")
            .text("Filtr")
            .on("click", function(){
                if (filtrClick == false) {
                    filterDiv.style("visibility", "visible");
                    filtrClick = true;
                }
                else {
                    filterDiv.style("visibility", "hidden");
                    filtrClick = false;
                }
            });
        // Component 1 -> just one incident don't show the button
        if (data.length == 1) {
            d3.select("#filterBtn").style("visibility", "hidden");
        }
        // Button for recovering to original dashboard.
        let recovery1 = container.append("span")
            .attr("class", "fas fa-times")
            .attr("id", "recoveryBtn1")
            .style("visibility", "hidden")
            .on("click", function() {
                data = onclickData;
                let x = changeBegEnd(data);
                let ch = createChart(x.start, x.end);
                redrawChart(ch);
                resizeData = data;
                resizeClick = false;
                origBegEnd = changeBegEnd(data);
                actBegEnd = changeBegEnd(data);
                onclick1Incident = 0;

                d3.select("#root3").style("visibility", "visible");
                d3.select("#root4").style("visibility", "visible");
                d3.select("#moreBtn").style("visibility", "hidden");
                d3.select("#prevBtn").style("visibility", "hidden");
                recovery1.style("visibility", "hidden");
                showHideIcons();

                dashboardWindow
                    .style("border", "")
                    .style("border-radius", "")
                    .style("background", "")
                    .style("box-shadow", "")
                    .style("margin", "0px");
                d3.select(".component3").style("visibility", "hidden");
                d3.select("#filterBtn").style("opacity", 1);
                if (filtering == true) 
                    d3.select("#recoveryBtn").style("opacity", 1);
            });

        // Button for recovering original viz. 
        let recovery = container.append("button")
            .text("Obnovit")
            .attr("id", "recoveryBtn")
            .on("click", function () {
                console.log(ftime)
                ftime = "f0";
                fstate = ["all"];
                console.log(ftime)
                console.log(data)
                let ch = createChart(start_date, end_date);
                data = origData;
                console.log(data)
                redrawChart(ch);
                filtering = false;
                resizeFilter = filtering;
                resizeFtime = ftime;
                resizeFstate = fstate;
                resizeData = origData;
                origBegEnd = changeBegEnd(data);
                actBegEnd = changeBegEnd(data);
                recovery.style("opacity", 0);

                // Show all icons 
                incidentsWithIcons.forEach(e => {
                    d3.select("#iconDiv" + e)
                        .style("visibility", "visible");
                    createIconDiv(e);
                })
            })

        if (filtering == false) 
            recovery.style("opacity", 0);
        else recovery.style("opacity", 1);

        // Div for storing filtering elements
        let filterDiv = container.append("div")
            .attr("id", "filter")
            .style("visibility", "hidden");

        // selects for filtering
        let select = d3.select("#filter")
            .append("select")
            .attr("id", "timeSelectBtn");
        select.append("option")
            .text("---")
            .attr("value", "f0");
        select.append("option")
            .text("Posledních 24 hodin")
            .attr("value", "f24");
        select.append("option")
            .text("Poslední týden")
            .attr("value", "fweek");
        select.append("option")
            .text("Poslední měsíc")
            .attr("value", "fmonth");
        filterDiv.append("br");

        let stateCheck = d3.select("#filter")
            .append("select")
            .attr("multiple", true)
            .attr("id", "stateSelectBtn");
        stateCheck.append("option")
            .text("Všechny")
            .attr("value", "all")
            .attr("selected", true)
        stateCheck.append("option")
            .text("Otevřené")
            .attr("value", "active")
        stateCheck.append("option")
            .text("Uzavřené")
            .attr("value", "closed")
        stateCheck.append("option")
            .text("On hold")
            .attr("value", "onhold")
        stateCheck.append("option")
            .text("Re-opened")
            .attr("value", "reopened") 

        // After submitting call function update
        let submit = d3.select("#filter")
            .append("button")
            .text("Potvrdit")
            .attr("id", "submitBtn")
            .on("click", function() {
                filterDiv.style("visibility", "hidden");
                filtrClick = false;
                recovery.style("opacity", 1);
                filtering = true;
                resizeFilter = filtering;
                /**
                 * Save selected options
                 */
                d3.select("#stateSelectBtn")
                    .selectAll("option")
                    .filter(function() {
                        if (this.selected == true) {
                            if (!(fstate.includes(this.value)))
                                fstate.push(this.value);
                        }
                        else {
                            if (fstate.indexOf(this.value) != -1)
                                fstate.splice(fstate.indexOf(this.value), 1);
                        }
                    });
                d3.select("#timeSelectBtn")
                    .selectAll("option")
                    .filter(function () {
                        if (this.selected == true) {
                            ftime = this.value;
                        }
                    });

                if (update(data, ftime, fstate) == false) {
                    recovery.style("opacity", 0);
                }
            });

        /**
         * 
         * @param {string} type - Type of action which should be done. 
         */
        function zoom(type) {
            let num = 2
            let days = parseInt((actBegEnd.end - actBegEnd.start) / (1000 * 60 * 60 * 24));
            ZTIME = days *60 *60 *1000 *num; //TODO: debug and change num???
            if (type == "out") {
                if ((origBegEnd.start <= actBegEnd.start - ZTIME)) {
                    actBegEnd.start = actBegEnd.start - ZTIME;
                    d3.select(".fa-search-plus").style("opacity", 1);
                }
                else if (origBegEnd.end >= actBegEnd.end + ZTIME) {
                    actBegEnd.end = actBegEnd.end + ZTIME;
                }
                if ((origBegEnd.start > actBegEnd.start - ZTIME) && (origBegEnd.end < actBegEnd.end + ZTIME)) {
                    d3.select(".fa-search-minus").style("opacity", 0.4);
                    d3.select(".fa-chevron-circle-left").style("opacity", 0.4);
                    d3.select(".fa-chevron-circle-right").style("opacity", 0.4);
                }
                if (origBegEnd.start > actBegEnd.start) {
                    d3.select(".fa-chevron-circle-left").style("opacity", 0.4);
                }
            }
            else if (type == "in") {
                //console.log(parseInt((actBegEnd.end - actBegEnd.start)/(1000*60*60)))
                if (parseInt((actBegEnd.end - actBegEnd.start)/(1000*60*60)) > 25) {
                    actBegEnd.start = actBegEnd.start + ZTIME;
                    d3.select(".fa-search-minus").style("opacity", 1);
                    d3.select(".fa-chevron-circle-left").style("opacity", 1);
                    d3.select(".fa-redo").style("opacity", 1);
                }
                if (parseInt((actBegEnd.end - actBegEnd.start)/(1000*60*60)) <= 25) {
                    d3.select(".fa-search-plus").style("opacity", 0.4);
                }
            }
            resizeZStart = actBegEnd.start;
            resizeZEnd = actBegEnd.end;   
            let ch = createChart(actBegEnd.start, actBegEnd.end);
            redrawChart(ch);
        }

        let zoomDiv = container.append("div").attr("id", "zoomDiv");
        let zoomIn = zoomDiv.append("span")
            .attr("class", "fas fa-search-plus zoom-icons")
            .on("click", function () {
                zooming = true;
                resizeZoom = true;
                zoom("in");
            });
        let zoomOut = zoomDiv.append("span")
            .attr("class", "fas fa-search-minus zoom-icons")
            .on("click", function () {
                zooming = true;
                resizeZoom = true;
                zoom("out");
            });
        let moveLeft = zoomDiv.append("span")
            .attr("class", "fas fa-chevron-circle-left zoom-icons")
            .on("click", function () {
                if ((origBegEnd.start < actBegEnd.start - ZTIME) && (origBegEnd.end > actBegEnd.end - ZTIME)) {
                    actBegEnd.start = actBegEnd.start - ZTIME;
                    actBegEnd.end = actBegEnd.end - ZTIME;
                    d3.select(".fa-chevron-circle-right").style("opacity", 1);
                }
                if (origBegEnd.start == actBegEnd.start) {
                    d3.select(".fa-chevron-circle-left").style("opacity", 0.4);
                }
                resizeZStart = actBegEnd.start;
                resizeZEnd = actBegEnd.end;
                let ch = createChart(actBegEnd.start, actBegEnd.end);
                redrawChart(ch);
            });
        let moveRight = zoomDiv.append("span")
            .attr("class", "fas fa-chevron-circle-right zoom-icons")
            .on("click", function () {
                if ((origBegEnd.start <= actBegEnd.start + ZTIME) && (origBegEnd.end >= actBegEnd.end + ZTIME)) {
                    actBegEnd.start = actBegEnd.start + ZTIME;
                    actBegEnd.end = actBegEnd.end + ZTIME;
                    d3.select(".fa-chevron-circle-left").style("opacity", 1);
                }
                if (origBegEnd.end == actBegEnd.end) {
                    d3.select(".fa-chevron-circle-right").style("opacity", 0.4);
                }
                resizeZStart = actBegEnd.start;
                resizeZEnd = actBegEnd.end;
                let ch = createChart(actBegEnd.start, actBegEnd.end);
                redrawChart(ch);
            });
        let recoverZoom = zoomDiv.append("span")
            .attr("class", "fas fa-redo zoom-icons")
            .on("click", function () {
                zooming = false;
                resizeZoom = false;
                actBegEnd = Object.assign(actBegEnd, origBegEnd);
                resizeZStart = actBegEnd.start;
                resizeZEnd = actBegEnd.end;
                let ch = createChart(origBegEnd.start, origBegEnd.end);
                redrawChart(ch);
                d3.select(".fa-redo").style("opacity", 0.4);
                d3.select(".fa-search-minus").style("opacity", 0.4);
                d3.select(".fa-search-plus").style("opacity", 1);
                d3.select(".fa-chevron-circle-left").style("opacity", 0.4);
                d3.select(".fa-chevron-circle-right").style("opacity", 0.4);
            });

        // opacity of buttons for zooming set to 1 if more than 24 for hours
        if (parseInt((actBegEnd.end - actBegEnd.start)/(1000*60*60)) > 24) {
            d3.select(".fa-search-plus").style("opacity", 1);
        }
        else {
            d3.select(".fa-search-plus").style("opacity", 0.4);
        }

        /**
         * Drawing chart to defined svg. 
         */
        chart = createChart(start_date, end_date);
        svg.datum(data).call(chart);
        /**
         * Border for states rectangles.
         */
        svg.selectAll("rect")
            .style("stroke", "black")
            .style("stroke-width", "0.2px");

        /**
         * Adding icons if defined.
         */
        if (typeof properties.icons != "undefined") {
            let icons = properties.icons;
            let counter = 0;
            const iconTypes = {
                "types":["hurry", "important", "check", "label", "mark", "pin"],
                "values":["clock", "exclamation-triangle", "eye", "tag", "star", "thumbtack"]
            };
            const iconFormats = ["fontawesome", "fa", "url", "base64", "file"];
            let iconHeight = parseInt(properties.state_height - 5);
            let iconIMG, icolor;

            icons.forEach(icon => {
                data.forEach(d => {
                    // create div for icon if id match with data ids
                    if (d.label == ("#" + icon.id)) {
                        iconIMG = "fas fa-";
                        container.append("div")
                            .attr("id", "iconDiv" + icon.id)
                            .attr("class", "icon");
                        incidentsWithIcons.push(icon.id);
                        icolor = "black";
                            if (typeof icon.color != "undefined") {
                                icolor = icon.color
                            }
                    }
                })
                
                // use defined icons
                if (iconTypes.types.includes(icon.iconType)) {
                    iconIMG += iconTypes.values[iconTypes.types.indexOf(icon.iconType)];
                    // set properties of icon
                    createIconDiv(icon.id);
                    d3.select("#iconDiv"+icon.id).append("i")
                        .attr("class", iconIMG)
                        .style("font-size", iconHeight + "px")
                        .style("color", icolor);
                }
                // use user defined icons
                if (icon.iconType == "own") {
                    if (typeof icon.iconFormat != "undefined") {
                        if (typeof icon.icon != "undefined") {
                            let format = icon.iconFormat.toLowerCase();
                            if (iconFormats.includes(format)) {
                                iconIMG = icon.icon;
                                createIconDiv(icon.id);
                                if ((format == "fa") || (format == "fontawesome")) {
                                    d3.select("#iconDiv"+icon.id).append("i")
                                        .attr("class", iconIMG)
                                        .style("font-size", iconHeight + "px")
                                        .style("color", icolor);
                                }
                                else if ((format == "url") || (format == "file") || (format == "base64")) {
                                    d3.select("#iconDiv"+icon.id).append("img")
                                        .attr("class", "image"+icon.id)
                                        .attr("src", iconIMG)
                                        .attr("height", iconHeight + "px")
                                        .attr("width", iconHeight + "px");
                                }
                            }
                        }
                    }
                }
            });
        };
        
        // for scale
        if (this.state.resizeFilter == true) {
            filterDiv.style("visibility", "hidden");
            filtrClick = false;
            recovery.style("opacity", 1);
            filtering = true;
            resizeFilter = filtering;
            if (update(data, this.state.resizeFtime, this.state.resizeFstate) == false) {
                recovery.style("opacity", 0);
            }
        }
        if (this.state.resizeZoom == true) {
            resizeZoom = true;
            resizeZStart = this.state.resizeZStart;
            resizeZEnd = this.state.resizeZEnd;
            redrawChart(createChart(this.state.resizeZStart, this.state.resizeZEnd))
        }
        
        // double date printing => erase ticks
        var childNode = document.querySelectorAll(".tick");
        childNode.forEach(e => {
            e.childNodes.forEach(v => {
                if (v.nodeName === "text") {
                    if (v.textContent == "") {
                        d3.select(e).attr("opacity", 0);
                    }
                }
            });
        });

        dashboardWindow
                    .style("border", "")
                    .style("border-radius", "")
                    .style("background", "")
                    .style("box-shadow", "")
                    .style("margin", "0px");
    }

    updateDimensions() {
        if (window.innerWidth < 400) {
            this.setState({ width: 300 });
        } 
        else {
            let updateWidth = window.innerWidth-100;
            this.setState({ width: updateWidth, oldWidth: this.state.width });
        }
    }

    remove() {
        d3.select(".component2").selectAll("*").remove();
    }

    debounce(func, time) {
        var time = time || 100; // 100 by default if no param
        var timer;
        return function(event){
            if(timer) clearTimeout(timer);
            timer = setTimeout(func, time, event);
        };
    }

    update() {
        this.updateDimensions();
        this.remove();
        this.componentDidMount();
    }

    componentDidMount() {
        this.createTimelineChart();
        window.addEventListener("resize", this.debounce(this.update, 150));
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.debounce(this.update, 150));
    }

    render() {
        return (
            // connecting div to ref 
            <div className="component2" ref={this.ref1}></div>
        );
    }
}

export default Component1_2;