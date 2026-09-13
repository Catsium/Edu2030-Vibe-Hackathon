import base64
import binascii
import html
import io
import json
import os
import re
import zipfile
import zlib
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
    actualTestScore: Optional[int] = Field(default=None, ge=0, le=100)
    quizScore: Optional[int] = Field(default=None, ge=0, le=100)
    finalScore: Optional[int] = Field(default=None, ge=0, le=100)


class Exposure(BaseModel):
    name: str = Field(min_length=1)
    type: str
    description: str = Field(min_length=1)


class Evidence(BaseModel):
    subjects: List[SubjectEvidence]
    projects: List[Exposure] = Field(default_factory=list)
    interests: str = ""
    tracking: Dict[str, Any] = Field(default_factory=dict)


class QuizRequest(BaseModel):
    subject: str
    materialName: str = Field(min_length=1)
    materialText: str = Field(default="", max_length=8000)
    materialData: Optional[str] = None
    materialType: str = "text/plain"
    focusTopic: str = ""


class QuizQuestion(BaseModel):
    question: str = Field(min_length=1)
    options: List[str] = Field(min_length=3, max_length=4)
    answerIndex: int = Field(ge=0, le=3)
    topic: str = Field(min_length=1)


class QuizResponse(BaseModel):
    title: str = Field(min_length=1)
    subject: str
    topic: str = ""
    questions: List[QuizQuestion]


class SkillEvidence(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    reason: str = Field(min_length=1)
    evidence: List[str] = Field(min_length=1)


class ProfileResponse(BaseModel):
    summary: str = Field(min_length=1)
    skills: List[SkillEvidence]


class CareerPathway(BaseModel):
    name: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    matchedSubjects: List[str] = Field(default_factory=list)
    matchedSkills: List[str] = Field(default_factory=list)


class CareerRequest(Evidence):
    skills: List[SkillEvidence]


class CareersResponse(BaseModel):
    intro: str = Field(min_length=1)
    pathways: List[CareerPathway]


class OpportunityRequest(Evidence):
    skills: List[SkillEvidence] = Field(default_factory=list)
    pathways: List[CareerPathway] = Field(default_factory=list)
    currentRequest: str = ""


class Opportunity(BaseModel):
    title: str = Field(min_length=1)
    organisation: str = Field(min_length=1)
    url: HttpUrl
    summary: str = Field(min_length=1)
    interestMatch: int = Field(ge=0, le=100)
    whyYouMayLikeIt: str = Field(min_length=1)
    whatItAdds: str = Field(min_length=1)
    deadline: Optional[str] = None
    eligibility: Optional[str] = None


class OpportunitiesResponse(BaseModel):
    intro: str = Field(min_length=1)
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
            "summary": {
                "type": "string",
                "minLength": 1,
            },
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
        "required": ["summary", "skills"],
        "additionalProperties": False,
    },
}

CAREERS_SCHEMA = {
    "name": "verity_careers",
    "schema": {
        "type": "object",
        "properties": {
            "intro": {
                "type": "string",
                "minLength": 1,
            },
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
        "required": ["intro", "pathways"],
        "additionalProperties": False,
    },
}

QUIZ_SCHEMA = {
    "name": "verity_quiz",
    "schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "minLength": 1},
            "subject": {"type": "string", "enum": SUBJECT_NAMES},
            "topic": {"type": "string"},
            "questions": {
                "type": "array",
                "minItems": 3,
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string", "minLength": 1},
                        "options": {
                            "type": "array",
                            "minItems": 3,
                            "maxItems": 4,
                            "items": {"type": "string", "minLength": 1},
                        },
                        "answerIndex": {"type": "integer", "minimum": 0, "maximum": 3},
                        "topic": {"type": "string", "minLength": 1},
                    },
                    "required": ["question", "options", "answerIndex", "topic"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["title", "subject", "topic", "questions"],
        "additionalProperties": False,
    },
}

OPPORTUNITIES_SCHEMA = {
    "name": "verity_opportunities",
    "schema": {
        "type": "object",
        "properties": {
            "intro": {"type": "string", "minLength": 1},
            "opportunities": {
                "type": "array",
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "minLength": 1},
                        "organisation": {"type": "string", "minLength": 1},
                        "url": {"type": "string", "minLength": 1},
                        "summary": {"type": "string", "minLength": 1},
                        "interestMatch": {"type": "integer", "minimum": 0, "maximum": 100},
                        "whyYouMayLikeIt": {"type": "string", "minLength": 1},
                        "whatItAdds": {"type": "string", "minLength": 1},
                        "deadline": {"type": ["string", "null"]},
                        "eligibility": {"type": ["string", "null"]},
                    },
                    "required": [
                        "title",
                        "organisation",
                        "url",
                        "summary",
                        "interestMatch",
                        "whyYouMayLikeIt",
                        "whatItAdds",
                        "deadline",
                        "eligibility",
                    ],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["intro", "opportunities"],
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
    plugins: Optional[List[Dict[str, Any]]] = None,
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
    if plugins:
        body["plugins"] = plugins

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
    if set(raw.keys()) != {"summary", "skills"} or not isinstance(raw["skills"], list):
        raise ModelOutputError("The profile response has the wrong shape.")
    if not isinstance(raw["summary"], str) or not raw["summary"].strip():
        raise ModelOutputError("The profile summary was missing.")
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
    return ProfileResponse(summary=raw["summary"].strip(), skills=validated)


def validate_career_output(raw: Dict[str, Any]) -> CareersResponse:
    if set(raw.keys()) != {"intro", "pathways"} or not isinstance(raw["pathways"], list):
        raise ModelOutputError("The careers response has the wrong shape.")
    if not isinstance(raw["intro"], str) or not raw["intro"].strip():
        raise ModelOutputError("The careers introduction was missing.")
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
    return CareersResponse(intro=raw["intro"].strip(), pathways=validated)


def extract_pdf_text(data: bytes) -> str:
    chunks: List[str] = []
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", data, re.S):
        stream = match.group(1)
        try:
            stream = zlib.decompress(stream)
        except zlib.error:
            pass
        decoded = stream.decode("latin-1", errors="ignore")
        for text_match in re.finditer(r"\((?:\\.|[^\\)])*\)", decoded):
            value = text_match.group(0)[1:-1]
            value = re.sub(r"\\([\\()])", r"\1", value)
            if value.strip():
                chunks.append(value)
    return " ".join(chunks).strip()


def extract_docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    except (KeyError, zipfile.BadZipFile):
        return ""
    values = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml, flags=re.S)
    return html.unescape(" ".join(values)).strip()


def material_text(request: QuizRequest) -> str:
    if request.materialText.strip():
        return request.materialText.strip()[:12000]
    if not request.materialData:
        return ""
    try:
        data = base64.b64decode(request.materialData, validate=True)
    except (ValueError, binascii.Error):
        return ""
    if request.materialType == "application/pdf":
        return extract_pdf_text(data)[:12000]
    if request.materialType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_docx_text(data)[:12000]
    return ""


def validate_quiz_request(request: QuizRequest) -> None:
    if request.subject not in SUBJECT_NAMES:
        raise HTTPException(status_code=422, detail="Choose one of the supported subjects.")
    if request.materialType not in {
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }:
        raise HTTPException(status_code=422, detail="Use TXT, MD, CSV, PDF, or DOCX material.")
    if not material_text(request):
        raise HTTPException(status_code=422, detail="The uploaded material did not contain readable text.")


def validate_quiz_output(raw: Dict[str, Any]) -> QuizResponse:
    if set(raw.keys()) != {"title", "subject", "topic", "questions"}:
        raise ModelOutputError("The quiz response has the wrong shape.")
    if not isinstance(raw["title"], str) or not raw["title"].strip():
        raise ModelOutputError("The quiz title was missing.")
    if raw["subject"] not in SUBJECT_NAMES:
        raise ModelOutputError("The quiz subject was invalid.")
    if not isinstance(raw["topic"], str) or not isinstance(raw["questions"], list) or not 3 <= len(raw["questions"]) <= 5:
        raise ModelOutputError("The quiz must contain 3 to 5 questions.")
    questions: List[QuizQuestion] = []
    for item in raw["questions"]:
        if not isinstance(item, dict) or set(item.keys()) != {"question", "options", "answerIndex", "topic"}:
            raise ModelOutputError("A quiz question was malformed.")
        options = item["options"]
        if (
            not isinstance(item["question"], str)
            or not item["question"].strip()
            or not isinstance(options, list)
            or not 3 <= len(options) <= 4
            or any(not isinstance(option, str) or not option.strip() for option in options)
            or type(item["answerIndex"]) is not int
            or not 0 <= item["answerIndex"] < len(options)
            or not isinstance(item["topic"], str)
            or not item["topic"].strip()
        ):
            raise ModelOutputError("A quiz question contained invalid fields.")
        questions.append(QuizQuestion(**item))
    return QuizResponse(title=raw["title"].strip(), subject=raw["subject"], topic=raw["topic"].strip(), questions=questions)


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
    if set(raw.keys()) != {"intro", "opportunities"} or not isinstance(raw["opportunities"], list):
        raise ModelOutputError("The opportunities response has the wrong shape.")
    if not isinstance(raw["intro"], str) or not raw["intro"].strip():
        raise ModelOutputError("The opportunity introduction was missing.")
    if len(raw["opportunities"]) > 10:
        raise ModelOutputError("The opportunities response contained too many results.")

    grounded_urls = citation_urls(annotations)
    grounded: List[Opportunity] = []
    expected_keys = {
        "title",
        "organisation",
        "url",
        "summary",
        "interestMatch",
        "whyYouMayLikeIt",
        "whatItAdds",
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
        if type(item["interestMatch"]) is not int or not 0 <= item["interestMatch"] <= 100:
            raise ModelOutputError("An opportunity match score was outside 0 to 100.")
        try:
            opportunity = Opportunity(**item)
        except Exception as error:
            raise ModelOutputError("An opportunity field was invalid.") from error
        if normalized_url(str(opportunity.url)) in grounded_urls:
            grounded.append(opportunity)

    grounded.sort(key=lambda opportunity: opportunity.interestMatch, reverse=True)
    message = None if grounded else "No suitable current opportunities were found."
    return OpportunitiesResponse(intro=raw["intro"].strip(), opportunities=grounded, message=message)


def evidence_context(evidence: Evidence) -> str:
    return json.dumps(model_dict(evidence), ensure_ascii=False)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/quiz", response_model=QuizResponse)
async def create_quiz(request: QuizRequest) -> QuizResponse:
    validate_quiz_request(request)
    extracted_text = material_text(request)
    raw, _ = await call_openrouter(
        [
            {
                "role": "system",
                "content": (
                    "You are Verity, creating a short classroom practice quiz. Use only the supplied class "
                    "material. Create 3 to 5 multiple-choice questions with one correct answer. Keep questions "
                    "clear for a student, label each question with the topic it tests, and use the requested focus "
                    "topic when it is supplied. Do not infer personal traits or add facts not present in the material. "
                    "Return only JSON matching the schema."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Subject: " + request.subject + "\nMaterial title: " + request.materialName
                    + "\nFocus topic: " + (request.focusTopic or "Use the most useful topic in the material")
                    + "\nClass material:\n" + extracted_text
                ),
            },
        ],
        QUIZ_SCHEMA,
    )
    try:
        return validate_quiz_output(raw)
    except ModelOutputError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.post("/api/profile", response_model=ProfileResponse)
async def create_profile(evidence: Evidence) -> ProfileResponse:
    validate_evidence(evidence)
    raw, _ = await call_openrouter(
        [
            {
                "role": "system",
                "content": (
                    "You are Verity. Infer evidence strength, not objective ability. "
                    "Use only the supplied subjects, topic scores, projects, exposure, tracking activity, and interests. "
                    "Treat quiz attempts, class materials, topics practiced, and learning progress as important context; "
                    "do not base the profile on hard subject scores alone. "
                    "Return one short supportive summary describing the strongest evidence, followed by all "
                    "six required skills. Be conservative when evidence is limited and explain the limitation. "
                    "Never infer demographics, socioeconomic status, personality, disability, or other sensitive "
                    "characteristics. Never mention evidence that is not supplied. Return only JSON matching the schema."
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
                    "Use only the supplied evidence, tracking activity, inferred skills, and interests. Start with one short, "
                    "supportive intro explaining what the profile leans toward. Explain every pathway match "
                    "and avoid deterministic admissions or success claims. Never mention evidence that is not "
                    "supplied. Return only JSON matching the schema."
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
    if request.skills:
        validate_skills(request.skills)
    search_plugins = [{"id": "web"}]
    raw, annotations = await call_openrouter(
        [
            {
                "role": "system",
                "content": (
                    "You are Verity's opportunity finder. You must use web search before answering. "
                    "Find current, real opportunities relevant to students in Singapore. Prioritise matches "
                    "by explicit current interests first, then tracked learning activity, inferred skills, strong subjects and topics, "
                    "pathways, existing exposure, and exposure gaps. A practical opportunity matching a stated "
                    "interest should rank above a generic opportunity. Start with a short 1 to 2 sentence "
                    "personalised intro using only supplied evidence. For every result, provide an integer "
                    "interestMatch from 0 to 100, address the student directly in whyYouMayLikeIt, and explain "
                    "whatItAdds to the current record. If matching exposure already exists, describe building "
                    "on it instead of claiming a gap. "
                    "Use only facts supported by the search results. Copy each URL exactly from a cited "
                    "search result. Never invent organisations, dates, fees, deadlines, eligibility, or URLs. "
                    "Use null when a deadline or eligibility detail is not supported. Return 6 to 10 distinct "
                    "opportunities when enough verified results exist; otherwise return "
                    "all verified results. If suitable current opportunities cannot be verified, return an empty "
                    "opportunities array. Return only JSON "
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
        plugins=search_plugins,
    )
    try:
        return validate_opportunity_output(raw, annotations)
    except ModelOutputError as error:
        raise HTTPException(status_code=502, detail=str(error))
