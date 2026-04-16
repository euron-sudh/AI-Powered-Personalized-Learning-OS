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
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class ProjectAudit:
    """Main audit class for LearnOS project"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.findings = {
            "links": {"valid": [], "broken": []},
            "files": {"checked": [], "missing": []},
            "structure": {"valid": [], "issues": []},
        }
        self.errors = []
        self.warnings = []

    def print_header(self, text: str):
        """Print colored header"""
        print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")
        print(f"{Colors.BLUE}{Colors.BOLD}{text}{Colors.RESET}")
        print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}\n")

    def print_success(self, text: str):
        """Print success message"""
        print(f"{Colors.GREEN}[OK] {text}{Colors.RESET}")

    def print_warning(self, text: str):
        """Print warning message"""
        print(f"{Colors.YELLOW}[WARN] {text}{Colors.RESET}")
        self.warnings.append(text)

    def print_error(self, text: str):
        """Print error message"""
        print(f"{Colors.RED}[ERROR] {text}{Colors.RESET}")
        self.errors.append(text)

    def check_root_files(self) -> bool:
        """Verify minimal root folder"""
        self.print_header("CHECKING ROOT FOLDER")

        root_files = [f for f in self.project_root.iterdir()
                     if f.is_file() and not f.name.startswith('.')]

        # Excluded dirs
        excluded_dirs = {'.git', '.github', '.vscode', 'backend', 'frontend',
                        'docs', 'scripts', 'node_modules', 'reports'}

        essential_files = {'README.md', 'GETTING_STARTED.md', 'docker-compose.yml'}

        print(f"Root files found: {len(root_files)}")

        for file in root_files:
            if file.name in essential_files:
                self.print_success(f"{file.name}")
            else:
                self.print_warning(f"{file.name} (non-essential)")

        if len(root_files) > 5:
            self.print_error(f"Too many root files: {len(root_files)} (should be ≤5)")
            return False
        else:
            self.print_success(f"Root folder is clean: {len(root_files)} files")
            return True

    def check_folder_structure(self) -> bool:
        """Verify critical folders exist"""
        self.print_header("CHECKING FOLDER STRUCTURE")

        required_dirs = {
            'backend': 'Backend Python API',
            'frontend': 'Frontend Next.js app',
            'docs': 'Documentation',
            'scripts': 'Automation scripts',
        }

        all_exist = True
        for dir_name, description in required_dirs.items():
            dir_path = self.project_root / dir_name
            if dir_path.is_dir():
                self.print_success(f"{dir_name}/ ({description})")
            else:
                self.print_error(f"{dir_name}/ MISSING ({description})")
                all_exist = False

        return all_exist

    def extract_markdown_links(self, file_path: Path) -> List[Tuple[str, str, int]]:
        """Extract all markdown links from a file
        Returns: [(text, url, line_number), ...]
        """
        links = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    # Match [text](url)
                    matches = re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', line)
                    for match in matches:
                        text, url = match.groups()
                        links.append((text, url, line_num))
        except Exception as e:
            self.print_warning(f"Could not read {file_path}: {e}")

        return links

    def is_valid_link(self, link_url: str, file_path: Path) -> bool:
        """Check if a link target exists"""
        # Skip external URLs
        if link_url.startswith('http://') or link_url.startswith('https://'):
            return True

        # Handle anchors
        if '#' in link_url:
            link_url = link_url.split('#')[0]

        if not link_url:  # Empty after stripping anchor
            return True

        # Relative path from file location
        target_path = (file_path.parent / link_url).resolve()

        # Check if file exists
        return target_path.exists()

    def audit_markdown_links(self) -> bool:
        """Check all markdown links in docs and root"""
        self.print_header("AUDITING MARKDOWN LINKS")

        md_files = list(self.project_root.glob('*.md'))
        md_files += list(self.project_root.glob('docs/**/*.md'))

        total_links = 0
        broken_links = 0

        for md_file in sorted(md_files):
            links = self.extract_markdown_links(md_file)

            for text, url, line_num in links:
                total_links += 1

                if self.is_valid_link(url, md_file):
                    self.findings["links"]["valid"].append({
                        "file": str(md_file.relative_to(self.project_root)),
                        "text": text,
                        "url": url,
                        "line": line_num
                    })
                else:
                    broken_links += 1
                    self.findings["links"]["broken"].append({
                        "file": str(md_file.relative_to(self.project_root)),
                        "text": text,
                        "url": url,
                        "line": line_num,
                        "issue": f"Target not found: {url}"
                    })
                    self.print_error(f"Broken link in {md_file.name}:{line_num}")
                    self.print_error(f"  [{text}]({url})")

        if broken_links == 0:
            self.print_success(f"All {total_links} markdown links are valid")
            return True
        else:
            self.print_error(f"{broken_links}/{total_links} links are broken")
            return False

    def check_environment_config(self) -> bool:
        """Verify environment variables and config files"""
        self.print_header("CHECKING ENVIRONMENT CONFIGURATION")

        success = True

        # Check backend .env
        backend_env = self.project_root / 'backend' / '.env'
        if backend_env.exists():
            self.print_success(f"backend/.env exists")
            try:
                with open(backend_env, 'r') as f:
                    content = f.read()
                    if 'CORS_ORIGINS' not in content:
                        self.print_error("backend/.env missing CORS_ORIGINS")
                        success = False
                    elif 'localhost:3001' not in content:
                        self.print_error("backend/.env CORS_ORIGINS missing port 3001")
                        success = False
                    else:
                        self.print_success("backend/.env has correct CORS_ORIGINS with port 3001")

                    if 'API_PORT=8000' in content:
                        self.print_success("backend/.env API_PORT=8000")
                    else:
                        self.print_error("backend/.env API_PORT not set to 8000")
                        success = False

                    if 'SUPABASE_URL' in content and 'SUPABASE_JWT_SECRET' in content:
                        self.print_success("backend/.env has Supabase config")
                    else:
                        self.print_error("backend/.env missing Supabase config")
                        success = False
            except Exception as e:
                self.print_error(f"Could not read backend/.env: {e}")
                success = False
        else:
            self.print_error("backend/.env not found")
            success = False

        # Check frontend .env.local
        frontend_env = self.project_root / 'frontend' / '.env.local'
        if frontend_env.exists():
            self.print_success(f"frontend/.env.local exists")
            try:
                with open(frontend_env, 'r') as f:
                    content = f.read()
                    if 'BACKEND_URL=http://localhost:8000' in content:
                        self.print_success("frontend/.env.local has correct BACKEND_URL")
                    else:
                        self.print_error("frontend/.env.local BACKEND_URL not set to localhost:8000")
                        success = False

                    if 'NEXT_PUBLIC_SUPABASE_URL' in content:
                        self.print_success("frontend/.env.local has Supabase config")
                    else:
                        self.print_error("frontend/.env.local missing Supabase config")
                        success = False
            except Exception as e:
                self.print_error(f"Could not read frontend/.env.local: {e}")
                success = False
        else:
            self.print_error("frontend/.env.local not found")
            success = False

        return success

    def check_port_availability(self, port: int) -> bool:
        """Check if a port is available or in use"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            return result == 0  # 0 means port is in use, we return True if available
        except:
            return False

    def check_critical_files(self) -> bool:
        """Verify critical source files exist and are not empty"""
        self.print_header("CHECKING CRITICAL SOURCE FILES")

        critical_files = {
            'backend/app/main.py': 'Backend entry point',
            'backend/app/core/security.py': 'JWT verification',
            'backend/app/dependencies.py': 'Auth middleware',
            'backend/app/routers/onboarding.py': 'Onboarding endpoint',
            'frontend/src/app/page.tsx': 'Frontend entry point',
            'frontend/src/app/(auth)/login/page.tsx': 'Login page',
            'frontend/src/app/api/proxy/[...path]/route.ts': 'API proxy',
        }

        success = True
        for file_path, description in critical_files.items():
            full_path = self.project_root / file_path
            if full_path.exists():
                size = full_path.stat().st_size
                if size > 0:
                    self.print_success(f"{file_path} ({description}) - {size} bytes")
                else:
                    self.print_error(f"{file_path} is empty")
                    success = False
            else:
                self.print_error(f"{file_path} not found ({description})")
                success = False

        return success

    def check_database_migrations(self) -> bool:
        """Verify Alembic migrations are in place"""
        self.print_header("CHECKING DATABASE MIGRATIONS")

        migrations_dir = self.project_root / 'backend' / 'alembic' / 'versions'
        if migrations_dir.exists():
            migration_files = list(migrations_dir.glob('*.py'))
            if migration_files:
                self.print_success(f"Found {len(migration_files)} Alembic migrations")
                for mig_file in sorted(migration_files):
                    self.print_success(f"  - {mig_file.name}")
                return True
            else:
                self.print_error("Alembic versions directory exists but no migrations found")
                return False
        else:
            self.print_error("Alembic versions directory not found")
            return False

    def generate_report(self) -> Dict:
        """Generate audit report"""
        report = {
            "timestamp": self.timestamp,
            "project": "LearnOS",
            "summary": {
                "total_errors": len(self.errors),
                "total_warnings": len(self.warnings),
                "root_files": len([f for f in self.project_root.iterdir()
                                  if f.is_file() and not f.name.startswith('.')]),
                "markdown_files": len(list(self.project_root.glob('*.md'))) + \
                                 len(list(self.project_root.glob('docs/**/*.md'))),
            },
            "findings": self.findings,
            "errors": self.errors,
            "warnings": self.warnings,
        }

        return report

    def save_report(self, report: Dict):
        """Save audit report to file"""
        reports_dir = self.project_root / 'reports'
        reports_dir.mkdir(exist_ok=True)

        report_file = reports_dir / f"audit_{self.timestamp}.json"

        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)

        print(f"\n{Colors.BLUE}Report saved: {report_file.relative_to(self.project_root)}{Colors.RESET}")

    def run_quick_audit(self) -> int:
        """Run quick validation"""
        print(f"\n{Colors.BOLD}LearnOS Project Audit - Quick Mode{Colors.RESET}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        success = True
        success &= self.check_root_files()
        success &= self.check_folder_structure()
        success &= self.check_environment_config()
        success &= self.check_critical_files()
        success &= self.check_database_migrations()
        success &= self.audit_markdown_links()

        if success:
            self.print_success("All checks passed!")
            return 0
        else:
            if self.errors:
                self.print_error(f"Found {len(self.errors)} error(s)")
            if self.warnings:
                self.print_warning(f"Found {len(self.warnings)} warning(s)")
            return 1

    def run_full_audit(self) -> int:
        """Run full audit with report"""
        result = self.run_quick_audit()

        if result == 0:
            report = self.generate_report()
            self.save_report(report)
            self.print_success("Full audit completed successfully")

        return result


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='LearnOS Project Audit - Validates links, structure, and consistency'
    )
    parser.add_argument('--quick', action='store_true', help='Quick validation only')
    parser.add_argument('--full', action='store_true', help='Full audit with report')
    parser.add_argument('--exit-on-error', action='store_true',
                       help='Exit with code 1 if any errors found (for git hooks)')

    args = parser.parse_args()

    # Default to quick mode if nothing specified
    if not args.quick and not args.full:
        args.quick = True

    # Run audit
    audit = ProjectAudit()

    if args.full:
        exit_code = audit.run_full_audit()
    else:
        exit_code = audit.run_quick_audit()

    # Exit with error if requested
    if args.exit_on_error and exit_code != 0:
        sys.exit(1)

    return exit_code


if __name__ == '__main__':
    sys.exit(main())
