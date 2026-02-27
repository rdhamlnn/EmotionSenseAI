"""Evaluation router: serve model evaluation metrics (confusion matrix, accuracy, etc.)."""

import os
from typing import List, Dict, Any

import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

EVAL_PATH = os.path.join(os.path.dirname(settings.MODEL_PATH), "evaluation.joblib")


class PerClassMetrics(BaseModel):
    label: str
    precision: float
    recall: float
    f1Score: float
    support: int


class EvaluationResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1Score: float
    labels: List[str]
    confusionMatrix: List[List[int]]
    perClass: List[PerClassMetrics]
    trainSize: int
    testSize: int
    totalDataset: int


@router.get("", response_model=EvaluationResponse)
def get_evaluation():
    if not os.path.exists(EVAL_PATH):
        raise HTTPException(
            status_code=404,
            detail="Evaluation metrics not found. Run training first (python -m ml.train).",
        )

    data: Dict[str, Any] = joblib.load(EVAL_PATH)
    report = data.get("classification_report", {})

    per_class: List[PerClassMetrics] = []
    for label in data["labels"]:
        if label in report:
            per_class.append(
                PerClassMetrics(
                    label=label,
                    precision=round(report[label]["precision"], 4),
                    recall=round(report[label]["recall"], 4),
                    f1Score=round(report[label]["f1-score"], 4),
                    support=int(report[label]["support"]),
                )
            )

    return EvaluationResponse(
        accuracy=data["accuracy"],
        precision=data["precision"],
        recall=data["recall"],
        f1Score=data["f1_score"],
        labels=data["labels"],
        confusionMatrix=data["confusion_matrix"],
        perClass=per_class,
        trainSize=data["train_size"],
        testSize=data["test_size"],
        totalDataset=data["total_dataset"],
    )
