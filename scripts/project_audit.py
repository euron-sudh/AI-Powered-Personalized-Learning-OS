#!/usr/bin/env python3
"""
LearnOS Project Audit Script
Validates markdown links, file structure, and project consistency.
Can be run manually or via git pre-commit hook.

Usage:
    python scripts/project_audit.py --quick      # Quick validation
    python scripts/project_audit.py --full       # Full audit with report
    python scripts/project_audit.py --help       # Show options
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
import subprocess
import socket


class Colors:
    """ANSI color codes for terminal output"""
    GREEN  = '\033[92m'
    YELLOW = '\033[93m'
    RED    = '\033[91m'
    BLUE   = '\033[94m'
    CYAN   = '\033[96m'
    RESET  = '\033[0m'
    BOLD   = '\033[1m'
    DIM    = '\033[2m'


class ProjectAudit:
    """Main audit class for LearnOS project"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.findings = {
            "links":     {"valid": [], "broken": []},
            "files":     {"checked": [], "missing": []},
            "structure": {"valid": [], "issues": []},
        }
        self.errors   = []
        self.warnings = []

    # ── Output helpers ────────────────────────────────────────────────────────

    def print_header(self, text: str):
        """Section banner"""
        print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")
        print(f"{Colors.BLUE}{Colors.BOLD}  {text}{Colors.RESET}")
        print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}\n")

    def print_check(self, text: str):
        """Announce what is about to be checked — shown before the result"""
        print(f"{Colors.CYAN}{Colors.DIM}  >> Checking \"{text}\" ...{Colors.RESET}")

    def print_success(self, text: str):
        print(f"{Colors.GREEN}     [OK]    {text}{Colors.RESET}")

    def print_warning(self, text: str):
        print(f"{Colors.YELLOW}     [WARN]  {text}{Colors.RESET}")
        self.warnings.append(text)

    def print_error(self, text: str):
        print(f"{Colors.RED}     [ERROR] {text}{Colors.RESET}")
        self.errors.append(text)

    # ── Check 1 : Root folder ─────────────────────────────────────────────────

    def check_root_files(self) -> bool:
        self.print_header("CHECK 1 — ROOT FOLDER CLEANLINESS")

        root_files    = [f for f in self.project_root.iterdir()
                         if f.is_file() and not f.name.startswith('.')]
        essential     = {'README.md', 'GETTING_STARTED.md', 'docker-compose.yml'}

        self.print_check("root folder has no more than 5 non-hidden files")
        print(f"{Colors.DIM}     Found {len(root_files)} root file(s){Colors.RESET}")

        for f in root_files:
            if f.name in essential:
                self.print_success(f'"{f.name}" — essential file present')
            else:
                self.print_warning(f'"{f.name}" — non-essential, consider moving to a sub-folder')

        if len(root_files) > 5:
            self.print_error(f"Too many root files: {len(root_files)} (keep ≤ 5)")
            return False

        self.print_success(f"Root folder is clean ({len(root_files)} files)")
        return True

    # ── Check 2 : Folder structure ────────────────────────────────────────────

    def check_folder_structure(self) -> bool:
        self.print_header("CHECK 2 — REQUIRED FOLDER STRUCTURE")

        required_dirs = {
            'backend':  'Backend Python API',
            'frontend': 'Frontend Next.js app',
            'docs':     'Documentation',
            'scripts':  'Automation scripts',
        }

        all_exist = True
        for dir_name, description in required_dirs.items():
            self.print_check(f'folder "{dir_name}/" exists ({description})')
            dir_path = self.project_root / dir_name
            if dir_path.is_dir():
                self.print_success(f'"{dir_name}/" found — {description}')
            else:
                self.print_error(f'"{dir_name}/" MISSING — {description}')
                all_exist = False

        return all_exist

    # ── Check 3 : Environment configuration ──────────────────────────────────

    def check_environment_config(self) -> bool:
        self.print_header("CHECK 3 — ENVIRONMENT CONFIGURATION")
        success = True

        # --- backend/.env ---
        backend_env = self.project_root / 'backend' / '.env'
        self.print_check('backend/.env file exists')
        if not backend_env.exists():
            self.print_error('"backend/.env" not found — create it from backend/.env.example')
            return False
        self.print_success('"backend/.env" exists')

        try:
            content = backend_env.read_text(encoding='utf-8')

            self.print_check('backend/.env — CORS_ORIGINS includes port 3001 (Next.js dev port)')
            if 'CORS_ORIGINS' not in content:
                self.print_error('"CORS_ORIGINS" key missing from backend/.env')
                success = False
            elif 'localhost:3001' not in content:
                self.print_error('"CORS_ORIGINS" does not include localhost:3001 — frontend requests will be blocked')
                success = False
            else:
                self.print_success('"CORS_ORIGINS" includes localhost:3001')

            self.print_check('backend/.env — API_PORT is set to 8000')
            if 'API_PORT=8000' in content:
                self.print_success('"API_PORT=8000" is set')
            else:
                self.print_error('"API_PORT" is not 8000 — frontend proxy expects port 8000')
                success = False

            self.print_check('backend/.env — Supabase credentials present (SUPABASE_URL + SUPABASE_JWT_SECRET)')
            if 'SUPABASE_URL' in content and 'SUPABASE_JWT_SECRET' in content:
                self.print_success('"SUPABASE_URL" and "SUPABASE_JWT_SECRET" are set')
            else:
                self.print_error('"SUPABASE_URL" or "SUPABASE_JWT_SECRET" missing — auth will fail')
                success = False

        except Exception as e:
            self.print_error(f'Could not read backend/.env: {e}')
            success = False

        # --- frontend/.env.local ---
        frontend_env = self.project_root / 'frontend' / '.env.local'
        self.print_check('frontend/.env.local file exists')
        if not frontend_env.exists():
            self.print_error('"frontend/.env.local" not found — copy from frontend/.env.example')
            return False
        self.print_success('"frontend/.env.local" exists')

        try:
            content = frontend_env.read_text(encoding='utf-8')

            self.print_check('frontend/.env.local — BACKEND_URL points to localhost:8000 (proxy target)')
            if 'BACKEND_URL=http://localhost:8000' in content:
                self.print_success('"BACKEND_URL=http://localhost:8000" is correct')
            else:
                self.print_error('"BACKEND_URL" is not http://localhost:8000 — proxy will send requests to wrong host')
                success = False

            self.print_check('frontend/.env.local — Supabase public config present (NEXT_PUBLIC_SUPABASE_URL)')
            if 'NEXT_PUBLIC_SUPABASE_URL' in content:
                self.print_success('"NEXT_PUBLIC_SUPABASE_URL" is set')
            else:
                self.print_error('"NEXT_PUBLIC_SUPABASE_URL" missing — Supabase auth will not initialise')
                success = False

        except Exception as e:
            self.print_error(f'Could not read frontend/.env.local: {e}')
            success = False

        return success

    # ── Check 4 : Critical source files ──────────────────────────────────────

    def check_critical_files(self) -> bool:
        self.print_header("CHECK 4 — CRITICAL SOURCE FILES")

        critical_files = {
            'backend/app/main.py':                              'Backend entry point',
            'backend/app/core/security.py':                     'JWT verification',
            'backend/app/dependencies.py':                      'Auth middleware',
            'backend/app/routers/onboarding.py':                'Onboarding endpoint',
            'frontend/src/app/page.tsx':                        'Frontend entry point',
            'frontend/src/app/(auth)/login/page.tsx':           'Login page',
            'frontend/src/app/api/proxy/[...path]/route.ts':    'API proxy',
        }

        success = True
        for file_path, description in critical_files.items():
            self.print_check(f'"{file_path}" exists and is non-empty ({description})')
            full_path = self.project_root / file_path
            if full_path.exists():
                size = full_path.stat().st_size
                if size > 0:
                    self.print_success(f'"{file_path}" — {size:,} bytes  ({description})')
                else:
                    self.print_error(f'"{file_path}" exists but is EMPTY')
                    success = False
            else:
                self.print_error(f'"{file_path}" NOT FOUND  ({description})')
                success = False

        return success

    # ── Check 5 : Database migrations ────────────────────────────────────────

    def check_database_migrations(self) -> bool:
        self.print_header("CHECK 5 — DATABASE MIGRATIONS (Alembic)")

        migrations_dir = self.project_root / 'backend' / 'alembic' / 'versions'

        self.print_check('alembic/versions/ directory exists')
        if not migrations_dir.exists():
            self.print_error('"backend/alembic/versions/" not found — run: alembic upgrade head')
            return False
        self.print_success('"backend/alembic/versions/" exists')

        self.print_check('at least one migration file (.py) is present')
        migration_files = sorted(migrations_dir.glob('*.py'))
        if not migration_files:
            self.print_error('No migration files found in alembic/versions/')
            return False

        self.print_success(f'{len(migration_files)} migration file(s) found')
        for mig in migration_files:
            print(f"{Colors.DIM}       - {mig.name}{Colors.RESET}")

        return True

    # ── Check 6 : Frontend score bugs ────────────────────────────────────────

    def check_frontend_score_bugs(self) -> bool:
        self.print_header("CHECK 6 — FRONTEND DATA BUGS")
        success = True

        # --- double-multiplication of average_mastery ---
        analytics_file = self.project_root / 'frontend' / 'src' / 'app' / 'analytics' / 'page.tsx'
        self.print_check('"analytics/page.tsx" — average_mastery is NOT multiplied by 100 (already 0-100)')
        if analytics_file.exists():
            content = analytics_file.read_text(encoding='utf-8')
            if 'average_mastery * 100' in content:
                self.print_error(
                    '"average_mastery * 100" detected — backend returns 0-100, '
                    'multiplying by 100 again gives 4900%+ values'
                )
                success = False
            else:
                self.print_success('"average_mastery" used without extra * 100 multiplication')
        else:
            self.print_warning('"analytics/page.tsx" not found — skipping check')

        # --- double-multiplication of topic score ---
        self.print_check('"analytics/page.tsx" — topic mastery score is NOT multiplied by 100')
        if analytics_file.exists():
            if 't.score * 100' in content:
                self.print_error(
                    '"t.score * 100" detected — mastery_snapshot scores are 0-100, '
                    'not 0-1 decimals'
                )
                success = False
            else:
                self.print_success('"t.score" used without extra * 100 multiplication')

        # --- hardcoded demo-learner in learning-os.ts ---
        lo_file = self.project_root / 'frontend' / 'src' / 'lib' / 'learning-os.ts'
        self.print_check('"learning-os.ts" — no hardcoded "demo-learner" inside API request bodies')
        if lo_file.exists():
            lo_content = lo_file.read_text(encoding='utf-8')
            bad_lines = [
                ln.strip() for ln in lo_content.splitlines()
                if '"demo-learner"' in ln
                and not ln.strip().startswith('//')
                and 'export const DEFAULT_LEARNER_ID' not in ln
            ]
            if bad_lines:
                self.print_error(
                    f'{len(bad_lines)} hardcoded "demo-learner" string(s) in API calls — '
                    'use the learnerId parameter instead'
                )
                for ln in bad_lines[:3]:
                    print(f"{Colors.RED}       {ln}{Colors.RESET}")
                success = False
            else:
                self.print_success('No hardcoded "demo-learner" strings inside API request bodies')
        else:
            self.print_warning('"frontend/src/lib/learning-os.ts" not found — skipping check')

        # --- AdaptiveOSPanel uses real user ID ---
        panel_file = (self.project_root / 'frontend' / 'src' / 'app' /
                      'dashboard' / 'components' / 'AdaptiveOSPanel.tsx')
        self.print_check('"AdaptiveOSPanel.tsx" — uses useSupabaseAuth to get real user ID')
        if panel_file.exists():
            panel_content = panel_file.read_text(encoding='utf-8')
            if 'useSupabaseAuth' in panel_content:
                self.print_success('"useSupabaseAuth" imported — real user ID is passed to workspace calls')
            else:
                self.print_error(
                    '"useSupabaseAuth" not found in AdaptiveOSPanel.tsx — '
                    'all users will share the "demo-learner" workspace'
                )
                success = False
        else:
            self.print_warning('"AdaptiveOSPanel.tsx" not found — skipping check')

        return success

    # ── Check 7 : Frontend <-> Backend connectivity ───────────────────────────

    def _port_open(self, port: int) -> bool:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            result = s.connect_ex(('127.0.0.1', port))
            s.close()
            return result == 0
        except Exception:
            return False

    def check_frontend_backend_connection(self) -> bool:
        self.print_header("CHECK 7 — FRONTEND <-> BACKEND LIVE CONNECTIVITY")
        import urllib.request, urllib.error
        success = True

        # 1. Backend port
        self.print_check('backend is listening on port 8000')
        backend_up = self._port_open(8000)
        if backend_up:
            self.print_success('Port 8000 is open — FastAPI server is running')
        else:
            self.print_warning(
                'Port 8000 is NOT open — start the backend:\n'
                '       cd backend && uvicorn app.main:app --port 8000 --reload'
            )
            success = False

        # 2. Frontend port
        self.print_check('frontend dev server is listening on port 3001')
        frontend_up = self._port_open(3001)
        if frontend_up:
            self.print_success('Port 3001 is open — Next.js dev server is running')
        else:
            self.print_warning(
                'Port 3001 is NOT open — start the frontend:\n'
                '       cd frontend && npm run dev'
            )
            success = False

        # 3. Health endpoint
        if backend_up:
            self.print_check('GET http://localhost:8000/api/health returns HTTP 200')
            try:
                req = urllib.request.Request(
                    'http://127.0.0.1:8000/api/health',
                    headers={'Accept': 'application/json'},
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    body = resp.read().decode()
                    if resp.status == 200:
                        self.print_success(f'/api/health -> 200  body: {body[:80]}')
                    else:
                        self.print_error(f'/api/health returned unexpected status {resp.status}')
                        success = False
            except urllib.error.HTTPError as e:
                self.print_error(f'/api/health HTTP error {e.code}')
                success = False
            except Exception as e:
                self.print_error(f'/api/health unreachable — {type(e).__name__}: {e}')
                success = False

        # 4. CORS header
        if backend_up:
            self.print_check(
                'backend responds with "Access-Control-Allow-Origin: http://localhost:3001" '
                '(CORS for Next.js dev origin)'
            )
            try:
                req = urllib.request.Request(
                    'http://127.0.0.1:8000/api/health',
                    headers={
                        'Origin': 'http://localhost:3001',
                        'Access-Control-Request-Method': 'GET',
                    },
                    method='OPTIONS',
                )
                try:
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        allow = resp.headers.get('Access-Control-Allow-Origin', '')
                        if 'localhost:3001' in allow or allow == '*':
                            self.print_success(f'CORS header present: "{allow}"')
                        else:
                            self.print_error(
                                f'CORS header missing localhost:3001 — got: "{allow}". '
                                'Add localhost:3001 to CORS_ORIGINS in backend/.env'
                            )
                            success = False
                except urllib.error.HTTPError as e:
                    allow = e.headers.get('Access-Control-Allow-Origin', '')
                    if 'localhost:3001' in allow or allow == '*':
                        self.print_success(f'CORS header present: "{allow}"')
                    else:
                        self.print_warning(
                            f'Could not verify CORS header (HTTP {e.code}) — '
                            'check CORS_ORIGINS in backend/.env'
                        )
            except Exception as e:
                self.print_warning(f'CORS preflight check failed — {type(e).__name__}: {e}')

        # 5. Proxy route uses BACKEND_URL
        proxy_file = (self.project_root / 'frontend' / 'src' / 'app' /
                      'api' / 'proxy' / '[...path]' / 'route.ts')
        self.print_check('"proxy/route.ts" reads BACKEND_URL env var (not a hardcoded AWS host)')
        if proxy_file.exists():
            content = proxy_file.read_text(encoding='utf-8')
            if 'BACKEND_URL' in content:
                self.print_success('"BACKEND_URL" env var is used by the proxy — requests go to localhost:8000')
            else:
                self.print_error(
                    '"BACKEND_URL" not referenced in proxy/route.ts — '
                    'API calls may be going to the hardcoded AWS host'
                )
                success = False
        else:
            self.print_error('"frontend/src/app/api/proxy/[...path]/route.ts" not found')
            success = False

        return success

    # ── Check 9 : Markdown documentation sync ────────────────────────────────────

    def sync_markdown_docs(self) -> bool:
        """Auto-update markdown files to reflect current correct configuration."""
        self.print_header("CHECK 9 — MARKDOWN DOCUMENTATION SYNC")

        # Ordered list of (old_string, new_string, label) substitutions
        REPLACEMENTS = [
            ("API_PORT=9000",                "API_PORT=8000",                        "API_PORT 9000->8000"),
            ("--port 9000",                  "--port 8000",                          "uvicorn --port 9000->8000"),
            ("0.0.0.0:9000",                 "0.0.0.0:8000",                         "uvicorn output 0.0.0.0:9000->8000"),
            ("localhost:9000",               "localhost:8000",                        "localhost:9000->8000"),
            ('CORS_ORIGINS=["http://localhost:3000"]',
             'CORS_ORIGINS=["http://localhost:3001","http://localhost:3000"]',
             "CORS_ORIGINS missing 3001"),
            ("NEXT_PUBLIC_API_URL=http://localhost:9000",
             "BACKEND_URL=http://localhost:8000",
             "frontend env NEXT_PUBLIC_API_URL->BACKEND_URL"),
            ("April 16, 2026",               "April 17, 2026",                       "status date"),
        ]

        TARGET_FILES = [
            self.project_root / "README.md",
            self.project_root / "GETTING_STARTED.md",
            self.project_root / "PROJECT_STATUS.md",
        ]
        # Add all .md files from docs/ folder
        docs_dir = self.project_root / "docs"
        if docs_dir.is_dir():
            TARGET_FILES.extend(sorted(docs_dir.glob("*.md")))

        total_changes = 0
        for md_file in TARGET_FILES:
            self.print_check(f'"{md_file.name}" — checking for stale config values')
            if not md_file.exists():
                self.print_warning(f'"{md_file.name}" not found — skipping')
                continue

            try:
                content = md_file.read_text(encoding='utf-8', errors='replace')
            except Exception as e:
                self.print_error(f'Could not read "{md_file.name}": {e}')
                continue

            file_changes = []
            for old, new, label in REPLACEMENTS:
                if old in content:
                    content = content.replace(old, new)
                    file_changes.append(label)

            if file_changes:
                try:
                    md_file.write_text(content, encoding='utf-8')
                    self.print_success(
                        f'"{md_file.name}" — {len(file_changes)} fix(es): '
                        + ", ".join(file_changes)
                    )
                    total_changes += len(file_changes)
                except Exception as e:
                    self.print_error(f'Could not write "{md_file.name}": {e}')
            else:
                self.print_success(f'"{md_file.name}" — already up to date')

        if total_changes > 0:
            self.print_success(
                f'{total_changes} stale value(s) corrected across markdown documentation'
            )
        else:
            self.print_success('All markdown documentation is already up to date')

        return True

    # ── Check 9b : Markdown timestamp sync ────────────────────────────────────────

    def sync_markdown_timestamps(self) -> bool:
        """Auto-update 'Last Updated' timestamps on all markdown files."""
        from datetime import datetime

        # Current timestamp in format: YYYY-MM-DD HH:MM
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        timestamp_line = f"**Last Updated:** {now}\n\n"

        # Find all .md files (root + docs/)
        md_files = list(self.project_root.glob("*.md"))
        docs_dir = self.project_root / "docs"
        if docs_dir.is_dir():
            md_files.extend(docs_dir.glob("*.md"))

        updated_count = 0
        for md_file in sorted(md_files):
            try:
                content = md_file.read_text(encoding='utf-8', errors='replace')

                # Check if file already has timestamp
                if content.startswith("**Last Updated:**"):
                    # Update existing timestamp
                    lines = content.split('\n', 2)
                    if len(lines) >= 2 and lines[0].startswith("**Last Updated:**"):
                        new_content = timestamp_line + (lines[2] if len(lines) > 2 else "")
                        if new_content != content:
                            md_file.write_text(new_content, encoding='utf-8')
                            updated_count += 1
                else:
                    # Add timestamp at top
                    new_content = timestamp_line + content
                    md_file.write_text(new_content, encoding='utf-8')
                    updated_count += 1
            except Exception as e:
                self.print_error(f'Could not update "{md_file.name}": {e}')

        if updated_count > 0:
            self.print_success(f'Updated timestamps on {updated_count} markdown file(s) — {now}')
        else:
            self.print_success(f'All markdown timestamps are current — {now}')

        return True

    # ── Check 10 : Presentation slides <-> Changelog sync ────────────────────────

    def sync_presentation_slides(self) -> bool:
        """Inject latest CHANGELOG section into PRESENTATION_SLIDES.md when changelog is newer."""
        try:
            self.print_header("CHECK 10 — PRESENTATION SLIDES SYNC")

            changelog_file = self.project_root / "docs" / "CHANGELOG.md"
            slides_file    = self.project_root / "docs" / "PRESENTATION_SLIDES.md"

            self.print_check('"CHANGELOG.md" and "PRESENTATION_SLIDES.md" exist')
            if not changelog_file.exists():
                self.print_warning('"docs/CHANGELOG.md" not found — skipping slides sync')
                return True
            if not slides_file.exists():
                self.print_warning('"docs/PRESENTATION_SLIDES.md" not found — skipping slides sync')
                return True
            self.print_success('Both files exist')

            changelog_mtime = changelog_file.stat().st_mtime
            slides_mtime    = slides_file.stat().st_mtime

            self.print_check('"PRESENTATION_SLIDES.md" is up to date with latest CHANGELOG entry')
            if slides_mtime >= changelog_mtime:
                self.print_success('Presentation slides are current — no sync needed')
                return True

            # Extract latest section from CHANGELOG
            changelog_text = changelog_file.read_text(encoding='utf-8', errors='replace')
            lines = changelog_text.splitlines()

            section_title = ""
            section_bullets = []
            in_section = False
            for line in lines:
                if line.startswith("## ") and not in_section:
                    section_title = line.lstrip("# ").strip()[:60]  # limit length
                    in_section = True
                    continue
                if in_section:
                    if line.startswith("## "):
                        break   # next section — stop
                    stripped = line.strip()
                    if stripped.startswith("- ") or stripped.startswith("* "):
                        bullet = stripped.lstrip("-* ").strip()[:80]
                        if bullet:
                            section_bullets.append(bullet)
                    if len(section_bullets) >= 6:
                        break

            if not section_title:
                self.print_warning('Could not parse CHANGELOG section — skipping sync')
                return True

            today = datetime.now().strftime("%Y-%m-%d")
            sync_block = (
                "\n---\n\n"
                "## SLIDE — Recent Updates (Auto-synced from CHANGELOG)\n"
                f"**Headline:** Latest changes — {section_title}\n"
                "**Key updates:**\n"
            )
            for b in section_bullets:
                sync_block += f"- {b}\n"
            sync_block += f"\n*Last synced: {today}*\n"

            # Read slides, remove any previous auto-sync block, append new one
            slides_text = slides_file.read_text(encoding='utf-8', errors='replace')
            SYNC_MARKER = "## SLIDE — Recent Updates (Auto-synced from CHANGELOG)"
            if SYNC_MARKER in slides_text:
                # Find and remove the auto-synced block
                marker_idx = slides_text.find(SYNC_MARKER)
                if marker_idx > 0:
                    # Find the last separator before the marker
                    last_sep = slides_text.rfind("---", 0, marker_idx)
                    if last_sep > 0:
                        slides_text = slides_text[:last_sep].rstrip() + "\n"

            slides_text = slides_text.rstrip() + sync_block
            slides_file.write_text(slides_text, encoding='utf-8')

            self.print_success('Presentation slides synced with latest CHANGELOG')
            return True
        except Exception as e:
            self.print_error(f'Error syncing presentation slides: {type(e).__name__}')
            return False

    # ── Markdown link audit ───────────────────────────────────────────────────

    def _extract_links(self, file_path: Path) -> List[Tuple[str, str, int]]:
        links = []
        try:
            for line_num, line in enumerate(
                file_path.read_text(encoding='utf-8', errors='ignore').splitlines(), 1
            ):
                for m in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', line):
                    links.append((m.group(1), m.group(2), line_num))
        except Exception as e:
            self.print_warning(f'Could not read {file_path}: {e}')
        return links

    def _link_valid(self, url: str, file_path: Path) -> bool:
        if url.startswith('http://') or url.startswith('https://'):
            return True
        url = url.split('#')[0]
        if not url:
            return True
        return (file_path.parent / url).resolve().exists()

    def audit_markdown_links(self) -> bool:
        self.print_header("CHECK 11 — MARKDOWN LINK INTEGRITY")

        md_files = list(self.project_root.glob('*.md'))
        md_files += list(self.project_root.glob('docs/**/*.md'))

        self.print_check(f'all internal links in {len(md_files)} markdown file(s) resolve to existing files')

        total, broken = 0, 0
        for md_file in sorted(md_files):
            for text, url, line_num in self._extract_links(md_file):
                total += 1
                if self._link_valid(url, md_file):
                    self.findings["links"]["valid"].append({
                        "file": str(md_file.relative_to(self.project_root)),
                        "text": text, "url": url, "line": line_num,
                    })
                else:
                    broken += 1
                    self.findings["links"]["broken"].append({
                        "file": str(md_file.relative_to(self.project_root)),
                        "text": text, "url": url, "line": line_num,
                        "issue": f"Target not found: {url}",
                    })
                    self.print_error(
                        f'Broken link in "{md_file.name}" line {line_num}: [{text}]({url})'
                    )

        if broken == 0:
            self.print_success(f'All {total} markdown links resolve correctly')
            return True
        self.print_error(f'{broken} of {total} markdown links are broken')
        return False

    # ── Reports ───────────────────────────────────────────────────────────────

    def generate_report(self) -> Dict:
        return {
            "timestamp": self.timestamp,
            "project":   "LearnOS",
            "summary": {
                "total_errors":   len(self.errors),
                "total_warnings": len(self.warnings),
                "root_files":     len([f for f in self.project_root.iterdir()
                                       if f.is_file() and not f.name.startswith('.')]),
                "markdown_files": (len(list(self.project_root.glob('*.md'))) +
                                   len(list(self.project_root.glob('docs/**/*.md')))),
            },
            "findings": self.findings,
            "errors":   self.errors,
            "warnings": self.warnings,
        }

    def save_report(self, report: Dict):
        reports_dir = self.project_root / 'reports'
        reports_dir.mkdir(exist_ok=True)
        report_file = reports_dir / f"audit_{self.timestamp}.json"
        report_file.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f"\n{Colors.BLUE}Report saved -> {report_file.relative_to(self.project_root)}{Colors.RESET}")

    # ── Runners ───────────────────────────────────────────────────────────────

    def run_quick_audit(self) -> int:
        print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
        print(f"{Colors.BOLD}  LearnOS Project Audit{Colors.RESET}")
        print(f"{Colors.DIM}  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")
        print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")

        success = True
        success &= self.check_root_files()
        success &= self.check_folder_structure()
        success &= self.check_environment_config()
        success &= self.check_critical_files()
        success &= self.check_database_migrations()
        success &= self.check_frontend_score_bugs()
        success &= self.check_frontend_backend_connection()
        success &= self.sync_markdown_docs()
        success &= self.sync_markdown_timestamps()
        success &= self.sync_presentation_slides()
        success &= self.audit_markdown_links()

        print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
        if success:
            print(f"{Colors.GREEN}{Colors.BOLD}  ALL CHECKS PASSED{Colors.RESET}")
        else:
            if self.errors:
                print(f"{Colors.RED}{Colors.BOLD}  {len(self.errors)} ERROR(S) FOUND{Colors.RESET}")
            if self.warnings:
                print(f"{Colors.YELLOW}{Colors.BOLD}  {len(self.warnings)} WARNING(S){Colors.RESET}")
        print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")

        return 0 if success else 1

    def run_full_audit(self) -> int:
        result = self.run_quick_audit()
        if result == 0:
            report = self.generate_report()
            self.save_report(report)
            print(f"{Colors.GREEN}Full audit completed successfully.{Colors.RESET}")
        return result


def main():
    parser = argparse.ArgumentParser(
        description='LearnOS Project Audit — validates structure, env, source files, '
                    'migrations, data bugs, connectivity, syncs markdown documentation, and syncs presentation slides'
    )
    parser.add_argument('--quick', action='store_true', help='Quick validation only')
    parser.add_argument('--full',  action='store_true', help='Full audit + save JSON report')
    parser.add_argument('--exit-on-error', action='store_true',
                        help='Exit with code 1 on any error (for git pre-commit hooks)')
    args = parser.parse_args()

    if not args.quick and not args.full:
        args.quick = True

    audit = ProjectAudit()
    exit_code = audit.run_full_audit() if args.full else audit.run_quick_audit()

    if args.exit_on_error and exit_code != 0:
        sys.exit(1)

    return exit_code


if __name__ == '__main__':
    sys.exit(main())
