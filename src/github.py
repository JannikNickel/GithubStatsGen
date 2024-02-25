import requests
from typing import Any

class GithubRest:
    def __init__(self, token: str | None):
        self._token = token if token else None

    def get(self, path: str, headers: dict[str, Any] = {}) -> tuple[int, str]:
        base = "https://api.github.com"
        url = base + path

        h = {}
        if self._token:
            h["Authorization"] = f"token {self._token}"
        h["per_page"] = "100"
        h |= headers

        res = requests.get(url, headers = h)
        return (res.status_code, res.json() if res.status_code == 200 else None)
    
    def get_all_pages(self, path: str) -> list[Any]:
        page = 1
        all_content = []
        while True:
            res, content = self.get(f"{path}?per_page=100&page={page}")
            page += 1
            cl = list(content) if res == 200 else []
            if len(cl) == 0:
                break
            all_content += cl
        return all_content

    def user(self, username: str) -> dict[str, Any]:
        res, content = self.get(f"/users/{username}")
        return dict(content) if res == 200 else {}
    
    def repos(self, username: str) -> list[dict[str, Any]]:
        path = "/user/repos" if self._token else f"/users/{username}/repos"
        return self.get_all_pages(path)
    
    def languages(self, owner: str, repo: str) -> dict[str, int]:
        res, content = self.get(f"/repos/{owner}/{repo}/languages")
        return dict(content) if res == 200 else {}
    
    def commits(self, owner: str, repo: str) -> list[dict[str, Any]]:
        path = f"/repos/{owner}/{repo}/commits"
        return self.get_all_pages(path)
