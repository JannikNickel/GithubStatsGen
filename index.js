const secrets = require("./secrets.json");
const { Octokit } = require("@octokit/rest");
const d3 = require("d3");
var jsdom = require("jsdom");
const { JSDOM } = jsdom
var fs = require('fs');
const { sum } = require("d3");
const { count } = require("console");
const languageColors = require("./languagecolors.json");

async function GetLanguageStats(github)
{
    user = await github.users.getAuthenticated();

    repos = await github.repos.listForAuthenticatedUser();
    languageAmount = {}
    totalBytes = 0
    for(let i = 0;i < repos.data.length;i++)
    {
        repo = repos.data[i];
        if(repo.fork == true)
        {
            continue;
        }
        if(repo.owner.id == user.data.id)
        {
            console.log(repo);
            languages = await github.repos.listLanguages({owner: "JannikNickel", repo: repo.name});
            Object.keys(languages.data).forEach(key =>
            {
                if(!(key in languageAmount))
                {
                    languageAmount[key] = 0;
                }
                languageAmount[key] += languages.data[key];
                totalBytes += languages.data[key];
            });
        }
    }
    languagePercentage = []
    Object.keys(languageAmount).forEach(key =>
    {
        languagePercentage.push({language: key, percentage: languageAmount[key] / totalBytes});
    });

    languagePercentage.sort((a, b) => a.percentage < b.percentage ? 1 : -1);

    return languagePercentage;
}

function GenerateFullLanguageStatsSVG(languageStats)
{
    //Settings
    var width = 350;
    var height = 170;
    var leftIndent = 25;
    var headerOffset = 35;
    var languageOffset = 65;
    var languageHeight = 40;
    var languageLimit = 5;
    var barHeight = 8;

    //Fake DOM
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    let body = d3.select(dom.window.document.querySelector("body"));

    //SVG
    var svg = body.append("svg").attr("width", width).attr("height", height).attr("fill", "none").attr("xmlns", "http://www.w3.org/2000/svg");
    svg.append("style").text(fs.readFileSync("styles.css", function(err){}).toString());

    //Background
    var background = svg.append("rect").attr("x", 0.5).attr("y", 0.5).attr("rx", 5).attr("height", height - 1).attr("width", width - 1).attr("stroke", "#E4E2E2").attr("fill", "#FFFEFE").attr("stroke-opacity", 1);

    //Header
    var g = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + headerOffset + ")");
    g.append("text").attr("class", "header").attr("x", 0).attr("y", 0).text("Most Used Languages");

    //Languages
    var lCount = 0;
    var lOffset = 0;
    var languageContainer = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + languageOffset + ")");
    for (let i = 0; i < languageStats.length; i++) {
        const entry = languageStats[i];

        //Offset
        var lg = languageContainer.append("g").attr("transform", "translate(0, " + lOffset + ")");
        lOffset += languageHeight;

        //Data
        var color = "#CACDD3";
        for (let k = 0; k < languageColors.Data.length; k++) {
            const element = languageColors.Data[k];
            if(element.ProgrammingLanguage === entry.language)
            {
                if(element.Color !== "")
                {
                    color = element.Color;
                }
                break;
            }
        }
        var lName = entry.language;
        var percentage = entry.percentage;
        lCount++;
        if(lCount >= languageLimit)
        {
            color = "#999999";
            lName = "Other";
            percentage = 0;
            for (let k = lCount - 1; k < languageStats.length; k++) {
                const element = languageStats[k];
                percentage += element.percentage;
            }
        }

        //Name
        lg.append("text").attr("class", "language").attr("x", 2).attr("y", 0).text(lName);

        //Fill
        var bgWidth = width - leftIndent - 75;
        lg.append("rect").attr("x", 2).attr("y", 10).attr("rx", 3).attr("ry", 3).attr("width", bgWidth).attr("height", barHeight).attr("fill", "#DDDDDD");
        lg.append("rect").attr("x", 2).attr("y", 10).attr("rx", 3).attr("ry", 3).attr("width", bgWidth * percentage).attr("height", barHeight).attr("fill", color);

        //Percentage
        lg.append("text").attr("class", "language").attr("x", 2 + width - 75 - leftIndent + 8).attr("y", 10 + 5.25).attr("dominant-baseline", "middle").text((percentage * 100).toFixed(2) + "%");

        if(lCount >= languageLimit)
        {
            break;
        }
    }

    //Update height
    var actualHeight = 65 + lCount * languageHeight;
    svg.attr("height", actualHeight);
    background.attr("height", actualHeight - 1);

    return body.html();
}

function GenerateSmallanguageStatsSVG(languageStats)
{
    //Settings
    var width = 350;
    var height = 170;
    var leftIndent = 25;
    var headerOffset = 35;
    var languageLimit = 5;
    var languageOffset = 65;
    var barHeight = 8;

    //Fake DOM
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    let body = d3.select(dom.window.document.querySelector("body"));

    //SVG
    var svg = body.append("svg").attr("width", width).attr("height", height).attr("fill", "none").attr("xmlns", "http://www.w3.org/2000/svg");
    svg.append("style").text(fs.readFileSync("styles.css", function(err){}).toString());

    //Background
    var background = svg.append("rect").attr("x", 0.5).attr("y", 0.5).attr("rx", 5).attr("height", height - 1).attr("width", width - 1).attr("stroke", "#E4E2E2").attr("fill", "#FFFEFE").attr("stroke-opacity", 1);

    //Header
    var g = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + headerOffset + ")");
    g.append("text").attr("class", "header").attr("x", 0).attr("y", 0).text("Most Used Languages");

    //Languages
    var lCount = 0;
    var lOffset = 0;
    var tOffset = 35;
    var languageContainer = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + languageOffset + ")");
    var mask = languageContainer.append("mask").attr("id", "maskid");
    var bgWidth = width - leftIndent - 25;
    mask.append("rect").attr("x", 0).attr("y", 0).attr("width", bgWidth).attr("height", barHeight).attr("fill", "white").attr("rx", 3);
    languageContainer.append("rect").attr("x", 0).attr("y", 0).attr("rx", 3).attr("ry", 3).attr("width", bgWidth).attr("height", barHeight).attr("fill", "#DDDDDD").attr("mask", "url(#maskid)");
    for (let i = 0; i < languageStats.length; i++) {
        const entry = languageStats[i];

        //Data
        var color = "#CACDD3";
        for (let k = 0; k < languageColors.Data.length; k++) {
            const element = languageColors.Data[k];
            if(element.ProgrammingLanguage === entry.language)
            {
                if(element.Color !== "")
                {
                    color = element.Color;
                }
                break;
            }
        }
        var lName = entry.language;
        var percentage = entry.percentage;
        lCount++;
        if(lCount >= languageLimit)
        {
            color = "#999999";
            lName = "Other";
            percentage = 0;
            for (let k = lCount - 1; k < languageStats.length; k++) {
                const element = languageStats[k];
                percentage += element.percentage;
            }
        }

        //Fill
        var lWidth = bgWidth * percentage;
        languageContainer.append("rect").attr("x", lOffset).attr("y", 0).attr("width", lWidth).attr("height", barHeight).attr("fill", color).attr("mask", "url(#maskid)");
        lOffset += lWidth;

        //Name
        var xOffset = i % 2 == 0 ? 0 : (width - leftIndent) * 0.5;
        languageContainer.append("circle").attr("cx", xOffset + 5).attr("cy", tOffset - 4).attr("r", 5).attr("fill", color);
        languageContainer.append("text").attr("class", "language").attr("x", xOffset + 15).attr("y", tOffset).text(lName + " (" + (percentage * 100).toFixed(2) + "%)");
        tOffset += i % 2 == 0 ? 0 : 20;

        if(lCount >= languageLimit)
        {
            break;
        }
    }

    return body.html();
}

async function main()
{
    //const github = new Octokit({auth: secrets.githubAPIKey});
    //languageStats = await GetLanguageStats(github);
    //fs.writeFileSync("test.json", JSON.stringify(languageStats, null, 2), function(err){});

    languageStats = JSON.parse(fs.readFileSync("test.json", function(err){}).toString())

    var svg = GenerateFullLanguageStatsSVG(languageStats);
    fs.writeFileSync("out.svg", svg);

    //console.log(languageStats);
    console.log(svg);
}

main();

//TODO commit times
