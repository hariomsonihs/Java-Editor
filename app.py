from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
import os
import re
import shutil
import tempfile
import logging

app = Flask(__name__, static_folder='static')
CORS(app, origins='*')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dangerous patterns to block
BLOCKED_PATTERNS = [
    r'Runtime\.getRuntime\(\)\.exec',
    r'ProcessBuilder',
    r'System\.exit',
    r'java\.io\.File.*delete',
    r'java\.nio\.file',
    r'java\.lang\.reflect',
    r'ClassLoader',
    r'Runtime\.exec',
    r'Thread\.sleep\s*\(\s*[5-9]\d{3,}',  # sleep > 5000ms
]


def is_code_safe(code):
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, code):
            return False, f'Blocked: dangerous pattern detected ({pattern})'
    return True, ''


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/compile', methods=['POST'])
def compile_java():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    code = data.get('code', '').strip()
    user_input = data.get('input', '')
    filename = data.get('filename', '')

    if not code:
        return jsonify({'success': False, 'error': 'No code provided'}), 400

    if len(code) > 50000:
        return jsonify({'success': False, 'error': 'Code too large (max 50KB)'}), 400

    # Security check
    safe, reason = is_code_safe(code)
    if not safe:
        return jsonify({'success': False, 'error': reason}), 403

    # Extract class name
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    if not class_match:
        return jsonify({'success': False, 'error': 'No public class found in code'}), 400

    class_name = class_match.group(1)

    # Validate filename matches class name
    if filename:
        expected = f'{class_name}.java'
        if filename != expected:
            return jsonify({
                'success': False,
                'error': f'Class name "{class_name}" does not match filename "{filename}". Expected: "{expected}"'
            }), 400

    temp_dir = tempfile.mkdtemp(prefix='java_')

    try:
        java_file = os.path.join(temp_dir, f'{class_name}.java')
        with open(java_file, 'w', encoding='utf-8') as f:
            f.write(code)

        # Compile
        compile_result = subprocess.run(
            ['javac', '-encoding', 'UTF-8', java_file],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=temp_dir
        )

        if compile_result.returncode != 0:
            error_msg = compile_result.stderr.replace(temp_dir + os.sep, '')
            return jsonify({'success': False, 'error': error_msg})

        # Run with security restrictions
        run_result = subprocess.run(
            [
                'java',
                '-cp', temp_dir,
                '-Xmx128m',          # max memory 128MB
                '-Xss512k',          # max stack 512KB
                class_name
            ],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=5,
            cwd=temp_dir
        )

        output = run_result.stdout
        error = run_result.stderr

        if run_result.returncode != 0 and error:
            return jsonify({'success': False, 'error': error, 'output': output})

        return jsonify({'success': True, 'output': output, 'error': error})

    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Execution timed out (5 seconds). Check for infinite loops.'})
    except FileNotFoundError:
        return jsonify({'success': False, 'error': 'Java not installed on server'}), 500
    except Exception as e:
        logger.error(f'Error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


# Serve static frontend files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
