# Github Stats Gen
Github action to generate language and commit stats for a user.

## Requirements
To add this action to a repository, a workflow file has to be created.
In addition, an access token is required to fetch private repository data and work around strict rate limits. Store it in the repository's action secrets as `ACCESS_TOKEN`.

## Example workflow
To generate stats, add a workflow file in the `/.github/workflows/` directory.

```yaml
name: Generate Stats
on:
  schedule:
    - cron: "0 0 * * *"

jobs:
  gen-file:
    runs-on: ubuntu-latest
    name: Generate Stats Cards
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate Lang Stats
        uses: JannikNickel/GithubStatsGen@v1
        with:
          access_token: ${{ secrets.ACCESS_TOKEN }}
          username: "YOUR_USERNAME"
          output_file: "OUTPUT_FILE.svg"
          type: "lang_comp"
          theme: "dark"
          include_private: true
          include_forks: false
          ignored_repos: "Repo0,Repo1"
          timezone: "Etc/Utc"
          language_limit: 7

      - name: Commit + push
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Update stats" || echo "No changes to commit"
          git push
```

## Action inputs
| Name | Values | Required | Description |
| ---- | ------ | -------- | ----------- |
| username | string | ✔️ | Github username of the user to generate stats for |
| output_file | string | ✔️ | Output file path/name relative to the root of the repository |
| type | commit_times/commit_days/lang_list/lang_comp | ✔️ | Type of card to generate |
| theme | dark/light | ❌ | Theme to use |
| include_forks | true/false | ❌ | Whether to include forked repositories or not |
| include_private | true/false | ❌ | Whether to include private repositories or not. An access token is required to access private repos! |
| ignored_repos | Repo1,Repo2,Repo3 | ❌ | List of comma separated repository names to ignore in the statistics |
| timezone | Etc/Utc | ❌ | Local timezone of the user from the tz database |
| language_limit | int | ❌ | The maximum amount of languages to show in the language cards |
