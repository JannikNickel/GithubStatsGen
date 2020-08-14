const secrets = require("./secrets.json");
const { Octokit } = require("@octokit/rest");

async function APICalls()
{
    const github = new Octokit({auth: secrets.githubAPIKey});
    user = await github.users.getAuthenticated();

    repos = await github.repos.listForAuthenticatedUser();
    languageAmount = {}
    totalBytes = 0
    for(let i = 0;i < repos.data.length;i++)
    {
        repo = repos.data[i];
        if(repo.owner.id == user.data.id)
        {
            //console.log(repo.name);
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
        languagePercentage.push({language: key, percentage: languageAmount[key] / totalBytes * 100});
    });

    languagePercentage.sort((a, b) => a.percentage < b.percentage ? 1 : -1);
    languagePercentage.forEach(element => {
        console.log(element.language + " -> " + element.percentage);
    });
}

APICalls();
