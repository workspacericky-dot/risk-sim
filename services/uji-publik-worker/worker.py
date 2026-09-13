"""Worker NLP/statistik Uji Publik ZI; dirancang untuk dijalankan di VM/container terpisah."""

from __future__ import annotations

import argparse
import json
import os
import time
from collections import defaultdict
from typing import Any

import numpy as np
import pandas as pd
import requests
from scipy.stats import f_oneway
from sklearn.cluster import KMeans

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma3:4b")
HIGH_RISK_DEFAULT = ["Integritas Pimpinan", "Pungutan Liar", "Gratifikasi", "Suap"]


class SupabaseRest:
    def __init__(self) -> None:
        if not SUPABASE_URL or not SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi")
        self.base = f"{SUPABASE_URL}/rest/v1"
        self.headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "application/json"}

    def get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = requests.get(f"{self.base}/{table}", headers=self.headers, params=params, timeout=60)
        response.raise_for_status()
        return response.json()

    def patch(self, table: str, filters: dict[str, str], values: dict[str, Any]) -> None:
        response = requests.patch(f"{self.base}/{table}", headers={**self.headers, "Prefer": "return=minimal"}, params=filters, json=values, timeout=60)
        response.raise_for_status()

    def upsert(self, table: str, rows: list[dict[str, Any]], conflict: str) -> None:
        response = requests.post(f"{self.base}/{table}", headers={**self.headers, "Prefer": "resolution=merge-duplicates,return=minimal"}, params={"on_conflict": conflict}, json=rows, timeout=60)
        response.raise_for_status()


def ollama_available() -> bool:
    try:
        return requests.get(f"{OLLAMA_URL}/api/tags", timeout=3).ok
    except requests.RequestException:
        return False


def extractor_agent(opinion: str, source_tags: list[str]) -> dict[str, Any]:
    """Agen 1: ekstraksi sentimen dan aspek; fallback tetap deterministik."""
    prompt = f"""Analisis opini layanan publik berbahasa Indonesia. Balas JSON saja dengan keys sentiment_score (-1..1), sentiment_label (positif/netral/negatif), tags (array), confidence (0..1). Pertahankan konteks integritas, pungli, gratifikasi, suap, kualitas layanan, waktu layanan, transparansi. Tag sumber: {source_tags}. Opini: {opinion}"""
    try:
        response = requests.post(f"{OLLAMA_URL}/api/generate", json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json"}, timeout=120)
        response.raise_for_status()
        result = json.loads(response.json()["response"])
        score = max(-1.0, min(1.0, float(result.get("sentiment_score", 0))))
        label = str(result.get("sentiment_label", "netral")).lower()
        if label not in {"positif", "netral", "negatif"}:
            label = "positif" if score > 0.15 else "negatif" if score < -0.15 else "netral"
        return {"sentiment_score": score, "sentiment_label": label, "tags": clean_tags(result.get("tags", [])), "confidence": max(0.0, min(1.0, float(result.get("confidence", 0.7)))), "model": f"ollama:{OLLAMA_MODEL}"}
    except (requests.RequestException, KeyError, ValueError, TypeError, json.JSONDecodeError):
        return lexical_analysis(opinion)


def validator_agent(extraction: dict[str, Any], rating: int, source_tags: list[str], high_risk_tags: list[str]) -> dict[str, Any]:
    """Agen 2: validasi alignment rating dan penandaan risiko."""
    label = extraction["sentiment_label"]
    mismatch = (rating >= 4 and label == "negatif") or (rating <= 2 and label == "positif")
    reason = None
    if rating >= 4 and label == "negatif":
        reason = "Rating tinggi tidak selaras dengan sentimen negatif"
    elif rating <= 2 and label == "positif":
        reason = "Rating rendah tidak selaras dengan sentimen positif"
    all_tags = clean_tags([*source_tags, *extraction["tags"]])
    risk_lookup = {tag.casefold(): tag for tag in high_risk_tags}
    risky = sorted({risk_lookup[tag.casefold()] for tag in all_tags if tag.casefold() in risk_lookup})
    return {**extraction, "mismatch": mismatch, "mismatch_reason": reason, "high_risk_tags": risky}


def lexical_analysis(opinion: str) -> dict[str, Any]:
    text = opinion.casefold()
    positive_words = ["baik", "bagus", "ramah", "cepat", "puas", "mudah", "jelas", "transparan", "bersih", "profesional", "adil", "nyaman"]
    negative_words = ["buruk", "lambat", "lama", "sulit", "kecewa", "tidak ramah", "tidak jelas", "pungli", "suap", "gratifikasi", "diskriminasi", "mahal", "antrean panjang"]
    positive = sum(word in text for word in positive_words)
    negative = sum(word in text for word in negative_words)
    score = (positive - negative) / max(1, positive + negative)
    tags = []
    rules = {"Integritas Pimpinan": ["integritas pimpinan", "keteladanan"], "Pungutan Liar": ["pungli", "pungutan liar", "uang pelicin"], "Gratifikasi": ["gratifikasi", "hadiah"], "Suap": ["suap", "sogok"], "Kualitas Layanan": ["layanan", "pelayanan", "petugas"], "Waktu Layanan": ["antrean", "antrian", "lambat", "lama"], "Transparansi": ["transparan", "informasi", "biaya", "prosedur"]}
    for tag, words in rules.items():
        if any(word in text for word in words):
            tags.append(tag)
    label = "positif" if score > 0.15 else "negatif" if score < -0.15 else "netral"
    return {"sentiment_score": score, "sentiment_label": label, "tags": tags, "confidence": min(0.9, 0.55 + abs(score) * 0.35), "model": "rule-based-id-v1"}


def anova_summary(frame: pd.DataFrame, dimension: str) -> dict[str, Any]:
    groups = [group["star_rating"].astype(float).to_numpy() for _, group in frame.groupby(dimension) if len(group) >= 2]
    if len(groups) < 2:
        return {"status": "sampel_tidak_cukup", "groups": len(groups)}
    statistic, p_value = f_oneway(*groups)
    return {"status": "selesai", "groups": len(groups), "f_statistic": round(float(statistic), 6), "p_value": round(float(p_value), 6), "significant_005": bool(p_value < 0.05)}


def process_run(api: SupabaseRest, run: dict[str, Any]) -> None:
    run_id = run["id"]
    batch_id = run.get("batch_id")
    now = pd.Timestamp.now(tz="UTC").isoformat()
    api.patch("zi_analysis_runs", {"id": f"eq.{run_id}"}, {"status": "diproses", "started_at": now})
    try:
        config_rows = api.get("zi_analysis_config", {"id": "eq.1", "select": "*"})
        config = config_rows[0] if config_rows else {}
        weights = {"low": float(config.get("low_rating_weight", 0.4)), "tag": float(config.get("high_risk_tag_weight", 0.35)), "negative": float(config.get("negative_sentiment_weight", 0.25))}
        high_risk_tags = config.get("high_risk_tags") or HIGH_RISK_DEFAULT
        params = {"select": "id,unit_kerja_id,unit_nama_raw,age_group,gender,occupation,source_tags,opinion,star_rating"}
        if batch_id:
            params["batch_id"] = f"eq.{batch_id}"
        responses = api.get("zi_responses", params)
        analyzed: list[dict[str, Any]] = []
        for row in responses:
            extraction = extractor_agent(row["opinion"], row.get("source_tags") or [])
            result = validator_agent(extraction, int(row["star_rating"]), row.get("source_tags") or [], high_risk_tags)
            api.upsert("zi_response_analysis", [{"response_id": row["id"], "status": "perlu_reviu" if result["mismatch"] else "selesai", "sentiment_score": result["sentiment_score"], "sentiment_label": result["sentiment_label"], "mismatch": result["mismatch"], "mismatch_reason": result["mismatch_reason"], "ai_tags": result["tags"], "high_risk_tags": result["high_risk_tags"], "confidence": result["confidence"], "model_name": result["model"], "model_version": "1", "analyzed_at": now, "updated_at": now}], "response_id")
            analyzed.append({**row, **result})

        frame = pd.DataFrame(analyzed)
        metrics: list[dict[str, Any]] = []
        if not frame.empty:
            for unit_id, group in frame.dropna(subset=["unit_kerja_id"]).groupby("unit_kerja_id"):
                low_pct = float((group["star_rating"] <= 2).mean() * 100)
                tag_pct = float(group["high_risk_tags"].map(bool).mean() * 100)
                negative = float(group["sentiment_score"].map(lambda value: max(0.0, -float(value))).mean() * 100)
                cri = low_pct * weights["low"] + tag_pct * weights["tag"] + negative * weights["negative"]
                metrics.append({"unit_kerja_id": unit_id, "batch_id": batch_id, "sample_size": len(group), "average_rating": round(float(group["star_rating"].mean()), 2), "low_rating_pct": round(low_pct, 4), "high_risk_tag_pct": round(tag_pct, 4), "negative_sentiment_intensity": round(negative, 4), "cri_score": round(cri, 4), "risk_level": "tinggi" if cri >= 65 else "menengah" if cri >= 35 else "rendah", "cluster_label": None, "breakdown": {"weights": weights, "model": sorted(set(group["model"]))}, "calculated_at": now})
        if len(metrics) >= 3:
            features = np.array([[row["low_rating_pct"], row["high_risk_tag_pct"], row["negative_sentiment_intensity"]] for row in metrics])
            labels = KMeans(n_clusters=3, random_state=42, n_init=10).fit_predict(features)
            cluster_risk = {label: np.mean([metrics[index]["cri_score"] for index, value in enumerate(labels) if value == label]) for label in set(labels)}
            ordered = {label: name for label, name in zip(sorted(cluster_risk, key=cluster_risk.get), ["rendah", "menengah", "tinggi"])}
            for index, label in enumerate(labels):
                metrics[index]["cluster_label"] = ordered[int(label)]
        else:
            for metric in metrics:
                metric["cluster_label"] = metric["risk_level"]
        if metrics:
            api.upsert("zi_unit_metrics", metrics, "unit_kerja_id,batch_id")
        summary = {"anova": {dimension: anova_summary(frame, dimension) for dimension in ["occupation", "age_group", "gender"]} if not frame.empty else {}, "ollama_available": ollama_available(), "responses": len(analyzed), "units": len(metrics), "weights": weights}
        api.patch("zi_analysis_runs", {"id": f"eq.{run_id}"}, {"status": "selesai", "processed_responses": len(analyzed), "result_summary": summary, "completed_at": now})
        if batch_id:
            api.patch("zi_import_batches", {"id": f"eq.{batch_id}"}, {"status": "selesai", "completed_at": now})
    except Exception as exc:
        api.patch("zi_analysis_runs", {"id": f"eq.{run_id}"}, {"status": "gagal", "error_message": str(exc), "completed_at": now})
        if batch_id:
            api.patch("zi_import_batches", {"id": f"eq.{batch_id}"}, {"status": "selesai_dengan_error", "catatan": str(exc), "completed_at": now})
        raise


def clean_tags(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    return sorted({str(value).strip() for value in values if str(value).strip()})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Proses maksimal satu run lalu berhenti")
    parser.add_argument("--interval", type=int, default=15)
    args = parser.parse_args()
    api = SupabaseRest()
    while True:
        runs = api.get("zi_analysis_runs", {"status": "eq.menunggu", "select": "*", "order": "created_at.asc", "limit": "1"})
        if runs:
            process_run(api, runs[0])
        if args.once:
            break
        time.sleep(max(5, args.interval))


if __name__ == "__main__":
    main()

