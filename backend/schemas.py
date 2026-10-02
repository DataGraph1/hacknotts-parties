from typing import Any

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    sql: str = Field(..., min_length=1)
    params: list[Any] = Field(default_factory=list)


class QueryResponse(BaseModel):
    rows: list[dict[str, Any]]
    row_count: int
    command: str
