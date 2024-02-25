from data import *
import commit_stats
import language_stats
from github import GithubRest
from datetime import datetime
import os
import json
import io
import html

THEME_FILES = {
    "dark": "theme_dark.css",
    "light": "theme_light.css"
}

inp_username = os.environ.get("INPUT_USERNAME")
inp_output_file = os.environ.get("INPUT_OUTPUT_FILE")
inp_type = os.environ.get("INPUT_TYPE")
inp_theme = os.environ.get("INPUT_THEME")
inp_include_forks = os.environ.get("INPUT_INCLUDE_FORKS") == "true"
inp_include_private = os.environ.get("INPUT_INCLUDE_PRIVATE") == "true"
inp_ignored_repos = os.environ.get("INPUT_IGNORED_REPOS")
inp_ignored_repos = set(s.strip() for s in inp_ignored_repos.split(",")) if inp_ignored_repos else set()
inp_timezone = os.environ.get("INPUT_TIMEZONE")
inp_language_limit = int(os.environ.get("INPUT_LANGUAGE_LIMIT"))
access_token = os.environ.get("ACCESS_TOKEN")

assert(inp_username)
assert(inp_output_file)
assert(inp_type in ["commit_times", "commit_days", "lang_list", "lang_comp"])
assert(inp_theme in ["dark", "light"])

if not access_token and inp_include_private:
    print("Access token is required if private repositories are included!")
    exit(1)

gh = GithubRest(access_token if access_token else None)
gh_user = gh.user(inp_username)
user_name = gh_user["name"]
user_id = gh_user["id"]

repos = []
user_repos = gh.repos(inp_username)
for i, repo in enumerate(user_repos):
    print(f"Repo ({i + 1} / {len(user_repos)})")
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

def gen_svg(type: str, theme_css: str):
    with open("res/lang_colors.json", "r") as file:
        lang_colors = json.load(file)
    match type:
        case "commit_times":
            return commit_stats.gen_time_card(data, inp_timezone, theme_css)
        case "commit_days":
            return commit_stats.gen_day_card(data, inp_timezone, theme_css)
        case "lang_list":
            return language_stats.gen_lang_card(data, theme_css, lang_colors, inp_language_limit, False)
        case "lang_comp":
            return language_stats.gen_lang_card(data, theme_css, lang_colors, inp_language_limit, True)
        case _:
            return None
        
def read_theme_css(theme: str) -> str:
    with open(f"res/{THEME_FILES[theme]}", "r") as f:
        return f.read()

css = read_theme_css(inp_theme)
svg = gen_svg(inp_type, css)
with io.StringIO() as outStr:
    svg.as_svg(outStr, header = "")
    out_dir = os.path.dirname(inp_output_file)
    if out_dir:
        os.makedirs(out_dir, exist_ok = True)
    with open(inp_output_file, "w", encoding = "utf8") as f:
        f.write(html.unescape(outStr.getvalue()))
exit()
