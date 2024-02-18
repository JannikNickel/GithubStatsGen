import os
from data import *
from github import GithubRest
from datetime import datetime
import commit_stats

CACHE_FILE = "cache.json"
THEME_FILES = {
    "dark": "theme_dark.css"
}

inp_username = os.environ.get("INPUT_USERNAME")
inp_output_file = os.environ.get("INPUT_OUTPUT_FILE")
inp_type = os.environ.get("INPUT_TYPE")
inp_theme = os.environ.get("INPUT_THEME")
inp_include_forks = os.environ.get("INPUT_INCLUDE_FORKS") == "true"
inp_include_private = os.environ.get("INPUT_INCLUDE_PRIVATE") == "true"
inp_ignored_repos = os.environ.get("INPUT_IGNORED_REPOS")
inp_ignored_repos = set(inp_ignored_repos.split(",")) if inp_ignored_repos else set()
inp_timezone = os.environ.get("INPUT_TIMEZONE")
inp_language_limit = os.environ.get("INPUT_LANGUAGE_LIMIT")
access_token = os.environ.get("ACCESS_TOKEN")



if not access_token and inp_include_private:
    print("Access token is required if private repositories are included!")
    exit(1)

# GET STATS FROM GITHUB
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r") as f:
        # commit times are loaded in local time instead of utc, just something to be aware of, but they are correct in the actual data structure before saving
        data = UserData.from_json(f.read())
else:
    gh = GithubRest(access_token if access_token else None)
    gh_user = gh.user(inp_username)
    user_name = gh_user["name"]
    user_id = gh_user["id"]

    repos = []
    for repo in gh.repos(inp_username):
        repo_owner = repo["owner"]["login"]
        repo_name = repo["name"]
        repo_forked = repo["fork"]
        repo_private = repo["private"]

        if repo["owner"]["id"] != user_id:
            continue
        if repo_private and not inp_include_private:
            continue
        if repo_forked and not inp_include_forks:
            continue
        if repo_name in inp_ignored_repos:
            continue

        commits = []
        for c in gh.commits(repo_owner, repo_name):
            time_str = c["commit"]["committer"]["date"]
            time = datetime.fromisoformat(time_str)
            off = time.utcoffset()
            commits.append(CommitData(c["commit"]["message"], c["sha"], time))
        
        langs = gh.languages(repo_owner, repo_name)
        repos.append(RepoData(repo_name, int(repo["id"]), repo_forked, langs, commits))

    data = UserData(user_name, user_id, repos)
    with open(CACHE_FILE, "w") as f:
        f.write(data.to_json())


def gen_svg(type: str, theme_css: str):
    match type:
        case "commit_times":
            return commit_stats.gen_time_card(data, inp_timezone, theme_css)
        case "commit_days":
            return commit_stats.gen_day_card(data, inp_timezone, theme_css)
        case _:
            return None
        
def read_theme_css(theme: str) -> str:
    # TODO put these into a res/ folder or something similar
    with open(f"src/{THEME_FILES[theme]}", "r") as f:
        return f.read()

css = read_theme_css(inp_theme)
svg = gen_svg(inp_type, css)
with open(inp_output_file, "w", encoding = "utf8") as f:
    svg.as_svg(f, header = "")
exit()
