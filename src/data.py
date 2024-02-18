from dataclasses import dataclass
from datetime import datetime
from dataclasses_json import dataclass_json

@dataclass_json
@dataclass
class CommitData:
    message: str
    sha: str
    date: datetime

@dataclass_json
@dataclass
class RepoData:
    name: str
    id: int
    fork: bool
    langs: dict[str, int]
    commits: list[CommitData]

@dataclass_json
@dataclass
class UserData:
    name: str
    id: int
    repos: list[RepoData]
