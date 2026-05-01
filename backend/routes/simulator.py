import base64
import hashlib
import json
from datetime import UTC, datetime
from random import Random

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class BallotSelection(BaseModel):
    president: str
    senator: str
    measureA: str = Field(pattern="^(yes|no)$")


class BallotIngestionRequest(BaseModel):
    selection: BallotSelection
    precinct: str = "PCT-014"


class BallotEvent(BaseModel):
    serial: str
    precinct: str
    timestamp: str
    encryptedPayload: str
    signature: str


class TallyConfig(BaseModel):
    anomaly: bool = False
    precincts: int = 88


class CandidateTotal(BaseModel):
    candidate: str
    votes: int


class TallyResult(BaseModel):
    totalVotes: int
    precinctsReporting: int
    confidenceInterval: float
    anomalyInjected: bool
    totals: list[CandidateTotal]
    affectedPrecinct: str | None = None


class CertificationEvent(BaseModel):
    certifiedAt: str
    certificateId: str
    provenanceChain: list[str]
    summary: str


class AuditConfig(BaseModel):
    sampleSize: int = 312
    tally: TallyResult | None = None


class AuditResult(BaseModel):
    ballotsSampled: int
    machineCount: int
    handCount: int
    discrepancy: int
    recommendation: str


def _now() -> str:
    return datetime.now(tz=UTC).isoformat()


@router.post("/simulator/ingest", response_model=BallotEvent)
async def ingest_ballot(ballot: BallotIngestionRequest) -> BallotEvent:
    """Receive a mock ballot and return a signed event frame."""
    timestamp = _now()
    payload = json.dumps(ballot.model_dump(), sort_keys=True)
    digest = hashlib.sha256(f"{payload}:{timestamp}".encode()).digest()
    encrypted = base64.urlsafe_b64encode(digest).decode().rstrip("=")

    return BallotEvent(
      serial=f"EL-{encrypted[:10].upper()}",
      precinct=ballot.precinct,
      timestamp=timestamp,
      encryptedPayload=encrypted,
      signature=hashlib.sha256(encrypted.encode()).hexdigest(),
    )


@router.post("/simulator/tally", response_model=TallyResult)
async def run_tally(config: TallyConfig) -> TallyResult:
    """Run a deterministic mock tally and optionally inject an anomaly."""
    rng = Random(2026 if not config.anomaly else 441)
    base_totals = [
        CandidateTotal(candidate="Rivera", votes=5840 + rng.randint(0, 240)),
        CandidateTotal(candidate="Chen", votes=6018 + rng.randint(0, 220)),
        CandidateTotal(candidate="Patel", votes=852 + rng.randint(0, 90)),
    ]

    if config.anomaly:
        base_totals[1].votes += 720

    total_votes = sum(candidate.votes for candidate in base_totals)
    return TallyResult(
        totalVotes=total_votes,
        precinctsReporting=min(config.precincts, 88),
        confidenceInterval=4.8 if config.anomaly else 1.2,
        anomalyInjected=config.anomaly,
        totals=base_totals,
        affectedPrecinct="PCT-044" if config.anomaly else None,
    )


@router.post("/simulator/certify", response_model=CertificationEvent)
async def certify_election(report: TallyResult) -> CertificationEvent:
    """Generate a mock certification with a provenance chain."""
    digest = hashlib.sha256(report.model_dump_json().encode()).hexdigest()[:12].upper()
    return CertificationEvent(
        certifiedAt=_now(),
        certificateId=f"CERT-{digest}",
        provenanceChain=[
            "Precinct event frames signed",
            "County canvass board reconciled totals",
            "State certification ledger appended",
        ],
        summary="Certification generated after tally reconciliation and canvass checks.",
    )


@router.post("/simulator/audit", response_model=AuditResult)
async def run_audit(audit_config: AuditConfig) -> AuditResult:
    """Run a deterministic random-sampling audit."""
    sample_size = max(50, audit_config.sampleSize)
    machine_count = round(sample_size * 0.6)
    discrepancy = 1 if audit_config.tally and audit_config.tally.anomalyInjected else 0
    hand_count = machine_count - discrepancy
    recommendation = (
        "Escalate to chain-of-custody review for the affected precinct."
        if discrepancy
        else "No material discrepancy found. Preserve chain-of-custody records."
    )

    return AuditResult(
        ballotsSampled=sample_size,
        machineCount=machine_count,
        handCount=hand_count,
        discrepancy=discrepancy,
        recommendation=recommendation,
    )
