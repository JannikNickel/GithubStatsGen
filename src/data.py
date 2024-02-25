from dataclasses import dataclass
from datetime import datetime

@dataclass
class CommitData:
    message: str
    sha: str
    date: datetime

@dataclass
class RepoData:
    name: str
    id: int
    fork: bool
    langs: dict[str, int]
    commits: list[CommitData]

@dataclass
class UserData:
    name: str
    id: int
    repos: list[RepoData]
