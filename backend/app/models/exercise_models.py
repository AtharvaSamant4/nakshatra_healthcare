from pydantic import BaseModel
from typing import Optional


class AngleConfig(BaseModel):
    joint: str
    points: list[str]
    target_angle: int
    threshold: int


class ExerciseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    body_part: str
    difficulty: str
    angle_config: AngleConfig
    instructions: Optional[str] = None
    thumbnail_url: Optional[str] = None
