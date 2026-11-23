"""Read-only, redacted publication review of this checkout and reachable Git history.

This is a bounded pattern scan, not proof that no secret exists. It never reads
ignored files, other repositories, Git configuration, or external credentials.
Binary files require a separate visual/manual review. Run with Python 3.10+.
"""
from __future__ import annotations

import argparse
import collections
import datetime
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
MAX_BYTES = 10 * 1024 * 1024
RULES = {
    "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----",
    "github_token": r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b",
    "aws_access_key": r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    "provider_token": r"\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[\w-]{30,})\b",
    "jwt": r"\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b",
    "credential_assignment": r"(?i)\b(?:api[_-]?key|client[_-]?secret|password|access[_-]?token|secret[_-]?key)\s*[:=]\s*['\"][A-Za-z0-9/+_=.-]{16,}['\"]",
    "credential_in_url": r"(?i)https?://[^\s/:@]+:[^\s/@]+@",
    "email_address": r"\b[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b",
    "user_home_path": r"(?i)(?:[A-Z]:[\\/]+Users[\\/]+[^\\/\s\"'<>]+|/(?:Users|home)/[^/\s\"'<>]+)",
}
PATTERNS = {kind: re.compile(pattern) for kind, pattern in RULES.items()}
PRIVATE_TYPES = {"email_address", "user_home_path", "author_email", "committer_email"}
SENSITIVE_NAME = re.compile(r"(?i)(?:^|/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\..*)?)$|\.(?:pfx|p12|pem|key|sqlite\d*|db|log|dmp)$")


def git(*args: str) -> bytes:
    return subprocess.run(["git", "--no-optional-locks", "-C", str(ROOT), *args],
                          check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def scan(data: bytes) -> list[dict]:
    if b"\0" in data:
        return []
    text = data.decode("utf-8", errors="replace")
    findings = []
    for kind, pattern in PATTERNS.items():
        for match in pattern.finditer(text):
            classification = "review"
            if kind == "email_address":
                address = match.group().lower()
                if address.endswith(("@example.invalid", "@example.com")):
                    classification = "synthetic_example"
                elif address.endswith("@users.noreply.github.com"):
                    classification = "github_noreply"
                elif "license" in text[:100].lower():
                    classification = "possibly_required_license_attribution"
            findings.append({"kind": kind, "line": text.count("\n", 0, match.start()) + 1,
                             "classification": classification, "value": "[REDACTED]"})
    return findings


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="docs/evidence/publication-scan.json")
    args = parser.parse_args()
    if Path(git("rev-parse", "--show-toplevel").decode().strip()).resolve() != ROOT:
        raise SystemExit("Run only from the DevStation checkout containing this script.")
    output = (ROOT / args.output).resolve()
    if not output.is_relative_to(ROOT):
        raise SystemExit("The redacted report must remain inside this repository.")
    commits = git("rev-list", "--all").decode().splitlines()
    blobs: dict[str, dict] = {}
    findings: list[dict] = []
    skipped: list[dict] = []
    for commit in commits:
        metadata = git("show", "-s", "--format=%ae%x00%ce%x00%B", commit).decode("utf-8", errors="replace").split("\0", 2)
        for kind, address in zip(("author_email", "committer_email"), metadata[:2]):
            findings.append({"scope": "commit_metadata", "commit": commit, "kind": kind,
                             "classification": "github_noreply" if address.endswith("@users.noreply.github.com") else "review",
                             "value": "[REDACTED]"})
        for item in scan(metadata[2].encode()):
            findings.append({"scope": "commit_message", "commit": commit, **item})
        for entry in git("ls-tree", "-r", "-z", commit).split(b"\0"):
            if not entry:
                continue
            header, name = entry.split(b"\t", 1)
            _, kind, sha = header.decode().split()
            if kind != "blob":
                continue
            relative = name.decode("utf-8", errors="replace")
            record = blobs.setdefault(sha, {"paths": set(), "commits": set()})
            record["paths"].add(relative)
            record["commits"].add(commit)
            if SENSITIVE_NAME.search(relative):
                findings.append({"scope": "history", "commit": commit, "path": relative,
                                 "kind": "sensitive_filename", "value": "[REDACTED]"})
    for sha, record in blobs.items():
        size = int(git("cat-file", "-s", sha))
        context = {"scope": "history", "blob": sha,
                   "paths": sorted(record["paths"]), "commits": sorted(record["commits"])}
        if size > MAX_BYTES:
            skipped.append({**context, "reason": "size_limit", "bytes": size})
            continue
        data = git("cat-file", "blob", sha)
        if b"\0" in data:
            skipped.append({**context, "reason": "binary_manual_review", "bytes": size})
            continue
        findings.extend({**context, **item} for item in scan(data))
    current = sorted(set(name.decode("utf-8", errors="replace") for name in
                         git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split(b"\0") if name))
    examined = 0
    for relative in current:
        candidate = (ROOT / relative).resolve()
        if candidate == output:
            continue
        if not candidate.is_relative_to(ROOT):
            skipped.append({"scope": "working_tree", "path": relative, "reason": "outside_root"})
            continue
        if not candidate.is_file():
            continue
        examined += 1
        if SENSITIVE_NAME.search(relative):
            findings.append({"scope": "working_tree", "path": relative,
                             "kind": "sensitive_filename", "value": "[REDACTED]"})
        size = candidate.stat().st_size
        if size > MAX_BYTES:
            skipped.append({"scope": "working_tree", "path": relative, "reason": "size_limit", "bytes": size})
            continue
        data = candidate.read_bytes()
        if b"\0" in data:
            skipped.append({"scope": "working_tree", "path": relative, "reason": "binary_manual_review", "bytes": size})
            continue
        findings.extend({"scope": "working_tree", "path": relative, **item} for item in scan(data))
    counts = dict(collections.Counter(item["kind"] for item in findings))
    secrets = sum(count for kind, count in counts.items() if kind not in PRIVATE_TYPES)
    report = {
        "scannedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "head": git("rev-parse", "HEAD").decode().strip(),
        "branch": git("branch", "--show-current").decode().strip(),
        "reachableCommits": len(commits), "uniqueHistoricalBlobs": len(blobs),
        "workingTreeFilesExamined": examined, "maximumTextBlobBytes": MAX_BYTES,
        "secretPatternCandidates": secrets, "countsByKind": counts,
        "limitations": ["Pattern matching is not a guarantee that no secret exists.",
                        "Only reachable local refs and tracked/nonignored current files were scanned.",
                        "Ignored build/dependency files, remote-only refs, reflogs, unreachable objects and other repositories were not read.",
                        "Binary contents require manual/visual review; OCR was not performed.",
                        "Findings contain locations and redacted values only; occurrences may repeat across history/current scope."],
        "findings": findings, "skipped": skipped,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("head", "reachableCommits", "uniqueHistoricalBlobs", "workingTreeFilesExamined", "secretPatternCandidates", "countsByKind")}))
    print("Redacted report: " + str(output.relative_to(ROOT)))


if __name__ == "__main__":
    main()
