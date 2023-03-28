//Config
const secrets = require("./secrets.json");
const settings = require("./settings.json");

//References
const languageColors = require("./languagecolors.json");

//Discord
const { Octokit } = require("@octokit/rest");

//Visualization
const d3 = require("d3");
const jsdom = require("jsdom");
const { JSDOM } = jsdom

//Std lib
const fs = require('fs');

//SFTP
const sftp = require("ssh2-sftp-client");
const { sum } = require("d3");

async function GetLanguageStats(github)
{
    user = await github.users.getAuthenticated();

    repos = await github.repos.listForAuthenticatedUser();
    languageAmount = {}
    commitDates = []
    allCommits = []
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
            //Languages
            if(settings.languageExcludedRepos.includes(repo.name) == false)
            {
                languages = await github.repos.listLanguages({owner: settings.owner, repo: repo.name});
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

            //Commits
            try
            {
                var page = 0
                while(true)
                {
                    var commits = await github.request('GET /repos/{owner}/{repo}/commits', {
                        owner: repo.owner.login,
                        repo: repo.name,
                        per_page: 100,
                        page: page
                    });
                    page += 1;
                    commits.data.forEach(commit =>
                    {
                        allCommits.push(commit);
                        commitDates.push(commit.commit.committer.date);
                    });
                    if(commits.data.length == 0)
                    {
                        break;
                    }
                }
            }
            catch(error) { }
        }
    }
    languagePercentage = []
    Object.keys(languageAmount).forEach(key =>
    {
        languagePercentage.push({language: key, percentage: languageAmount[key] / totalBytes});
    });

    languagePercentage.sort((a, b) => a.percentage < b.percentage ? 1 : -1);

    return {"languages": languagePercentage, "commitDates": commitDates, "commits": allCommits};
}

function GenerateFullLanguageStatsSVG(languageStats, dark = false)
{
    //Settings
    var width = 350;
    var height = 170;
    var leftIndent = 25;
    var headerOffset = 35;
    var languageOffset = 65;
    var languageHeight = 40;
    var barHeight = 8;

    //Fake DOM
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    let body = d3.select(dom.window.document.querySelector("body"));

    //SVG
    var svg = body.append("svg").attr("width", width).attr("height", height).attr("fill", "none").attr("xmlns", "http://www.w3.org/2000/svg");
    svg.append("style").text(fs.readFileSync("styles" + (dark == true ? "_dark" : "") + ".css", function(err){}).toString());

    //Background
    var background = svg.append("rect").attr("class", "backgroundContainer").attr("x", 0.5).attr("y", 0.5).attr("rx", 5).attr("height", height - 1).attr("width", width - 1).attr("stroke-opacity", 1);

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
        if(lCount >= settings.languageLimit)
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

        if(lCount >= settings.languageLimit)
        {
            break;
        }
    }

    //Update height
    var actualHeight = languageOffset + lCount * languageHeight;
    svg.attr("height", actualHeight);
    background.attr("height", actualHeight - 1);

    return body.html();
}

function GenerateSmallLanguageStatsSVG(languageStats, dark = false)
{
    //Settings
    var width = 530;
    var height = 170;
    var leftIndent = 25;
    var headerOffset = 35;
    var languageOffset = 65;
    var barHeight = 10;

    //Fake DOM
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    let body = d3.select(dom.window.document.querySelector("body"));

    //SVG
    var svg = body.append("svg").attr("width", width).attr("height", height).attr("fill", "none").attr("xmlns", "http://www.w3.org/2000/svg");
    svg.append("style").text(fs.readFileSync("styles" + (dark == true ? "_dark" : "") + ".css", function(err){}).toString());

    //Background
    var background = svg.append("rect").attr("class", "backgroundContainer").attr("x", 0.5).attr("y", 0.5).attr("rx", 5).attr("height", height - 1).attr("width", width - 1).attr("stroke-opacity", 1);

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
        if(lCount >= settings.languageLimit)
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
        tOffset += i % 2 == 0 ? 0 : 25;

        if(lCount >= settings.languageLimit)
        {
            break;
        }
    }

    var actualHeight = languageOffset + barHeight + tOffset + leftIndent * 0.75;
    svg.attr("height", actualHeight);
    background.attr("height", actualHeight - 1);

    return body.html();
}

function GenerateCommitTimes(groups, dark = false)
{
    //Settings
    var width = 530;
    var height = 185;
    var leftIndent = 25;
    var rightIndent = 90;
    var headerOffset = 35;
    var timeOffset = 70;
    var barHeight = 12;

    //Fake DOM
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    let body = d3.select(dom.window.document.querySelector("body"));

    //SVG
    var svg = body.append("svg").attr("width", width).attr("height", height).attr("fill", "none").attr("xmlns", "http://www.w3.org/2000/svg");
    svg.append("style").text(fs.readFileSync("styles" + (dark == true ? "_dark" : "") + ".css", function(err){}).toString());

    //Background
    var background = svg.append("rect").attr("class", "backgroundContainer").attr("x", 0.5).attr("y", 0.5).attr("rx", 5).attr("height", height - 1).attr("width", width - 1).attr("stroke-opacity", 1);

    //Header
    var g = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + headerOffset + ")");
    let header = "I'm a" + (groups.indexOf(Math.max(...groups)) <= 1 ? "n early 🐦" : " night 🦉");//"Commit Times";
    g.append("text").attr("class", "header").attr("x", 0).attr("y", 0).text(header);

    //Times
    var groupSum = sum(groups);
    var tOffset = 0;
    var timeContainer = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + timeOffset + ")");
    for (let i = 0; i < groups.length; i++)
    {
        const group = groups[i];
        
        //Offset
        var tg = timeContainer.append("g").attr("transform", "translate(0, " + tOffset + ")");
        tOffset += 30;

        //Time
        var time = i == 0 ? "Morning" : (i == 1 ? "Daytime" : (i == 2 ? "Evening" : "Night"));
        var emoji = i == 0 ? "🌅" : (i == 1 ? "☀️" : (i == 2 ? "🌇" : "🌙"));
        tg.append("text").attr("class", "timeText").attr("x", 2).attr("y", 0).text(emoji + " " + time);
        tg.append("text").attr("class", "timeText").attr("x", 210 - 10).attr("y", 0).attr("text-anchor", "end").text(group + " commits");

        //Fill
        var leftOffset = 210;
        var bgWidth = width - leftIndent - leftOffset - rightIndent;
        tg.append("rect").attr("x", leftOffset).attr("y", -10).attr("rx", 3).attr("ry", 3).attr("width", bgWidth).attr("height", barHeight).attr("fill", "#DDDDDD");
        tg.append("rect").attr("class", "timeBarFill").attr("x", leftOffset).attr("y", -10).attr("rx", 3).attr("ry", 3).attr("width", group / groupSum * bgWidth).attr("height", barHeight);

        //Percentage
        tg.append("text").attr("class", "timeText").attr("x", leftOffset + bgWidth + 60).attr("y", 0).attr("text-anchor", "end").text((group / groupSum * 100).toFixed(2) + "%");
    }

    return body.html();
}

function GenerateCommitDays(groups, dark = false)
{
    //Settings
    var width = 530;
    var height = 275;
    var leftIndent = 25;
    var rightIndent = 90;
    var headerOffset = 35;
    var timeOffset = 70;
    var barHeight = 12;

    //Fake DOM
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    let body = d3.select(dom.window.document.querySelector("body"));

    //SVG
    var svg = body.append("svg").attr("width", width).attr("height", height).attr("fill", "none").attr("xmlns", "http://www.w3.org/2000/svg");
    svg.append("style").text(fs.readFileSync("styles" + (dark == true ? "_dark" : "") + ".css", function(err){}).toString());

    //Background
    var background = svg.append("rect").attr("class", "backgroundContainer").attr("x", 0.5).attr("y", 0.5).attr("rx", 5).attr("height", height - 1).attr("width", width - 1).attr("stroke-opacity", 1);

    //Header
    var g = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + headerOffset + ")");
    let header = "📅 I'm most productive on " + getWeekDay(groups.indexOf(Math.max(...groups)));//"Commit Days";
    g.append("text").attr("class", "header").attr("x", 0).attr("y", 0).text(header);

    //Times
    var groupSum = sum(groups);
    var tOffset = 0;
    var timeContainer = svg.append("g").attr("transform", "translate(" + leftIndent + ", " + timeOffset + ")");
    for (let i = 0; i < groups.length; i++)
    {
        const group = groups[i];
        
        //Offset
        var tg = timeContainer.append("g").attr("transform", "translate(0, " + tOffset + ")");
        tOffset += 30;

        //Time
        var time = getWeekDay(i);
        tg.append("text").attr("class", "timeText").attr("x", 2).attr("y", 0).text(time);
        tg.append("text").attr("class", "timeText").attr("x", 210 - 10).attr("y", 0).attr("text-anchor", "end").text(group + " commits");

        //Fill
        var leftOffset = 210;
        var bgWidth = width - leftIndent - leftOffset - rightIndent;
        tg.append("rect").attr("x", leftOffset).attr("y", -10).attr("rx", 3).attr("ry", 3).attr("width", bgWidth).attr("height", barHeight).attr("fill", "#DDDDDD");
        tg.append("rect").attr("class", "timeBarFill").attr("x", leftOffset).attr("y", -10).attr("rx", 3).attr("ry", 3).attr("width", group / groupSum * bgWidth).attr("height", barHeight);

        //Percentage
        tg.append("text").attr("class", "timeText").attr("x", leftOffset + bgWidth + 60).attr("y", 0).attr("text-anchor", "end").text((group / groupSum * 100).toFixed(2) + "%");
    }

    return body.html();
}

function getWeekDay(i)
{
    return i == 0 ? "Monday" : (i == 1 ? "Tuesday" : (i == 2 ? "Wednesday" : (i == 3 ? "Thursday" : (i == 4 ? "Friday" : (i == 5 ? "Saturday" : "Sunday")))));
}

function ParseDates(strings)
{
    dates = []
    strings.forEach(element =>
    {
        var date = new Date(Date.parse(element));
        dates.push(date);
    });
    return dates;
}

function GroupDates(dates)
{
    var times = [6, 12, 18, 24]
    var timeCounts = [0, 0, 0, 0]
    dates.forEach(date =>
    {
        for (let i = 0; i < times.length; i++)
        {
            let time = times[i];

            //Shift based on timezone
            let timeString = date.toLocaleTimeString("en-DE", {timeZone: settings.localTimezone, hour12: false});
            let parts = timeString.split(":");
            if(parts.length == 0)
            {
                continue;
            }
            let hour = parseInt(parts[0]);
            if(isNaN(hour))
            {
                continue;
            }

            if(hour % 24 < time)
            {
                timeCounts[i] += 1;
                break;
            }
        }
    });
    //Shift to have [morning, daytime, evening, night]
    var temp = timeCounts[0];
    timeCounts[0] = timeCounts[1];
    timeCounts[1] = timeCounts[2];
    timeCounts[2] = timeCounts[3];
    timeCounts[3] = temp;

    return timeCounts;
}

function GroupDateDays(dates)
{
    var dateNumberMap = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6 };
    var dayCounts = [0, 0, 0, 0, 0, 0, 0]
    dates.forEach(date =>
    {
        let dateString = date.toLocaleDateString("en-US", {timeZone: settings.localTimezone, weekday: "short"});
        if(dateString in dateNumberMap)
        {
            let day = dateNumberMap[dateString];
            dayCounts[day] += 1;
        }
    });

    return dayCounts;
}

async function upload()
{
    try{
        let client = new sftp();
        await client.connect({
            host: secrets.server_url,
            port: 22,
            username: secrets.server_user,
            password: secrets.server_pw
        });
        await client.put("output/languageStats.svg", settings.serverContentDirectory + "languageStats.svg");
        await client.put("output/languageStats_Dark.svg", settings.serverContentDirectory + "languageStats_Dark.svg");
        await client.put("output/languageStats_Compact.svg", settings.serverContentDirectory + "languageStats_Compact.svg");
        await client.put("output/languageStats_Compact_Dark.svg", settings.serverContentDirectory + "languageStats_Compact_Dark.svg");
        await client.put("output/commitTimes.svg", settings.serverContentDirectory + "commitTimes.svg");
        await client.put("output/commitTimes_Dark.svg", settings.serverContentDirectory + "commitTimes_Dark.svg");
        await client.put("output/commitDays.svg", settings.serverContentDirectory + "commitDays.svg");
        await client.put("output/commitDays_Dark.svg", settings.serverContentDirectory + "commitDays_Dark.svg");
        await client.end();
        console.log("Uploaded data");
    }
    catch(err)
    {
        console.log("Error while uploading data " + err);
    }
}

async function update()
{
    console.log("Requesting data");
    const github = new Octokit({auth: secrets.githubAPIKey});
    var data = await GetLanguageStats(github);
    fs.writeFileSync("tempData.json", JSON.stringify(data, null, 2), function(err){});
    //var data = JSON.parse(fs.readFileSync("tempData.json", function(err){}).toString());

    console.log("Transforming data");
    var dates = ParseDates(data.commitDates);
    var groups = GroupDates(dates);
    var dayGroups = GroupDateDays(dates);

    console.log("Generating SVGs");
    var svg = GenerateFullLanguageStatsSVG(data.languages);
    fs.writeFileSync("output/languageStats.svg", svg);
    svg = GenerateFullLanguageStatsSVG(data.languages, true);
    fs.writeFileSync("output/languageStats_Dark.svg", svg);
    svg = GenerateSmallLanguageStatsSVG(data.languages);
    fs.writeFileSync("output/languageStats_Compact.svg", svg);
    svg = GenerateSmallLanguageStatsSVG(data.languages, true);
    fs.writeFileSync("output/languageStats_Compact_Dark.svg", svg);
    svg = GenerateCommitTimes(groups);
    fs.writeFileSync("output/commitTimes.svg", svg);
    svg = GenerateCommitTimes(groups, true);
    fs.writeFileSync("output/commitTimes_Dark.svg", svg);
    svg = GenerateCommitDays(dayGroups);
    fs.writeFileSync("output/commitDays.svg", svg);
    svg = GenerateCommitDays(dayGroups, true);
    fs.writeFileSync("output/commitDays_Dark.svg", svg);

    console.log("Uploading data");
    upload();
}

async function delay(milliseconds)
{
    return await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main()
{
    while(true)
    {
        await update();
        await delay(settings.updateInterval * 1000);
    }
}

main();

//TODO separate file for visualization
//TODO no magic color version in the SVGs (use css)
//TODO adjustable width, dark mode in visualization function
