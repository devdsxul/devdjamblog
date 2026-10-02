#!/usr/bin/env python3
"""Replay real hook entrypoints against local e5d63f2 in disposable repositories.

No host configuration, live state, network, or baseline script copies are retained.
The baseline commit must be locally available (never fetched by this test).
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'e5d63f2'
ENTRIES = [f'.{platform}/hooks/{hook}.py'
           for hook, platforms in (
               ('inject-subagent-context', ('claude', 'codex', 'cursor')),
               ('session-start', ('claude', 'cursor', 'codex')),
               ('inject-workflow-state', ('claude', 'codex')))
           for platform in platforms]


def isolated_env():
    # Allowlist excludes all real vendor, session, Python and git overrides.
    allowed = {'PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP',
               'SYSTEMDRIVE', 'NUMBER_OF_PROCESSORS'}
    env = {k: v for k, v in os.environ.items() if k.upper() in allowed}
    env.update(PYTHONIOENCODING='utf-8', PYTHONUTF8='1',
               PYTHONDONTWRITEBYTECODE='1', GIT_CONFIG_NOSYSTEM='1',
               GIT_CONFIG_GLOBAL=os.devnull)
    return env


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


class HookReplay(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.old = {}
        for entry in ENTRIES:
            result = subprocess.run(['git', 'show', f'{BASELINE}:{entry}'],
                                    cwd=ROOT, capture_output=True)
            if result.returncode:
                raise RuntimeError(f'Required local baseline {BASELINE}:{entry} missing')
            cls.old[entry] = result.stdout

    def test_entrypoint_replay(self):
        scenarios = ('no_task', 'planning', 'in_progress', 'invalid_json',
                     'invalid_type', 'non_target', 'disabled', 'disable_flag',
                     'skip', 'invalid_context', 'limits', 'path_boundary',
                     'argv_platform', 'env_platform', 'check_agent', 'research_agent',
                     'artifact_limits', 'total_limits', 'pointer_boundary', 'relative_entry')
        runtime = ROOT / '.runtime'
        runtime.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='trellis hook 中文 ', dir=runtime) as tmp:
            base = Path(tmp)
            repo = base / 'fixture repo'
            elsewhere = base / 'outside cwd'
            elsewhere.mkdir()
            repo.mkdir()
            (repo / '.git').mkdir()  # root detection without live git metadata
            (base / '.trellis').mkdir()  # stop any cwd-based upward lookup
            write(repo / '.trellis/.developer', 'name=fixture-developer')
            shutil.copytree(ROOT / '.trellis/scripts', repo / '.trellis/scripts',
                            ignore=shutil.ignore_patterns('__pycache__'))
            write(repo / '.trellis/workflow.md', (ROOT / '.trellis/workflow.md').read_text(encoding='utf-8'))
            write(repo / '.trellis/spec/index.md', '# 隔离规范\n')
            write(base / 'secret.txt', 'OUTSIDE_SECRET_MUST_NOT_LEAK')
            write(base / 'outside-task/prd.md', 'OUTSIDE_SECRET_MUST_NOT_LEAK')
            task_ref = '.trellis/tasks/fixture'
            task = repo / task_ref
            for name in ('prd', 'design', 'implement'):
                write(task / f'{name}.md', '# 隔离需求中文\n')
            for entry in ENTRIES:
                platform = entry.split('/')[0][1:]
                subagent = 'inject-subagent-context' in entry
                workflow = 'inject-workflow-state' in entry
                for scenario in scenarios:
                    with self.subTest(entry=entry, scenario=scenario):
                        env = isolated_env()
                        env.update(HOME=str(base), USERPROFILE=str(base),
                                   GIT_CEILING_DIRECTORIES=str(base))
                        if scenario == 'disabled':
                            env['TRELLIS_HOOKS'] = '0'
                        if scenario == 'disable_flag':
                            env['TRELLIS_DISABLE_HOOKS'] = '1'
                        if scenario == 'env_platform':
                            env[f'{platform.upper()}_PROJECT_DIR'] = str(repo)
                        payload = {'cwd': str(repo), 'session_id': 'fixture-session',
                                   'prompt': 'no-trellis' if scenario == 'skip' else '实施中文'}
                        agent = {'non_target': 'other-agent', 'check_agent': 'trellis-check',
                                 'research_agent': 'trellis-research'}.get(scenario, 'trellis-implement')
                        if platform == 'cursor' and scenario != 'argv_platform':
                            payload['cursor_version'] = 'fixture'
                        if subagent:
                            if platform == 'codex':
                                payload.update(hook_event_name='SubagentStart', agent_type=agent)
                            else:
                                payload.update(tool_name='Task', tool_input={
                                    'subagent_type': agent, 'prompt': '实施中文'})
                        stdin = json.dumps(payload, ensure_ascii=False)
                        if scenario == 'invalid_json':
                            stdin = '{'
                        if scenario == 'invalid_type':
                            stdin = '[]'
                        status = 'planning' if scenario == 'planning' else 'in_progress'
                        write(task / 'task.json', json.dumps({'id': 'fixture', 'name': 'fixture',
                              'title': '中文任务', 'status': status}, ensure_ascii=False))
                        context = {'file': 'context.txt', 'reason': '中文规范'}
                        if scenario == 'path_boundary':
                            context['file'] = '../secret.txt'
                        write(repo / 'context.txt', '有效上下文 UTF-8 中文\n' * (100 if scenario == 'limits' else 1))
                        write(task / 'prd.md', '# 隔离需求中文' * (100 if scenario == 'artifact_limits' else 1))
                        contents = '{broken\n' if scenario == 'invalid_context' else json.dumps(context) + '\n'
                        for name in ('implement', 'check', 'research'):
                            write(task / f'{name}.jsonl', contents)
                        limits = {
                            'limits': (31, 64, 128),
                            'artifact_limits': (32768, 31, 131072),
                            'total_limits': (32768, 65536, 1),
                        }.get(scenario)
                        config = '' if limits is None else chr(10).join((
                            'context_injection:',
                            '  max_file_bytes: %d' % limits[0],
                            '  max_artifact_bytes: %d' % limits[1],
                            '  max_total_bytes: %d' % limits[2], ''))
                        write(repo / '.trellis/config.yaml', config)
                        # Existing argv detection prefers an ancestor .claude directory.
                        # Relative replay separately exercises the vendor fallback.
                        session_platform = platform
                        if '.claude' in ROOT.parts and scenario != 'relative_entry':
                            if (workflow and platform == 'codex') or (
                                platform == 'cursor' and scenario == 'argv_platform'):
                                session_platform = 'claude'
                        results = []
                        for source in (self.old[entry], (ROOT / entry).read_bytes()):
                            # Reset only disposable state, preserving identical paths and stdin.
                            shutil.rmtree(repo / '.trellis/.runtime', ignore_errors=True)
                            if scenario != 'no_task':
                                write(repo / f'.trellis/.runtime/sessions/{session_platform}_fixture-session.json',
                                      json.dumps({'current_task': '../outside-task' if scenario == 'pointer_boundary' else task_ref}))
                            target = repo / entry
                            target.parent.mkdir(parents=True, exist_ok=True)
                            target.write_bytes(source)
                            result = subprocess.run([
                                sys.executable, entry if scenario == 'relative_entry' else str(target)], input=stdin,
                                cwd=repo if scenario in ('invalid_json', 'invalid_type', 'relative_entry') else elsewhere,
                                env=env, capture_output=True, text=True,
                                encoding='utf-8', errors='strict', timeout=20)
                            results.append((result.returncode, result.stdout, result.stderr))
                        self.assertEqual(results[0], results[1])
                        code, stdout, stderr = results[1]
                        self.assertEqual(code, 0)
                        if subagent and scenario == 'invalid_context':
                            self.assertIn('no curated entries', stderr)
                        else:
                            self.assertEqual(stderr, '')
                        self.assertNotIn('OUTSIDE_SECRET_MUST_NOT_LEAK', stdout)
                        # Baseline has a UTF-8 truncation bug at this artifact boundary.
                        # Preserve it here rather than changing protocol during extraction.
                        if subagent and scenario == 'artifact_limits':
                            self.assertIn(chr(0xfffd), stdout)
                        else:
                            self.assertNotIn(chr(0xfffd), stdout)
                        if scenario in ('disabled', 'disable_flag') or (workflow and scenario == 'skip'):
                            self.assertEqual(stdout, '')
                        elif scenario in ('planning', 'in_progress', 'argv_platform', 'env_platform',
                                          'relative_entry', 'check_agent', 'research_agent'):
                            self.assertTrue(stdout)
                            decoded = json.loads(stdout)
                            self.assertIsInstance(decoded, dict)
                            expected = status if workflow else (
                                'trellis-research' if subagent and scenario == 'research_agent' else '中文')
                            self.assertIn(expected, json.dumps(decoded, ensure_ascii=False))
                        if subagent and scenario in ('limits', 'artifact_limits'):
                            self.assertIn('truncated', stdout)
                        if subagent and scenario == 'total_limits':
                            self.assertIn('total context limit reached', stdout)
                        if subagent and scenario in ('non_target', 'no_task', 'pointer_boundary'):
                            self.assertEqual(stdout, '')


if __name__ == '__main__':
    unittest.main(verbosity=2)
