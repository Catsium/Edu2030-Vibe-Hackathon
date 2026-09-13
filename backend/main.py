import json
import os
from datetime import date
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl


SUBJECT_NAMES = [
    "Design & Technology",
    "Science",
    "Math",
    "English",
    "Art",
    "History",
]
EXPOSURE_TYPES = {
    "Project",
    "Competition",
    "Workshop",
    "Internship / Job Shadowing",
    "Course",
    "Other",
}
SKILL_NAMES = [
    "Hands-on ability",
    "Sequential problem solving",
    "Pattern recognition / application of concepts",
    "Communication",
    "Creativity",
    "Critical analysis",
]


class Topic(BaseModel):
    name: str = Field(min_length=1)
    score: int = Field(ge=0, le=100)


class SubjectEvidence(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    topics: List[Topic] = Field(default_factory=list)


class Exposure(BaseModel):
    name: str = Field(min_length=1)
    type: str
    description: str = Field(min_length=1)


class Evidence(BaseModel):
    subjects: List[SubjectEvidence]
    projects: List[Exposure] = Field(default_factory=list)
    interests: str = ""


class SkillEvidence(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    reason: str = Field(min_length=1)
    evidence: List[str] = Field(min_length=1)


class ProfileResponse(BaseModel):
    skills: List[SkillEvidence]


class CareerPathway(BaseModel):
    name: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    matchedSubjects: List[str] = Field(default_factory=list)
    matchedSkills: List[str] = Field(default_factory=list)


class CareerRequest(Evidence):
    skills: List[SkillEvidence]


class CareersResponse(BaseModel):
    pathways: List[CareerPathway]


class OpportunityRequest(CareerRequest):
    pathways: List[CareerPathway] = Field(default_factory=list)
    currentRequest: str = ""


class Opportunity(BaseModel):
    title: str = Field(min_length=1)
    organisation: str = Field(min_length=1)
    url: HttpUrl
    summary: str = Field(min_length=1)
    whyMatched: str = Field(min_length=1)
    deadline: Optional[str] = None
    eligibility: Optional[str] = None


class OpportunitiesResponse(BaseModel):
    opportunities: List[Opportunity]
    message: Optional[str] = None


class ModelOutputError(Exception):
    pass


app = FastAPI(title="Verity Student Profile API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


PROFILE_SCHEMA = {
    "name": "verity_profile",
    "schema": {
        "type": "object",
        "properties": {
            "skills": {
                "type": "array",
                "minItems": 6,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "enum": SKILL_NAMES},
                        "score": {"type": "integer", "minimum": 0, "maximum": 100},
                        "reason": {"type": "string", "minLength": 1},
                        "evidence": {
                            "type": "array",
                            "minItems": 1,
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["name", "score", "reason", "evidence"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["skills"],
        "additionalProperties": False,
    },
}

CAREERS_SCHEMA = {
    "name": "verity_careers",
    "schema": {
        "type": "object",
        "properties": {
            "pathways": {
                "type": "array",
                "minItems": 3,
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "minLength": 1},
                        "reason": {"type": "string", "minLength": 1},
                        "matchedSubjects": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "matchedSkills": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["name", "reason", "matchedSubjects", "matchedSkills"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["pathways"],
        "additionalProperties": False,
    },
}

OPPORTUNITIES_SCHEMA = {
    "name": "verity_opportunities",
    "schema": {
        "type": "object",
        "properties": {
            "opportunities": {
                "type": "array",
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "minLength": 1},
                        "organisation": {"type": "string", "minLength": 1},
                        "url": {"type": "string", "format": "uri"},
                        "summary": {"type": "string", "minLength": 1},
                        "whyMatched": {"type": "string", "minLength": 1},
                        "deadline": {"type": ["string", "null"]},
                        "eligibility": {"type": ["string", "null"]},
                    },
                    "required": [
                        "title",
                        "organisation",
                        "url",
                        "summary",
                        "whyMatched",
                        "deadline",
                        "eligibility",
                    ],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["opportunities"],
        "additionalProperties": False,
    },
}


def model_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def validate_evidence(evidence: Evidence) -> None:
    names = [subject.name for subject in evidence.subjects]
    if len(names) != len(SUBJECT_NAMES) or set(names) != set(SUBJECT_NAMES):
        raise HTTPException(
            status_code=422,
            detail="Exactly one score is required for each supported subject.",
        )
    invalid_types = [project.type for project in evidence.projects if project.type not in EXPOSURE_TYPES]
    if invalid_types:
        raise HTTPException(status_code=422, detail="A project has an unsupported exposure type.")


def validate_skills(skills: List[SkillEvidence]) -> None:
    names = [skill.name for skill in skills]
    if len(names) != len(SKILL_NAMES) or set(names) != set(SKILL_NAMES):
        raise HTTPException(status_code=422, detail="Exactly the six required skills are needed.")


def openrouter_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": schema["name"],
            "strict": True,
            "schema": schema["schema"],
        },
    }


async def call_openrouter(
    messages: List[Dict[str, str]],
    schema: Dict[str, Any],
    tools: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    model = os.getenv("OPENROUTER_MODEL", "").strip()
    if not api_key or not model:
        raise HTTPException(
            status_code=500,
            detail="OpenRouter is not configured on the server.",
        )

    body: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "response_format": openrouter_schema(schema),
        "provider": {"require_parameters": True},
    }
    if tools:
        body["tools"] = tools
        body["max_tool_calls"] = 5

    try:
        timeout = httpx.Timeout(45.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": "Bearer " + api_key,
                    "Content-Type": "application/json",
                },
                json=body,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenRouter timed out.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach OpenRouter.")

    if response.status_code < 200 or response.status_code >= 300:
        raise HTTPException(
            status_code=502,
            detail="OpenRouter request failed with status " + str(response.status_code) + ".",
        )

    try:
        response_data = response.json()
        message = response_data["choices"][0]["message"]
        content = message["content"]
        if not isinstance(content, str):
            raise ValueError("Model content was not text.")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("Model content was not a JSON object.")
        annotations = message.get("annotations", [])
        if not isinstance(annotations, list):
            annotations = []
        return parsed, annotations
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="OpenRouter returned malformed JSON.")


def validate_profile_output(raw: Dict[str, Any]) -> ProfileResponse:
    if set(raw.keys()) != {"skills"} or not isinstance(raw["skills"], list):
        raise ModelOutputError("The profile response has the wrong shape.")
    if len(raw["skills"]) != len(SKILL_NAMES):
        raise ModelOutputError("The profile response did not contain six skills.")

    seen: Set[str] = set()
    validated: List[SkillEvidence] = []
    for item in raw["skills"]:
        if not isinstance(item, dict) or set(item.keys()) != {"name", "score", "reason", "evidence"}:
            raise ModelOutputError("A profile skill was malformed.")
        if item["name"] in seen or item["name"] not in SKILL_NAMES:
            raise ModelOutputError("The profile response contained an unexpected skill.")
        if type(item["score"]) is not int or not 0 <= item["score"] <= 100:
            raise ModelOutputError("A profile score was outside 0 to 100.")
        if not isinstance(item["reason"], str) or not item["reason"].strip():
            raise ModelOutputError("A profile reason was missing.")
        if (
            not isinstance(item["evidence"], list)
            or not item["evidence"]
            or any(not isinstance(evidence, str) for evidence in item["evidence"])
        ):
            raise ModelOutputError("A profile evidence list was malformed.")
        seen.add(item["name"])
        validated.append(SkillEvidence(**item))

    if seen != set(SKILL_NAMES):
        raise ModelOutputError("The profile response omitted a required skill.")
    return ProfileResponse(skills=validated)


def validate_career_output(raw: Dict[str, Any]) -> CareersResponse:
    if set(raw.keys()) != {"pathways"} or not isinstance(raw["pathways"], list):
        raise ModelOutputError("The careers response has the wrong shape.")
    if not 3 <= len(raw["pathways"]) <= 5:
        raise ModelOutputError("The careers response must contain 3 to 5 pathways.")

    subject_set = set(SUBJECT_NAMES)
    skill_set = set(SKILL_NAMES)
    names: Set[str] = set()
    validated: List[CareerPathway] = []
    for item in raw["pathways"]:
        if not isinstance(item, dict) or set(item.keys()) != {
            "name",
            "reason",
            "matchedSubjects",
            "matchedSkills",
        }:
            raise ModelOutputError("A career pathway was malformed.")
        if not isinstance(item["name"], str) or not item["name"].strip() or item["name"] in names:
            raise ModelOutputError("A career pathway name was invalid.")
        if not isinstance(item["reason"], str) or not item["reason"].strip():
            raise ModelOutputError("A career pathway reason was missing.")
        if (
            not isinstance(item["matchedSubjects"], list)
            or not isinstance(item["matchedSkills"], list)
            or any(subject not in subject_set for subject in item["matchedSubjects"])
            or any(skill not in skill_set for skill in item["matchedSkills"])
        ):
            raise ModelOutputError("A career pathway match was invalid.")
        names.add(item["name"])
        validated.append(CareerPathway(**item))
    return CareersResponse(pathways=validated)


def normalized_url(value: str) -> Optional[str]:
    try:
        parts = urlsplit(value.strip())
    except ValueError:
        return None
    if parts.scheme.lower() not in {"http", "https"} or not parts.netloc:
        return None
    path = parts.path.rstrip("/") or "/"
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), path, parts.query, "")
    )


def citation_urls(annotations: List[Dict[str, Any]]) -> Set[str]:
    urls: Set[str] = set()
    for annotation in annotations:
        if not isinstance(annotation, dict) or annotation.get("type") != "url_citation":
            continue
        citation = annotation.get("url_citation")
        if isinstance(citation, dict) and isinstance(citation.get("url"), str):
            url = normalized_url(citation["url"])
            if url:
                urls.add(url)
    return urls


def validate_opportunity_output(
    raw: Dict[str, Any],
    annotations: List[Dict[str, Any]],
) -> OpportunitiesResponse:
    if set(raw.keys()) != {"opportunities"} or not isinstance(raw["opportunities"], list):
        raise ModelOutputError("The opportunities response has the wrong shape.")
    if len(raw["opportunities"]) > 6:
        raise ModelOutputError("The opportunities response contained too many results.")

    grounded_urls = citation_urls(annotations)
    grounded: List[Opportunity] = []
    expected_keys = {
        "title",
        "organisation",
        "url",
        "summary",
        "whyMatched",
        "deadline",
        "eligibility",
    }
    for item in raw["opportunities"]:
        if not isinstance(item, dict) or set(item.keys()) != expected_keys:
            raise ModelOutputError("An opportunity was malformed.")
        if item["deadline"] is not None and not isinstance(item["deadline"], str):
            raise ModelOutputError("An opportunity deadline was malformed.")
        if item["eligibility"] is not None and not isinstance(item["eligibility"], str):
            raise ModelOutputError("An opportunity eligibility field was malformed.")
        try:
            opportunity = Opportunity(**item)
        except Exception as error:
            raise ModelOutputError("An opportunity field was invalid.") from error
        if normalized_url(str(opportunity.url)) in grounded_urls:
            grounded.append(opportunity)

    message = None if grounded else "No suitable current opportunities were found."
    return OpportunitiesResponse(opportunities=grounded, message=message)


def evidence_context(evidence: Evidence) -> str:
    return json.dumps(model_dict(evidence), ensure_ascii=False)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/profile", response_model=ProfileResponse)
async def create_profile(evidence: Evidence) -> ProfileResponse:
    validate_evidence(evidence)
    raw, _ = await call_openrouter(
        [
            {
                "role": "system",
                "content": (
                    "You are Verity. Infer evidence strength, not objective ability. "
                    "Use only the supplied subjects, topic scores, projects, exposure, and interests. "
                    "Return all six required skills. Be conservative when evidence is limited and explain "
                    "the limitation. Never infer demographics, socioeconomic status, personality, disability, "
                    "or other sensitive characteristics. Return only JSON matching the schema."
                ),
            },
            {
                "role": "user",
                "content": "Student evidence JSON: " + evidence_context(evidence),
            },
        ],
        PROFILE_SCHEMA,
    )
    try:
        return validate_profile_output(raw)
    except ModelOutputError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.post("/api/careers", response_model=CareersResponse)
async def create_careers(request: CareerRequest) -> CareersResponse:
    validate_evidence(request)
    validate_skills(request.skills)
    raw, _ = await call_openrouter(
        [
            {
                "role": "system",
                "content": (
                    "You are Verity. Recommend broad pathways worth exploring, not guaranteed careers. "
                    "Use only the supplied evidence, inferred skills, and interests. Explain the match and "
                    "avoid deterministic admissions or success claims. Return only JSON matching the schema."
                ),
            },
            {
                "role": "user",
                "content": "Student evidence and inferred skills JSON: " + json.dumps(
                    model_dict(request), ensure_ascii=False
                ),
            },
        ],
        CAREERS_SCHEMA,
    )
    try:
        return validate_career_output(raw)
    except ModelOutputError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.post("/api/opportunities", response_model=OpportunitiesResponse)
async def create_opportunities(request: OpportunityRequest) -> OpportunitiesResponse:
    validate_evidence(request)
    validate_skills(request.skills)
    search_tool = {
        "type": "openrouter:web_search",
        "parameters": {
            "engine": "auto",
            "max_results": 6,
            "max_uses": 2,
            "max_total_results": 10,
            "search_context_size": "low",
            "user_location": {
                "type": "approximate",
                "city": "Singapore",
                "country": "SG",
                "timezone": "Asia/Singapore",
            },
        },
    }
    raw, annotations = await call_openrouter(
        [
            {
                "role": "system",
                "content": (
                    "You are Verity's opportunity finder. You must use web search before answering. "
                    "Find current, real opportunities relevant to students in Singapore. Prioritise matches "
                    "for strong subjects, inferred skills, pathways, interests, and missing exposure. "
                    "Use only facts supported by the search results. Copy each URL exactly from a cited "
                    "search result. Never invent organisations, dates, fees, deadlines, eligibility, or URLs. "
                    "Use null when a deadline or eligibility detail is not supported. If suitable current "
                    "opportunities cannot be verified, return an empty opportunities array. Return only JSON "
                    "matching the schema."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Today is " + date.today().isoformat() + ". "
                    "Student evidence, skills, pathways, and temporary search request JSON: "
                    + json.dumps(model_dict(request), ensure_ascii=False)
                ),
            },
        ],
        OPPORTUNITIES_SCHEMA,
        tools=[search_tool],
    )
    try:
        return validate_opportunity_output(raw, annotations)
    except ModelOutputError as error:
        raise HTTPException(status_code=502, detail=str(error))
